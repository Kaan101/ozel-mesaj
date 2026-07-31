import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, OnModuleInit, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../common/prisma.service";
import { RedisService } from "../common/redis.service";
import { SmsService } from "../sms/sms.service";
import { EmailService } from "../email/email.service";
import { SafetyService } from "../safety/safety.service";
import { SettingsService } from "../settings/settings.service";
import { AuditLogService } from "../audit/audit-log.service";
import { hashPhoneNumber } from "../common/hash.util";
import { compareSecret, hashSecret } from "../common/bcrypt.util";
import { encryptReversible, decryptReversible } from "../common/encryption.util";
import { formatDayMonth } from "../common/date-format.util";
import { NotificationService } from "../notifications/notification.service";
import { ContactsService } from "../contacts/contacts.service";
import { summarizeReactions } from "../common/reactions.util";
import { getToxicityScore, DEFAULT_TOXIC_WORDS } from "../common/toxicity.util";
import { CreateThreadDto } from "./dto/create-thread.dto";

@Injectable()
export class ThreadService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sms: SmsService,
    private readonly email: EmailService,
    private readonly safety: SafetyService,
    private readonly settings: SettingsService,
    private readonly auditLog: AuditLogService,
    private readonly jwt: JwtService,
    private readonly notifications: NotificationService,
    private readonly contacts: ContactsService
  ) {}

  // Gorev 5.1: Alici telefonu + mesaj + kilit tipi alir, thread ve ilk
  // mesaji olusturur, aliciya bildirim SMS'i gonderir (Bolum 3, 9).
  async createThread(initiatorUserId: string, dto: CreateThreadDto) {
    const recipientPhoneHash = hashPhoneNumber(dto.recipientPhone);

    // Kullanici istegi: anonimlik artik mesaj bazinda secilmiyor -
    // gonderenin /ayarlar'daki avatar/nickname gorunurluk
    // tercihlerinden TURETILIYOR. Sadece ikisi de KAPALIYSA
    // "tam anonim" sayilir (senderUserId'nin baskasina gizlenmesi
    // icin kullanilir - bkz. getMessages). dto.isAnonymous
    // verilmisse (eski istemciler icin geriye donuk uyumluluk) o
    // kullanilir.
    //
    // Kullanici istegi: ayri bir "nickname gorunsun" parametresi
    // kaldirildi - avatar KAPALIYSA hem avatar hem nickname gizlenir,
    // avatar ACIKSA nickname (varsa) otomatik gorunur. Bu yuzden
    // "tam anonim" olup olmadigi artik SADECE showAvatar'a bakar.
    const initiatorProfile = await this.prisma.user.findUnique({
      where: { id: initiatorUserId },
      select: { showAvatar: true },
    });
    const isAnonymous = dto.isAnonymous ?? !initiatorProfile?.showAvatar;

    // Alici henuz sisteme hic girmemis olabilir - "numarasiz kimlik"
    // modeline uygun olarak onceden bir kullanici kaydi olusturuyoruz
    // (Bolum 8). Alici kendi OTP'siyle giris yaptiginda ayni kayda
    // (ayni phone_number_hash) baglanacak.
    // Kullanici istegi: hukuki ispat icin, telefon numarasini AYRICA
    // (hash'e ek olarak) geri dondurulebilir sekilde sifreli kasada
    // da saklariz (Bolum: "Audit/Kasada Saklama").
    const encryptedPhone = encryptReversible(dto.recipientPhone);
    const recipient = await this.prisma.user.upsert({
      where: { phoneNumberHash: recipientPhoneHash },
      update: { phoneNumberEncrypted: encryptedPhone },
      create: {
        phoneNumberHash: recipientPhoneHash,
        phoneNumberEncrypted: encryptedPhone,
        status: "active",
      },
    });

    // Kullanici istegi: bloke edilmis (admin tarafindan askiya alinmis)
    // bir numaraya mesaj GONDERILEMEZ.
    if (recipient.status === "suspended") {
      throw new ForbiddenException("Bu numaraya mesaj gönderilemiyor.");
    }

    // Kullanici istegi: bloke edilmis bir kullanici da mesaj
    // GONDEREMEZ - giriste engellensede (AuthService.verifyOtp),
    // onceden alinmis bir access_token hala gecerli olabilir, bu
    // yuzden burada da ayrica kontrol ediyoruz.
    const initiator = await this.prisma.user.findUnique({ where: { id: initiatorUserId } });
    if (initiator?.status === "suspended") {
      throw new ForbiddenException("Hesabın askıya alındığı için mesaj gönderemezsin.");
    }

    // Kullanici istegi: yazilan mesaj toksisite skorlamasindan gecer
    // (guardrail) - sistem parametresindeki esigin USTUNDEYSE mesaj
    // HEMEN GONDERILMEZ, "pending" (inceleme bekliyor) durumuna
    // girer - admin /admin/guardrail ekranindan onaylar/iptal eder.
    // Skor esigi asarsa, alici otomatik olarak gonderen kisiyi
    // bloke eder (admin onaylarsa bu blok kaldirilir).
    const toxicityThreshold = await this.settings.getNumber("TOXIC_MESSAGE_THRESHOLD");
    const toxicWords = await this.prisma.toxicWord.findMany({ select: { word: true, score: true } });
    const toxicityScore = getToxicityScore(dto.body, toxicWords);
    const isToxic = toxicityScore >= toxicityThreshold;

    // Gorev 7.2: Alici, gonderici tarafindan (initiator) daha once
    // engellendiyse yeni thread olusturulmasi reddedilir (Bolum 10).
    const isBlocked = await this.safety.isBlocked(recipient.id, initiatorUserId);
    if (isBlocked) {
      throw new ForbiddenException("Bu kullaniciya mesaj gonderemezsiniz.");
    }

    // Kullanici istegi: alici /ayarlar'da "genel blok" (kimse mesaj
    // gonderemesin) acmişsa, HERKESE (ozel bir engelleme kaydi
    // olmasa bile) yeni mesaj engellenir.
    if (recipient.blockAllMessages) {
      throw new ForbiddenException("Bu kullanıcı şu anda kimseden mesaj kabul etmiyor.");
    }

    // "none" modunda hash'lenecek bir sir yok (kullanici geri
    // bildirimi: bilinen alici icin kilit zorunlu olmasin).
    const lockSecretHash = dto.lockType === "none" ? null : await hashSecret(dto.lockSecret!);

    const thread = await this.prisma.messageThread.create({
      data: {
        originType: "direct",
        initiatorUserId,
        recipientUserId: recipient.id,
        lockType: dto.lockType,
        lockSecretHash,
        questionText: dto.lockType === "question" ? dto.questionText : null,
        recipientPhoneDisplay: dto.recipientPhone,
        recipientNotificationEmail: dto.recipientNotificationEmail ?? null,
        messages: {
          create: [
            {
              senderUserId: initiatorUserId,
              body: dto.body,
              isAnonymous,
              destroyAfterRead: dto.destroyAfterRead ?? false,
              weatherSummary: dto.weatherSummary ?? null,
              moderationStatus: isToxic ? "pending" : "approved",
              toxicityScore,
            },
          ],
        },
      },
    });

    // Kullanici istegi: gonderdigim her numara otomatik rehbere
    // kaydedilir (zaten varsa dokunulmaz - toksik/pending durumdan
    // bagimsiz, gonderim GIRISIMI yeterli).
    await this.contacts.upsertContactFromOutgoingMessage(initiatorUserId, dto.recipientPhone);

    // Aliciya bildirim SMS'i icin metin - "none"/toksik durumlarinda
    // bile hesaplaniyor cunku appUrl asagida email/push icin de
    // kullaniliyor.
    const appUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const text = `Sana ozel bir mesaj var. Gormek icin: ${appUrl}/mesaj/${thread.id}`;

    if (isToxic) {
      // Kullanici istegi: toksik bulunursa sistem, aliciyi gonderenin
      // otomatik olarak bloklamis hali yapar (admin onaylarsa kalkar).
      await this.prisma.block
        .upsert({
          where: {
            blockerUserId_blockedUserId: {
              blockerUserId: recipient.id,
              blockedUserId: initiatorUserId,
            },
          },
          update: {},
          create: { blockerUserId: recipient.id, blockedUserId: initiatorUserId },
        })
        .catch(() => {});

      // Kullanici istegi: her bloke islemi loglanir (konulma/kaldirilma
      // tarihleriyle) - /admin/gunlukler ekraninda "block_created" ile
      // filtrelenebilir.
      await this.auditLog.log({
        eventType: "block_created",
        userId: recipient.id,
        threadId: thread.id,
        metadata: {
          blockedUserId: initiatorUserId,
          reason: "toxic_message_detected",
          toxicityScore,
        },
      });
    } else {
      // Aliciya bildirim SMS'i - OTP kodu degil, sadece "sana mesaj var" bilgisi.
      // Kullanici istegi: mesaj "pending" (henuz gorunmuyor) ise bu
      // bildirim GONDERILMEZ - yanlis beklenti yaratmasin.
      await this.sms.send(dto.recipientPhone, text);
    }

    // Kullanici istegi: hukuki ispat icin, mesajin SIFRELI bir kopyasi
    // ayri bir arsiv tablosuna yaziliyor - "okunduktan sonra sil"
    // (destroy_after_read) ile silinse bile bu kopya kalir.
    const firstMessage = await this.prisma.message.findFirst({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
    });
    if (firstMessage) {
      await this.prisma.messageAudit.create({
        data: {
          originalMessageId: firstMessage.id,
          threadId: thread.id,
          senderUserId: initiatorUserId,
          bodyEncrypted: encryptReversible(dto.body),
          isAnonymous,
        },
      });
    }

    await this.auditLog.log({
      eventType: "thread_created",
      userId: initiatorUserId,
      threadId: thread.id,
      metadata: { lockType: dto.lockType, isAnonymous },
    });

    // Kullanici istegi: gonderen opsiyonel bir e-posta da eklediyse,
    // ek bir bildirim kanali olarak oraya da gonder (giris hala
    // telefon/OTP ile yapiliyor, e-posta sadece bildirim amacli).
    // Kullanici istegi: mesaj "pending" (henuz gorunmuyor) ise HICBIR
    // bildirim kanali (e-posta/push) tetiklenmez.
    if (!isToxic) {
      if (dto.recipientNotificationEmail) {
        await this.email.send(
          dto.recipientNotificationEmail,
          "Sana özel bir mesaj var",
          `Sana özel bir mesaj var. Görmek için: ${appUrl}/mesaj/${thread.id}`
        );
      }

      // Kullanici istegi: alıcıya push bildirimi - icerik BILEREK genel
      // tutulur, mesaj metni bildirimde gorunmez.
      this.notifications
        .notifyUser(
          recipient.id,
          "Sana bir mesaj var",
          "YouHaveMi üzerinden sana özel bir mesaj gönderildi.",
          `/mesaj/${thread.id}`
        )
        .catch(() => {});
    }

    return { threadId: thread.id, pendingModeration: isToxic };
  }

  private threadAttemptsKey(threadId: string): string {
    return `thread-attempts:${threadId}`;
  }

  // Gorev 5.2 + 5.7: Katman 2 (Authorization) - "dogru kisi olmak" yetmez,
  // "dogru bilgiyi bilmek" de gerekir (Bolum 8). Ayrica brute-force
  // korumasi: 5 yanlis denemeden sonra thread 15 dakika kilitlenir
  // (Bolum 8, 10). Deneme sayaci Redis'te TTL'li tutulur.
  async unlockThread(
    threadId: string,
    secret: string,
    userId: string
  ): Promise<{ threadAccessToken: string }> {
    const maxAttempts = await this.settings.getNumber("THREAD_UNLOCK_MAX_ATTEMPTS");
    const lockoutSeconds = 15 * 60;

    const attemptsKey = this.threadAttemptsKey(threadId);
    const currentAttempts = Number((await this.redis.get(attemptsKey)) ?? 0);

    if (currentAttempts >= maxAttempts) {
      throw new HttpException(
        "Cok fazla yanlis deneme yapildi. Bu thread 15 dakika kilitlendi.",
        423 // Locked
      );
    }

    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException("Thread bulunamadi.");
    }

    // Savunma kontrolu: lockType "none" olan bir thread icin unlock
    // cagirilmasi normalde beklenmez (frontend dogrudan erisir), ama
    // yine de gecerli bir token uretip devam edelim.
    if (thread.lockType === "none" || !thread.lockSecretHash) {
      await this.redis.del(attemptsKey);
      const threadAccessToken = await this.jwt.signAsync(
        { threadId: thread.id },
        {
          secret: process.env.JWT_THREAD_ACCESS_SECRET,
          expiresIn: process.env.JWT_THREAD_ACCESS_EXPIRES_IN ?? "10m",
        }
      );
      return { threadAccessToken };
    }

    const isMatch = await compareSecret(secret, thread.lockSecretHash);
    if (!isMatch) {
      await this.redis.incr(attemptsKey, lockoutSeconds);
      await this.auditLog.log({
        eventType: "thread_unlock_failed",
        userId,
        threadId,
      });
      throw new UnauthorizedException("Parola/cevap hatali.");
    }

    // Basarili giris - deneme sayacini sifirla.
    await this.redis.del(attemptsKey);

    // Kullanici geri bildirimi: bu kullanici bu thread'i bir kez dogru
    // bilgiyle actigini kalici olarak kaydediyoruz - boylece bir daha
    // (cikis yapsa/tarayici kapatsa bile) tekrar parola sorulmayacak
    // (asagida ThreadAccessOrOwnerGuard bu kaydi kontrol ediyor).
    await this.prisma.threadUnlock.upsert({
      where: { threadId_userId: { threadId, userId } },
      update: {},
      create: { threadId, userId },
    });

    await this.auditLog.log({
      eventType: "thread_unlocked",
      userId,
      threadId,
    });

    const threadAccessToken = await this.jwt.signAsync(
      { threadId: thread.id },
      {
        secret: process.env.JWT_THREAD_ACCESS_SECRET,
        expiresIn: process.env.JWT_THREAD_ACCESS_EXPIRES_IN ?? "10m",
      }
    );

    return { threadAccessToken };
  }

  // Gorev 11.5 icin gerekli kucuk ek: alicinin "parola mi soru mu, soru
  // ise ne soruluyor" bilgisini gormesi lazim (unlock denemeden once).
  // Hicbir sir (lockSecretHash) dis dunyaya donmez - sadece guvenli
  // metadata (Bolum 3, Adim 3).
  // Gorev 11.5 icin gerekli ek: alici, unlock denemeden once kilit
  // tipini (parola/soru) ve soru metnini gormeli. Sadece Katman 1
  // yeterli - hicbir sir donmuyor.
  //
  // Kullanici istegi: mesaj detay sayfasindaki baslik, Mesajlarim
  // listesindeki AYNI zengin baslikla (SORU - CEVAP + tarih) eslessin.
  // Guvenlik duzeltmesi: bu zengin baslik SADECE thread'in gercek
  // katilimcisina (initiator/recipient) donulur - baskasi bu endpoint'i
  // cagirirsa (JwtAuthGuard tek basina katilimci oldugunu garantilemez)
  // sadece minimal/guvenli alanlari gorur.
  async getThreadMeta(threadId: string, requestingUserId?: string) {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        originType: true,
        lockType: true,
        questionText: true,
        answerTextDisplay: true,
        createdAt: true,
        initiatorUserId: true,
        recipientUserId: true,
        recipientRevealedAt: true,
        messages: {
          where: { deletedAt: null, moderationStatus: "approved" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { body: true },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException("Thread bulunamadi.");
    }

    const isParticipant =
      requestingUserId === thread.initiatorUserId || requestingUserId === thread.recipientUserId;

    if (!isParticipant) {
      // Katilimci degilse (beklenmeyen durum) - hicbir icerik/baslik
      // sizdirilmaz, sadece guvenli minimal alanlar.
      return {
        id: thread.id,
        originType: thread.originType,
        lockType: thread.lockType,
        questionText: thread.questionText,
        createdAt: thread.createdAt,
        displayTitle: null,
        needsReveal: false,
      };
    }

    const role = requestingUserId === thread.initiatorUserId ? "initiator" : "recipient";

    // Kullanici istegi: alici, bu iletisimi ILK KEZ aciyorsa (henuz
    // "Mesaji Goster"e basmadiysa) mesaj icerigi HICBIR YERDE
    // (baslik dahil) gosterilmez - once mesaji gormeden Engelle/
    // Sikayet Et secenegi sunulur.
    const hasRevealed = role === "initiator" || !!thread.recipientRevealedAt;
    const needsReveal = role === "recipient" && !thread.recipientRevealedAt;
    const canShowBody = (thread.lockType === "none" || role === "initiator") && hasRevealed;

    let displayTitle: string | null = canShowBody ? (thread.messages[0]?.body ?? null) : null;
    if (thread.originType === "pool" && thread.questionText && thread.answerTextDisplay) {
      displayTitle =
        role === "initiator"
          ? `${thread.questionText} - ${thread.answerTextDisplay}`
          : hasRevealed
            ? thread.questionText
            : null;
    }
    if (displayTitle) {
      displayTitle = `${displayTitle} - ${formatDayMonth(thread.createdAt)}`;
    }

    return {
      id: thread.id,
      originType: thread.originType,
      lockType: thread.lockType,
      questionText: thread.questionText,
      createdAt: thread.createdAt,
      displayTitle,
      needsReveal,
    };
  }

  // Kullanicinin (initiator veya recipient olarak) dahil oldugu tum
  // thread'leri listeler - "Mesajlarim" sayfasi icin gerekli. Hicbir
  // sir donmez, sadece guvenli metadata (Bolum 8, 10).
  async listMyThreads(userId: string) {
    // Kullanici istegi: bloke ettigim kisilerle olan konusmalar bu
    // listede GORUNMEZ - onlar /ayarlar > Bloklanan Mesajlar'da.
    // Blok kaldirilinca buraya geri doner.
    const myBlocks = await this.prisma.block.findMany({
      where: { blockerUserId: userId },
      select: { blockedUserId: true },
    });
    const blockedUserIds = new Set(myBlocks.map((b) => b.blockedUserId));

    const threads = await this.prisma.messageThread.findMany({
      where: {
        OR: [{ initiatorUserId: userId }, { recipientUserId: userId }],
        // Not: "silinmis" thread'leri burada kesin olarak filtrelemiyoruz
        // artik - bunun yerine asagida, lastMessageAt ile hiddenAt zaman
        // damgasini karsilastirarak karar veriyoruz (kullanici istegi:
        // silindikten SONRA yeni mesaj gelirse iletisim geri acilsin).
      },
      select: {
        id: true,
        originType: true,
        lockType: true,
        questionText: true,
        recipientPhoneDisplay: true,
        answerTextDisplay: true,
        createdAt: true,
        initiatorUserId: true,
        recipientUserId: true,
        hiddenByInitiatorAt: true,
        hiddenByRecipientAt: true,
        recipientRevealedAt: true,
        // Kullanici geri bildirimi: karsi tarafin avatari listede de
        // gorunsun - avatar gercek kimlik tasimadigi icin sakincasiz.
        initiator: { select: { avatarId: true, avatarConfig: true } },
        recipient: { select: { avatarId: true, avatarConfig: true } },
        // Bug duzeltmesi: listede EN SON mesaj gosterilmeli, ilk mesaj
        // degil - aksi halde yeni gelen yanitlar listeye hic yansimaz
        // (kullanici geri bildirimi).
        messages: {
          where: { deletedAt: null, moderationStatus: "approved" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, createdAt: true },
        },
      },
    });

    // Kullanici istegi: dogrudan mesajlarda da baslik ILK mesaja
    // sabitlenir - yeni mesajlar geldikce basligi DEGISTIRMEZ (havuz
    // eslesmelerindeki "sabit baslik" mantigiyla tutarli). Prisma'nin
    // "distinct" ozelligi, orderBy ile birlikte her thread icin TEK
    // sorguda "ilk" satiri getirmemizi sagliyor.
    const threadIds = threads.map((t) => t.id);
    const firstMessages =
      threadIds.length > 0
        ? await this.prisma.message.findMany({
            where: { threadId: { in: threadIds }, deletedAt: null, moderationStatus: "approved" },
            orderBy: { createdAt: "asc" },
            distinct: ["threadId"],
            select: { threadId: true, body: true },
          })
        : [];
    const firstMessageByThreadId = new Map<string, string>(
      firstMessages.map((m): [string, string] => [m.threadId, m.body])
    );

    // Kullanici istegi: BEN gonderen (initiator) isem ve karsi taraf
    // (recipient) beni bloke ettiyse, iletisim kutusunda telefon
    // numarasinin yaninda kirmizi bir nokta gosterilir. Tum thread'ler
    // icin TEK sorguda kontrol ediyoruz (N+1 sorgudan kacinmak icin).
    const counterpartIdsWhereIAmInitiator = threads
      .filter((t) => t.initiatorUserId === userId && t.recipientUserId)
      .map((t) => t.recipientUserId as string);
    const blocksAgainstMe =
      counterpartIdsWhereIAmInitiator.length > 0
        ? await this.prisma.block.findMany({
            where: {
              blockedUserId: userId,
              blockerUserId: { in: counterpartIdsWhereIAmInitiator },
            },
            select: { blockerUserId: true },
          })
        : [];
    const blockedByUserIdSet = new Set(blocksAgainstMe.map((b) => b.blockerUserId));

    const mapped = threads
      .map((t) => {
        const role = t.initiatorUserId === userId ? "initiator" : "recipient";
        const lastMessageAt = t.messages[0]?.createdAt ?? t.createdAt;

        // Kullanici istegi (bug duzeltmesi): kullanici bu thread'i
        // sildiyse (hiddenAt dolu), ama SONRASINDA yeni bir mesaj
        // geldiyse (lastMessageAt > hiddenAt), thread otomatik olarak
        // listeye GERI DONER - kalici silme degil.
        const hiddenAt = role === "initiator" ? t.hiddenByInitiatorAt : t.hiddenByRecipientAt;
        const isHidden = hiddenAt !== null && lastMessageAt.getTime() <= hiddenAt.getTime();
        if (isHidden) return null;

        // Kullanici istegi: bloke ettigim kisilerle olan konusmalar bu
        // listede gorunmez - engeli kaldirinca geri doner.
        const counterpartId = role === "initiator" ? t.recipientUserId : t.initiatorUserId;
        if (counterpartId && blockedUserIds.has(counterpartId)) return null;

        // Guvenlik: mesaj govdesini (body) listede sadece (a) kilitsiz
        // (lockType="none") thread'lerde, ya da (b) mesaji YAZAN kisi
        // (initiator) icin gosteriyoruz. Alici, parola korumali bir
        // mesajin icerigini kilidi acmadan gormemeli (Bolum 8 guvenlik
        // modeli). Soru metni ise hassas degil (sadece bir ipucu,
        // cevabin kendisi degil) - bu yuzden herkese gosterilir.
        //
        // Kullanici istegi: alici bu iletisimi HENUZ ILK KEZ
        // "gostermeyi" onaylamadiysa (recipientRevealedAt bos), liste
        // basligi da icerik SIZDIRMAMALI.
        const hasRevealed = role === "initiator" || !!t.recipientRevealedAt;
        const canShowBody = (t.lockType === "none" || role === "initiator") && hasRevealed;
        const counterpartAvatarId =
          role === "initiator" ? t.recipient?.avatarId : t.initiator.avatarId;
        // Kullanici istegi: zengin ozellestirilebilir avatar (DiceBear)
        // - doluysa avatarId'den ONCELIKLIDIR (bkz. frontend AvatarDisplay).
        const counterpartAvatarConfig =
          role === "initiator" ? t.recipient?.avatarConfig : t.initiator.avatarConfig;

        // Kullanici istegi: havuz eslesmelerinde (originType='pool')
        // liste basligi SABIT olmali - soru sahibine "Soru - Cevap",
        // yanit verene sadece "Soru" - sonraki mesajlasmalar bu basligi
        // DEGISTIRMEZ (latest-message mantigi burada gecerli degil).
        let displayTitle: string | null = canShowBody
          ? (firstMessageByThreadId.get(t.id) ?? null)
          : null;
        if (t.originType === "pool" && t.questionText && t.answerTextDisplay) {
          displayTitle =
            role === "initiator"
              ? `${t.questionText} - ${t.answerTextDisplay}`
              : hasRevealed
                ? t.questionText
                : null;
        }

        // Kullanici istegi: basliga "(07 Temmuz)" formatinda sabit bir
        // tarih ekleniyor - bu iletisimin ne zaman basladigini gosterir,
        // sonraki mesajlardan etkilenmez.
        if (displayTitle) {
          displayTitle = `${displayTitle} - ${formatDayMonth(t.createdAt)}`;
        }

        return {
          id: t.id,
          originType: t.originType,
          lockType: t.lockType,
          questionText: t.questionText,
          firstMessageBody: displayTitle,
          // Numara sadece gonderenin KENDISINE geri gosterilir - alici
          // veya baska hic kimseye asla donmez (Bolum 8, 10).
          recipientPhoneDisplay: role === "initiator" ? t.recipientPhoneDisplay : null,
          counterpartAvatarId,
          counterpartAvatarConfig,
          createdAt: t.createdAt,
          lastMessageAt,
          role,
          needsReveal: role === "recipient" && !t.recipientRevealedAt,
          // Kullanici istegi: BEN gonderen isem ve karsi taraf beni
          // bloke ettiyse, telefon numarasinin yaninda kirmizi nokta.
          blockedByCounterpart:
            role === "initiator" && !!t.recipientUserId && blockedByUserIdSet.has(t.recipientUserId),
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    // Son aktiviteye gore sirala (en son yaniti gelen en ustte) -
    // sadece olusturulma tarihine gore siralamak, yeni yanit gelen
    // eski bir konusmanin listede "asagida kalmasina" sebep oluyordu.
    return mapped.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  // Kullanici geri bildirimi: "mesaj silme" - gercekte veri silinmez,
  // sadece istegi yapan kullanicinin KENDI listesinden gizlenir. Karsi
  // tarafin gorunumu etkilenmez.
  async hideThreadForUser(threadId: string, userId: string): Promise<void> {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      select: { initiatorUserId: true, recipientUserId: true },
    });

    if (!thread) {
      throw new NotFoundException("Thread bulunamadi.");
    }

    if (thread.initiatorUserId === userId) {
      await this.prisma.messageThread.update({
        where: { id: threadId },
        data: { hiddenByInitiatorAt: new Date() },
      });
      return;
    }

    if (thread.recipientUserId === userId) {
      await this.prisma.messageThread.update({
        where: { id: threadId },
        data: { hiddenByRecipientAt: new Date() },
      });
      return;
    }

    throw new UnauthorizedException("Bu thread senin degil.");
  }

  // Gorev 5.4 + 5.6: Thread'e ait mesajlari listeler ve okunmamis
  // olanlarin read_at alanini isaretler (destroy_after_read job'inin
  // "ne zaman okundu" bilgisine ihtiyaci var). is_anonymous alanina
  // gore filtreleme BACKEND seviyesinde yapilir - anonim mesajlarda
  // senderUserId response'a hic eklenmez (Bolum 8, "Anonimlik Modeli").
  // Kullanici istegi (bug duzeltmesi): kullanici bu thread'i daha once
  // sildiyse (hiddenAt), o kullaniciya SADECE o zamandan SONRAKI
  // mesajlar gosterilir - eski mesajlar onun icin "silinmis" kalir.
  // Karsi taraf icin bu filtre gecerli degildir (kendi silmediyse tum
  // gecmisi gormeye devam eder).
  async getMessages(threadId: string, requestingUserId?: string) {
    let hiddenAtThreshold: Date | null = null;
    if (requestingUserId) {
      const thread = await this.prisma.messageThread.findUnique({
        where: { id: threadId },
        select: {
          initiatorUserId: true,
          recipientUserId: true,
          hiddenByInitiatorAt: true,
          hiddenByRecipientAt: true,
          recipientRevealedAt: true,
        },
      });
      if (thread) {
        if (thread.initiatorUserId === requestingUserId) {
          hiddenAtThreshold = thread.hiddenByInitiatorAt;
        } else if (thread.recipientUserId === requestingUserId) {
          hiddenAtThreshold = thread.hiddenByRecipientAt;
          // Kullanici istegi (guvenlik - savunma katmani): alici bu
          // iletisimi HENUZ ILK KEZ "gostermeyi" onaylamadiysa,
          // mesajlar API seviyesinde de BOS donulur - sadece
          // frontend'in bu cagriyi gec yapmasina guvenilmez.
          if (!thread.recipientRevealedAt) {
            return [];
          }
        }
      }
    }

    const messages = await this.prisma.message.findMany({
      where: {
        threadId,
        // Kullanici istegi: gonderen tarafindan silinmis mesajlar
        // konusma gorunumunde gozukmez (arsiv/log kaydi etkilenmez).
        deletedAt: null,
        // Kullanici istegi (Guardrail): toksisite nedeniyle "pending"
        // (inceleme bekliyor) mesajlar KARSI TARAFA hic gorunmez -
        // ama GONDEREN KENDI mesajini (kirmizi cerceveyle, "inceleniyor"
        // olarak) gorebilir. "rejected" (iptal edilmis) hic kimseye
        // gorunmez.
        OR: [
          { moderationStatus: "approved" },
          ...(requestingUserId
            ? [{ moderationStatus: "pending", senderUserId: requestingUserId }]
            : []),
        ],
        ...(hiddenAtThreshold ? { createdAt: { gt: hiddenAtThreshold } } : {}),
      },
      orderBy: { createdAt: "asc" },
      include: {
        // Avatar gercek kimlik tasimaz (sadece cizgisel bir gorsel
        // tercih) - bu yuzden anonim mesajlarda bile gosterilebilir,
        // sadece senderUserId (gercek kimlik baglantisi) gizlenir.
        // Not: gorunurluk artik message.isAnonymous (gonderim anina
        // DONMUS deger) ile belirlendigi icin sender.showAvatar
        // buradan CANLI okunmuyor.
        sender: {
          select: {
            avatarId: true,
            avatarConfig: true,
            displayName: true,
          },
        },
        reactions: { select: { emoji: true, userId: true } },
      },
    });

    const now = new Date();
    // Kullanici istegi (bug duzeltmesi): "okunduktan sonra sil"
    // sayaci SADECE karsi taraf (alici) mesaji actiginda baslamali.
    // Onceden, GONDERENIN KENDI mesajini goruntulemesi bile "okundu"
    // sayiliyordu - bu, mesajin gonderenin kendi ekraninda bile
    // erkenden silinmesine sebep olabiliyordu. Kimlik biliniyorsa
    // (requestingUserId), sadece BASKASININ gonderdigi mesajlar
    // "okundu" olarak isaretlenir.
    const unreadIds = messages
      .filter((m) => m.readAt === null && (!requestingUserId || m.senderUserId !== requestingUserId))
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      await this.prisma.message.updateMany({
        where: { id: { in: unreadIds } },
        data: { readAt: now },
      });
    }

    const unreadIdSet = new Set(unreadIds);

    return messages.map((message) => ({
      id: message.id,
      body: message.body,
      isAnonymous: message.isAnonymous,
      isSystemMessage: message.isSystemMessage,
      // Kullanici istegi: guardrail'e takilip "pending" durumunda
      // olan kendi mesajini gonderen kirmizi cerceveyle gorebilsin.
      moderationStatus: message.moderationStatus,
      senderUserId: message.isAnonymous || message.isSystemMessage ? undefined : message.senderUserId,
      // Kullanici istegi (DUZELTME): avatar/nickname gorunurlugu artik
      // CANLI degil, mesaj GONDERILDIGI ANDAKI durumda DONAR
      // (message.isAnonymous - o an showAvatar neyse odur). Kullanici
      // /ayarlar'da tercihini SONRADAN degistirirse, bu SADECE
      // o andan SONRA gonderilecek mesajlara uygulanir - gecmis
      // mesajlar etkilenmez.
      senderAvatarId:
        message.isAnonymous || message.isSystemMessage ? null : (message.sender?.avatarId ?? null),
      senderAvatarConfig:
        message.isAnonymous || message.isSystemMessage
          ? null
          : (message.sender?.avatarConfig ?? null),
      weatherSummary: message.weatherSummary ?? null,
      senderDisplayName:
        message.isAnonymous || message.isSystemMessage
          ? null
          : (message.sender?.displayName ?? null),
      // Bug duzeltmesi: sadece bu istekte GERCEKTEN "okundu" olarak
      // isaretlenen mesajlar icin "now" gosterilir - gonderenin kendi
      // mesajini goruntulemesi durumunda (readAt DB'de hala null),
      // yanlislikla "okunmus" gibi gosterilmemeli.
      readAt: unreadIdSet.has(message.id) ? now : message.readAt,
      createdAt: message.createdAt,
      // Kullanici istegi: begen/begenme/emoji tepkileri - her emoji
      // icin sayi + bu kullanicinin kendi tepkisi (varsa) donulur.
      reactions: summarizeReactions(message.reactions, requestingUserId),
      // Kullanici istegi: "silinecek" mesajlar konusma ekraninda daha
      // soluk gosterilsin diye frontend'e bu bilgi de gonderilir.
      destroyAfterRead: message.destroyAfterRead,
    }));
  }

  // Gorev 5.5: Yanit gonderme. Hem Katman 1 (kimin gonderdigini bilmek
  // icin, controller'da JwtAuthGuard ile saglanir) hem Katman 2 (dogru
  // thread'e erisim, ThreadAccessGuard ile saglanir) gerektirir.
  async sendMessage(
    threadId: string,
    senderUserId: string,
    body: string,
    isAnonymousInput: boolean | undefined,
    destroyAfterRead: boolean = false,
    weatherSummary?: string
  ) {
    // Kullanici istegi: bloke edilmis (askiya alinmis) bir kullanici
    // mevcut bir konusmada da mesaj GONDEREMEZ.
    const sender = await this.prisma.user.findUnique({ where: { id: senderUserId } });
    if (sender?.status === "suspended") {
      throw new ForbiddenException("Hesabın askıya alındığı için mesaj gönderemezsin.");
    }

    // Kullanici istegi: yazilan mesaj toksisite skorlamasindan gecer
    // (guardrail) - sistem parametresindeki esigin USTUNDEYSE mesaj
    // HEMEN GORUNMEZ, "pending" durumuna girer - admin
    // /admin/guardrail ekranindan onaylar/iptal eder. Toksik
    // bulunursa karsi taraf otomatik olarak gonderen kisiyi bloke eder.
    const toxicityThreshold = await this.settings.getNumber("TOXIC_MESSAGE_THRESHOLD");
    const toxicWords = await this.prisma.toxicWord.findMany({ select: { word: true, score: true } });
    const toxicityScore = getToxicityScore(body, toxicWords);
    const isToxic = toxicityScore >= toxicityThreshold;
    // TESHIS (gecici): "Sorun Yok" sonrasi ayni seviyedeki toksik
    // mesajlarin tekrar yakalanmama sorununu arastirmak icin.
    console.log(
      `[TESHIS sendMessage-toxicity] threadId=${threadId} senderUserId=${senderUserId} bodyLength=${body.length} toxicWordCount=${toxicWords.length} score=${toxicityScore} threshold=${toxicityThreshold} isToxic=${isToxic}`
    );

    // Kullanici istegi: anonimlik artik mesaj bazinda secilmiyor -
    // gonderenin /ayarlar'daki avatar gorunurluk tercihinden
    // TURETILIYOR (ayri bir nickname parametresi yok - avatar
    // kapaliysa hem avatar hem nickname gizlenir).
    const isAnonymous = isAnonymousInput ?? !sender?.showAvatar;

    // Kullanici istegi: bir kisi, daha once bloke ettigi biriyle olan
    // bir konusmaya (ornegin /ayarlar > Bloklanmis Mesajlar'dan) YANIT
    // VERIRSE, blok otomatik olarak kalkar - artik mesajlasmaya
    // devam edebilirler.
    const threadForBlockCheck = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      select: { initiatorUserId: true, recipientUserId: true, recipientPhoneDisplay: true },
    });
    if (threadForBlockCheck) {
      const counterpartId =
        threadForBlockCheck.initiatorUserId === senderUserId
          ? threadForBlockCheck.recipientUserId
          : threadForBlockCheck.initiatorUserId;
      if (counterpartId) {
        // Kullanici istegi: karsi taraf (BEN, bu sendMessage'i cagiran
        // gonderen kisi) yanit verirse, alicinin (counterpartId)
        // rehberinde GORUNEN avatar/nickname bilgisi (hangisi varsa,
        // anonimse hicbiri) guncellenir.
        if (sender?.phoneNumberEncrypted) {
          const senderPhone = decryptReversible(sender.phoneNumberEncrypted);
          this.contacts
            .updateContactFromReply(counterpartId, senderPhone, {
              avatarId: isAnonymous ? null : (sender.avatarId ?? null),
              avatarConfig: isAnonymous ? null : sender.avatarConfig,
              displayName: isAnonymous ? null : (sender.displayName ?? null),
            })
            .catch(() => {});
        }

        // Kullanici istegi (guvenlik duzeltmesi): karsi taraf BENI
        // (gonderen) bloke ettiyse, mesaj gonderemem - bu kontrol
        // eksikti, sadece createThread'de vardi, mevcut bir konusmada
        // (sendMessage) hic yoktu.
        const counterpartBlockedMe = await this.safety.isBlocked(counterpartId, senderUserId);
        if (counterpartBlockedMe) {
          throw new ForbiddenException(
            "Bu kişi seni engellediği için mesaj gönderemezsin."
          );
        }

        // Kullanici istegi: karsi taraf /ayarlar'da "genel blok"
        // acmişsa, mevcut bir konusmada bile mesaj gonderilemez.
        const counterpart = await this.prisma.user.findUnique({
          where: { id: counterpartId },
          select: { blockAllMessages: true },
        });
        if (counterpart?.blockAllMessages) {
          throw new ForbiddenException("Bu kullanıcı şu anda kimseden mesaj kabul etmiyor.");
        }

        if (isToxic) {
          // Kullanici istegi: toksik bulunursa sistem, karsi tarafi
          // gonderenin otomatik olarak bloklamis hali yapar (admin
          // onaylarsa kalkar).
          await this.prisma.block
            .upsert({
              where: {
                blockerUserId_blockedUserId: {
                  blockerUserId: counterpartId,
                  blockedUserId: senderUserId,
                },
              },
              update: {},
              create: { blockerUserId: counterpartId, blockedUserId: senderUserId },
            })
            .catch(() => {});

          // Kullanici istegi: her bloke islemi loglanir.
          await this.auditLog.log({
            eventType: "block_created",
            userId: counterpartId,
            threadId,
            metadata: {
              blockedUserId: senderUserId,
              reason: "toxic_message_detected",
              toxicityScore,
            },
          });
        } else {
          await this.prisma.block
            .delete({
              where: {
                blockerUserId_blockedUserId: {
                  blockerUserId: senderUserId,
                  blockedUserId: counterpartId,
                },
              },
            })
            .then(() => {
              // Kullanici istegi: blok kaldirilinca karsi tarafa
              // bildirim gonderilir - PUSH_NOTIFICATIONS_ENABLED
              // parametresine gore calisir (notifyUser kendi icinde
              // kontrol ediyor).
              return this.notifications.notifyUser(
                counterpartId,
                "Engel Kaldırıldı",
                "Seni engelleyen kişi artık seninle mesajlaşabilir.",
                "/mesajlarim"
              );
            })
            .catch(() => {}); // Blok kaydi yoksa (zaten bloke degilse) sessizce gec.

          // Kullanici istegi: karsi taraf (alici) yanit veriyorsa,
          // GONDERENIN (initiator'in) rehberindeki bu kisi kaydi,
          // yanit verenin GUNCEL avatar/nickname bilgisiyle (hangisi
          // GORUNUYORSA - showAvatar/displayName'e gore) guncellenir.
          if (
            threadForBlockCheck.recipientUserId === senderUserId &&
            threadForBlockCheck.recipientPhoneDisplay
          ) {
            await this.contacts
              .updateContactFromReply(counterpartId, threadForBlockCheck.recipientPhoneDisplay, {
                avatarId: sender?.showAvatar ? (sender.avatarId ?? null) : null,
                avatarConfig: sender?.showAvatar ? sender.avatarConfig : null,
                displayName: sender?.showAvatar ? (sender.displayName ?? null) : null,
              })
              .catch(() => {});
          }
        }
      }
    }

    // Kullanici istegi: bir iletisimde birikebilecek maksimum mesaj
    // sayisina ulasilinca YENI MESAJ GONDERMEYI ENGELLEMEK yerine, o
    // iletisimdeki EN ESKI mesaj (kim gonderdiyse gondersin) otomatik
    // silinir - boylece yazmaya her zaman izin verilir, sadece toplam
    // sayi asilmaz (dongusel/rolling limit). Yumusak silme (deletedAt)
    // kullanilir - arsiv/log kaydi (MessageAudit) ETKILENMEZ.
    //
    // Kullanici istegi: iletisimin ILK mesaji (Mesajlarim listesindeki
    // SABIT basligini olusturdugu icin) asla silinmez - "en eski"
    // hesaplanirken bu mesaj ATLANIR, ondan SONRAKI en eski mesaj silinir.
    const maxMessageCount = await this.settings.getNumber("THREAD_MAX_MESSAGE_COUNT");
    if (maxMessageCount > 0) {
      const currentCount = await this.prisma.message.count({
        where: { threadId, deletedAt: null },
      });
      if (currentCount >= maxMessageCount) {
        const [oldestDeletable] = await this.prisma.message.findMany({
          where: { threadId, deletedAt: null },
          orderBy: { createdAt: "asc" },
          skip: 1, // ilk mesaji (indeks 0) atla - o hic silinmez.
          take: 1,
        });
        if (oldestDeletable) {
          await this.prisma.message.update({
            where: { id: oldestDeletable.id },
            data: { deletedAt: new Date() },
          });
        }
      }
    }

    const message = await this.prisma.message.create({
      data: {
        threadId,
        senderUserId,
        body,
        isAnonymous,
        destroyAfterRead,
        weatherSummary: weatherSummary ?? null,
        moderationStatus: isToxic ? "pending" : "approved",
        toxicityScore,
      },
    });

    // Kullanici istegi: her mesajin sifreli bir arsiv kopyasi.
    await this.prisma.messageAudit.create({
      data: {
        originalMessageId: message.id,
        threadId,
        senderUserId,
        bodyEncrypted: encryptReversible(body),
        isAnonymous,
      },
    });

    await this.auditLog.log({
      eventType: "message_sent",
      userId: senderUserId,
      threadId,
    });

    // Kullanici istegi: karsi tarafa push bildirimi gonder. Bildirim
    // icerigi BILEREK genel tutulur - mesaj metni asla bildirimde
    // gorunmez (kilit ekraninda da gorunebilecegi icin gizlilik
    // acisindan hassas).
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      select: { initiatorUserId: true, recipientUserId: true },
    });
    // Kullanici istegi: mesaj "pending" (henuz gorunmuyor) ise push
    // bildirimi GONDERILMEZ - yanlis beklenti yaratmasin.
    if (thread && !isToxic) {
      const recipientUserId =
        thread.initiatorUserId === senderUserId ? thread.recipientUserId : thread.initiatorUserId;
      if (recipientUserId) {
        this.notifications
          .notifyUser(
            recipientUserId,
            "Yeni mesajın var",
            "Bir mesaja yanıt geldi.",
            `/mesaj/${threadId}`
          )
          .catch(() => {});
      }
    }

    return {
      id: message.id,
      body: message.body,
      isAnonymous: message.isAnonymous,
      createdAt: message.createdAt,
      pendingModeration: isToxic,
    };
  }

  // Kullanici istegi: alici "Mesaji Goster"e basinca cagrilir - bu
  // iletisim icin bir daha bu kapi gosterilmez. Sadece GERCEK alici
  // (recipientUserId) kendi icin bunu onaylayabilir.
  async revealThread(threadId: string, requestingUserId: string): Promise<void> {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      select: { recipientUserId: true },
    });

    if (!thread || thread.recipientUserId !== requestingUserId) {
      throw new ForbiddenException("Bu islemi sadece alici yapabilir.");
    }

    await this.prisma.messageThread.update({
      where: { id: threadId },
      data: { recipientRevealedAt: new Date() },
    });
  }

  // Kullanici istegi: gonderilen bir iletisim (thread) icindeki tek
  // bir mesaj, SADECE O MESAJI GONDEREN kisi tarafindan silinebilir -
  // karsi tarafin mesajlari ya da baskasinin mesajlari silinemez.
  // Yumusak silme (deletedAt) - MessageAudit/AuditLog kayitlari
  // ETKILENMEZ, hukuki ispat icin her zaman erisilebilir kalir.
  async deleteMessage(messageId: string, requestingUserId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderUserId: true, deletedAt: true },
    });

    if (!message) {
      throw new NotFoundException("Mesaj bulunamadi.");
    }

    if (message.senderUserId !== requestingUserId) {
      throw new ForbiddenException("Sadece kendi gonderdigin mesaji silebilirsin.");
    }

    if (message.deletedAt) {
      return; // Zaten silinmis - sessizce gec.
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }

  // Kullanici istegi: mesaja begen/begenme ya da emoji tepkisi -
  // ayni emojiye tekrar basmak tepkiyi kaldirir (toggle), farkli bir
  // emoji secmek onceki tepkiyi degistirir. Bir kullanicinin bir
  // mesaja SADECE BIR tepkisi olabilir.
  async reactToMessage(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<{ removed: boolean }> {
    const existing = await this.prisma.messageReaction.findUnique({
      where: { messageId_userId: { messageId, userId } },
    });

    if (existing && existing.emoji === emoji) {
      await this.prisma.messageReaction.delete({ where: { id: existing.id } });
      return { removed: true };
    }

    await this.prisma.messageReaction.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: { emoji },
      create: { messageId, userId, emoji },
    });
    return { removed: false };
  }

  // ============================================================
  // Kullanici istegi: Guardrail yonetim ekrani icin metotlar -
  // toksik bulunup "pending" durumuna giren mesajlari listeleme,
  // admin onayi/iptali.
  // ============================================================

  // Toksik bulunup inceleme bekleyen (pending) tum mesajlari,
  // gonderen/alici telefon numaralariyla birlikte listeler.
  async listPendingToxicMessages() {
    const messages = await this.prisma.message.findMany({
      where: { moderationStatus: "pending" },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { phoneNumberEncrypted: true, displayName: true } },
        thread: {
          select: {
            id: true,
            initiatorUserId: true,
            recipientUserId: true,
            recipient: { select: { phoneNumberEncrypted: true, displayName: true } },
            initiator: { select: { phoneNumberEncrypted: true, displayName: true } },
          },
        },
      },
    });

    return messages.map((m) => {
      const recipientIsInitiator = m.thread.initiatorUserId !== m.senderUserId;
      const recipientUser = recipientIsInitiator ? m.thread.initiator : m.thread.recipient;
      return {
        messageId: m.id,
        threadId: m.threadId,
        body: m.body,
        toxicityScore: m.toxicityScore,
        createdAt: m.createdAt,
        senderPhone: m.sender?.phoneNumberEncrypted
          ? decryptReversible(m.sender.phoneNumberEncrypted)
          : null,
        senderDisplayName: m.sender?.displayName ?? null,
        recipientPhone: recipientUser?.phoneNumberEncrypted
          ? decryptReversible(recipientUser.phoneNumberEncrypted)
          : null,
      };
    });
  }

  // Admin, toksik bulunan bir mesaji ONAYLAR: mesaj artik gorunur
  // olur, otomatik konulan blok kaldirilir.
  async approveToxicMessage(messageId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { threadId: true, senderUserId: true },
    });
    if (!message) return;

    await this.prisma.message.update({
      where: { id: messageId },
      data: { moderationStatus: "approved" },
    });

    const thread = await this.prisma.messageThread.findUnique({
      where: { id: message.threadId },
      select: { initiatorUserId: true, recipientUserId: true },
    });
    if (thread && message.senderUserId) {
      const counterpartId =
        thread.initiatorUserId === message.senderUserId
          ? thread.recipientUserId
          : thread.initiatorUserId;
      if (counterpartId) {
        await this.prisma.block
          .delete({
            where: {
              blockerUserId_blockedUserId: {
                blockerUserId: counterpartId,
                blockedUserId: message.senderUserId,
              },
            },
          })
          .then(() => {
            // Kullanici istegi: her bloke islemi loglanir (kaldirilma
            // tarihi dahil).
            return this.auditLog.log({
              eventType: "block_removed",
              userId: counterpartId,
              threadId: message.threadId,
              metadata: {
                blockedUserId: message.senderUserId,
                reason: "admin_approved_message",
                messageId,
              },
            });
          })
          .catch(() => {});

        // Kullanici istegi: "Sorun yok" (onayla) secilince, blok
        // kalktigi icin karsi tarafa bildirim gider - PUSH_NOTIFICATIONS_ENABLED
        // parametresine gore calisir.
        this.notifications
          .notifyUser(
            counterpartId,
            "Engel Kaldırıldı",
            "İncelenen bir mesaj sonucunda seni engelleyen kişi artık seninle mesajlaşabilir.",
            "/mesajlarim"
          )
          .catch(() => {});
      }
    }
  }

  // Admin, toksik bulunan bir mesaji IPTAL EDER: mesaj kalici olarak
  // gizli kalir (yumusak silinir), otomatik blok KALICI hale gelir.
  async rejectToxicMessage(messageId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderUserId: true },
    });

    await this.prisma.message.update({
      where: { id: messageId },
      data: { moderationStatus: "rejected", deletedAt: new Date() },
    });

    // Kullanici istegi: "Sorun var" secilince, mesajin sahibine
    // mesajinin uygunsuz bulundugu bildirilir - PUSH_NOTIFICATIONS_ENABLED
    // parametresine gore calisir.
    if (message?.senderUserId) {
      this.notifications
        .notifyUser(
          message.senderUserId,
          "Mesajın Uygunsuz Bulundu",
          "Gönderdiğin bir mesaj incelendi ve uygunsuz bulundu. Bu kişiyle mesajlaşman engellendi.",
          "/mesajlarim"
        )
        .catch(() => {});
    }
  }

  // ============================================================
  // Kullanici istegi: toksik kelime listesi artik veritabaninda -
  // admin ekleyebilir/guncelleyebilir/silebilir.
  // ============================================================

  async listToxicWords() {
    return this.prisma.toxicWord.findMany({ orderBy: { score: "desc" } });
  }

  // Kullanici istegi (bug duzeltmesi): "create" yerine "upsert"
  // kullanilir - ayni kelime tekrar eklenmeye calisilirsa (unique
  // kisitlamasi) sunucu hatasi FIRLATMAK yerine sessizce puanini
  // gunceller.
  async addToxicWord(word: string, score: number) {
    const trimmed = word.trim();
    return this.prisma.toxicWord.upsert({
      where: { word: trimmed },
      update: { score },
      create: { word: trimmed, score },
    });
  }

  // Kullanici istegi: bir alanda BIRDEN FAZLA kelime (virgul/satir
  // ile ayrilmis) tek seferde, AYNI puanla eklenebilsin.
  async addToxicWordsBulk(words: string[], score: number): Promise<{ count: number }> {
    const trimmed = words.map((w) => w.trim()).filter((w) => w.length > 0);
    if (trimmed.length === 0) return { count: 0 };

    await Promise.all(
      trimmed.map((word) =>
        this.prisma.toxicWord.upsert({
          where: { word },
          update: { score },
          create: { word, score },
        })
      )
    );
    return { count: trimmed.length };
  }

  async updateToxicWord(id: string, word: string, score: number) {
    return this.prisma.toxicWord.update({ where: { id }, data: { word: word.trim(), score } });
  }

  async deleteToxicWord(id: string): Promise<void> {
    await this.prisma.toxicWord.delete({ where: { id } }).catch(() => {});
  }

  // Kullanici istegi: ilk kurulumda, bos tabloyu varsayilan kelime
  // listesiyle doldurma (tekrar cagrilirsa zaten var olanlari atlar).
  async seedDefaultToxicWords(): Promise<{ inserted: number }> {
    const existing = await this.prisma.toxicWord.findMany({ select: { word: true } });
    const existingWords = new Set(existing.map((w) => w.word));
    const toInsert = DEFAULT_TOXIC_WORDS.filter((w) => !existingWords.has(w.word));
    if (toInsert.length === 0) return { inserted: 0 };

    await this.prisma.toxicWord.createMany({ data: toInsert, skipDuplicates: true });
    return { inserted: toInsert.length };
  }

  // Kullanici istegi: varsayilan kelimeler ELLE tiklamaya gerek
  // kalmadan, uygulama BASLARKEN otomatik olarak (tablo bossa) yuklenir.
  async onModuleInit(): Promise<void> {
    try {
      const count = await this.prisma.toxicWord.count();
      if (count === 0) {
        await this.seedDefaultToxicWords();
      }
    } catch {
      // Baslangicta DB henuz hazir degilse (migration calismadan once
      // vb.) sessizce gec - bir sonraki restart'ta tekrar denenir.
    }
  }
}
