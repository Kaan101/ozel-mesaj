import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../common/prisma.service";
import { RedisService } from "../common/redis.service";
import { SmsService } from "../sms/sms.service";
import { SafetyService } from "../safety/safety.service";
import { SettingsService } from "../settings/settings.service";
import { hashPhoneNumber } from "../common/hash.util";
import { compareSecret, hashSecret } from "../common/bcrypt.util";
import { CreateThreadDto } from "./dto/create-thread.dto";

@Injectable()
export class ThreadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sms: SmsService,
    private readonly safety: SafetyService,
    private readonly settings: SettingsService,
    private readonly jwt: JwtService
  ) {}

  // Gorev 5.1: Alici telefonu + mesaj + kilit tipi alir, thread ve ilk
  // mesaji olusturur, aliciya bildirim SMS'i gonderir (Bolum 3, 9).
  async createThread(initiatorUserId: string, dto: CreateThreadDto) {
    const recipientPhoneHash = hashPhoneNumber(dto.recipientPhone);

    // Alici henuz sisteme hic girmemis olabilir - "numarasiz kimlik"
    // modeline uygun olarak onceden bir kullanici kaydi olusturuyoruz
    // (Bolum 8). Alici kendi OTP'siyle giris yaptiginda ayni kayda
    // (ayni phone_number_hash) baglanacak.
    const recipient = await this.prisma.user.upsert({
      where: { phoneNumberHash: recipientPhoneHash },
      update: {},
      create: { phoneNumberHash: recipientPhoneHash, status: "active" },
    });

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
        messages: {
          create: [
            {
              senderUserId: initiatorUserId,
              body: dto.body,
              isAnonymous: dto.isAnonymous,
            },
          ],
        },
      },
    });

    // Aliciya bildirim SMS'i - OTP kodu degil, sadece "sana mesaj var" bilgisi.
    const appUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const text = `Sana ozel bir mesaj var. Gormek icin: ${appUrl}/mesaj/${thread.id}`;
    await this.sms.send(dto.recipientPhone, text);

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
  async getThreadMeta(threadId: string) {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        originType: true,
        lockType: true,
        questionText: true,
        createdAt: true,
      },
    });

    if (!thread) {
      throw new NotFoundException("Thread bulunamadi.");
    }

    return thread;
  }

  // Kullanicinin (initiator veya recipient olarak) dahil oldugu tum
  // thread'leri listeler - "Mesajlarim" sayfasi icin gerekli. Hicbir
  // sir donmez, sadece guvenli metadata (Bolum 8, 10).
  async listMyThreads(userId: string) {
    const threads = await this.prisma.messageThread.findMany({
      where: {
        OR: [{ initiatorUserId: userId }, { recipientUserId: userId }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        originType: true,
        lockType: true,
        questionText: true,
        createdAt: true,
        initiatorUserId: true,
      },
    });

    return threads.map((t) => ({
      id: t.id,
      originType: t.originType,
      lockType: t.lockType,
      questionText: t.questionText,
      createdAt: t.createdAt,
      role: t.initiatorUserId === userId ? "initiator" : "recipient",
    }));
  }

  // Gorev 5.4 + 5.6: Thread'e ait mesajlari listeler ve okunmamis
  // olanlarin read_at alanini isaretler (destroy_after_read job'inin
  // "ne zaman okundu" bilgisine ihtiyaci var). is_anonymous alanina
  // gore filtreleme BACKEND seviyesinde yapilir - anonim mesajlarda
  // senderUserId response'a hic eklenmez (Bolum 8, "Anonimlik Modeli").
  async getMessages(threadId: string) {
    const messages = await this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });

    const now = new Date();
    const unreadIds = messages.filter((m) => m.readAt === null).map((m) => m.id);
    if (unreadIds.length > 0) {
      await this.prisma.message.updateMany({
        where: { id: { in: unreadIds } },
        data: { readAt: now },
      });
    }

    return messages.map((message) => ({
      id: message.id,
      body: message.body,
      isAnonymous: message.isAnonymous,
      senderUserId: message.isAnonymous ? undefined : message.senderUserId,
      readAt: message.readAt ?? now,
      createdAt: message.createdAt,
    }));
  }

  // Gorev 5.5: Yanit gonderme. Hem Katman 1 (kimin gonderdigini bilmek
  // icin, controller'da JwtAuthGuard ile saglanir) hem Katman 2 (dogru
  // thread'e erisim, ThreadAccessGuard ile saglanir) gerektirir.
  async sendMessage(threadId: string, senderUserId: string, body: string, isAnonymous: boolean) {
    const message = await this.prisma.message.create({
      data: {
        threadId,
        senderUserId,
        body,
        isAnonymous,
      },
    });

    return {
      id: message.id,
      body: message.body,
      isAnonymous: message.isAnonymous,
      createdAt: message.createdAt,
    };
  }
}
