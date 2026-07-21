import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
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
import { encryptReversible } from "../common/encryption.util";
import { formatDayMonth } from "../common/date-format.util";
import { NotificationService } from "../notifications/notification.service";
import { summarizeReactions } from "../common/reactions.util";
import { CreateThreadDto } from "./dto/create-thread.dto";

@Injectable()
export class ThreadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sms: SmsService,
    private readonly email: EmailService,
    private readonly safety: SafetyService,
    private readonly settings: SettingsService,
    private readonly auditLog: AuditLogService,
    private readonly jwt: JwtService,
    private readonly notifications: NotificationService
  ) {}

  // Gorev 5.1: Alici telefonu + mesaj + kilit tipi alir, thread ve ilk
  // mesaji olusturur, aliciya bildirim SMS'i gonderir (Bolum 3, 9).
  async createThread(initiatorUserId: string, dto: CreateThreadDto) {
    const recipientPhoneHash = hashPhoneNumber(dto.recipientPhone);

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

    // Gorev 7.2: Alici, gonderici tarafindan (initiator) daha once
    // engellendiyse yeni thread olusturulmasi reddedilir (Bolum 10).
    const isBlocked = await this.safety.isBlocked(recipient.id, initiatorUserId);
    if (isBlocked) {
      throw new ForbiddenException("Bu kullaniciya mesaj gonderemezsiniz.");
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
              isAnonymous: dto.isAnonymous,
              destroyAfterRead: dto.destroyAfterRead ?? false,
            },
          ],
        },
      },
    });

    // Aliciya bildirim SMS'i - OTP kodu degil, sadece "sana mesaj var" bilgisi.
    const appUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const text = `Sana ozel bir mesaj var. Gormek icin: ${appUrl}/mesaj/${thread.id}`;
    await this.sms.send(dto.recipientPhone, text);

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
          isAnonymous: dto.isAnonymous,
        },
      });
    }

    await this.auditLog.log({
      eventType: "thread_created",
      userId: initiatorUserId,
      threadId: thread.id,
      metadata: { lockType: dto.lockType, isAnonymous: dto.isAnonymous },
    });

    // Kullanici istegi: gonderen opsiyonel bir e-posta da eklediyse,
    // ek bir bildirim kanali olarak oraya da gonder (giris hala
    // telefon/OTP ile yapiliyor, e-posta sadece bildirim amacli).
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

    return { threadId: thread.id };
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
          where: { deletedAt: null },
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
          where: { deletedAt: null },
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
            where: { threadId: { in: threadIds }, deletedAt: null },
            orderBy: { createdAt: "asc" },
            distinct: ["threadId"],
            select: { threadId: true, body: true },
          })
        : [];
    const firstMessageByThreadId = new Map(firstMessages.map((m) => [m.threadId, m.body]));

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
        ...(hiddenAtThreshold ? { createdAt: { gt: hiddenAtThreshold } } : {}),
      },
      orderBy: { createdAt: "asc" },
      include: {
        // Avatar gercek kimlik tasimaz (sadece cizgisel bir gorsel
        // tercih) - bu yuzden anonim mesajlarda bile gosterilebilir,
        // sadece senderUserId (gercek kimlik baglantisi) gizlenir.
        sender: { select: { avatarId: true, avatarConfig: true, displayName: true } },
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
      senderUserId: message.isAnonymous || message.isSystemMessage ? undefined : message.senderUserId,
      senderAvatarId: message.sender?.avatarId ?? null,
      senderAvatarConfig: message.sender?.avatarConfig ?? null,
      // Kullanici istegi: anonim OLMAYAN mesajlarda, gonderenin
      // /ayarlar'da girdigi gorunen ad avatarin altinda gosterilir -
      // anonim mesajlarda (isAnonymous=true) hicbir zaman gonderilmez.
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
    isAnonymous: boolean,
    destroyAfterRead: boolean = false
  ) {
    // Kullanici istegi: bloke edilmis (askiya alinmis) bir kullanici
    // mevcut bir konusmada da mesaj GONDEREMEZ.
    const sender = await this.prisma.user.findUnique({ where: { id: senderUserId } });
    if (sender?.status === "suspended") {
      throw new ForbiddenException("Hesabın askıya alındığı için mesaj gönderemezsin.");
    }

    // Kullanici istegi: bir kisi, daha once bloke ettigi biriyle olan
    // bir konusmaya (ornegin /ayarlar > Bloklanmis Mesajlar'dan) YANIT
    // VERIRSE, blok otomatik olarak kalkar - artik mesajlasmaya
    // devam edebilirler.
    const threadForBlockCheck = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      select: { initiatorUserId: true, recipientUserId: true },
    });
    if (threadForBlockCheck) {
      const counterpartId =
        threadForBlockCheck.initiatorUserId === senderUserId
          ? threadForBlockCheck.recipientUserId
          : threadForBlockCheck.initiatorUserId;
      if (counterpartId) {
        await this.prisma.block
          .delete({
            where: {
              blockerUserId_blockedUserId: {
                blockerUserId: senderUserId,
                blockedUserId: counterpartId,
              },
            },
          })
          .catch(() => {}); // Blok kaydi yoksa sessizce gec.
      }
    }

    // Kullanici istegi: bir iletisimde birikebilecek maksimum mesaj
    // sayisi - asiri buyumeyi/kotuye kullanimi onlemek icin.
    const maxMessageCount = await this.settings.getNumber("THREAD_MAX_MESSAGE_COUNT");
    if (maxMessageCount > 0) {
      const currentCount = await this.prisma.message.count({ where: { threadId } });
      if (currentCount >= maxMessageCount) {
        throw new ForbiddenException(
          "Bu iletişim maksimum mesaj sayısına ulaştı, yeni mesaj gönderilemiyor."
        );
      }
    }

    const message = await this.prisma.message.create({
      data: {
        threadId,
        senderUserId,
        body,
        isAnonymous,
        destroyAfterRead,
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
    if (thread) {
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
}
