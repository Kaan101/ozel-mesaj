import { HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../common/prisma.service";
import { RedisService } from "../common/redis.service";
import { SettingsService } from "../settings/settings.service";
import { compareSecret, hashSecret } from "../common/bcrypt.util";
import { CreatePoolEntryDto } from "./dto/create-pool-entry.dto";

@Injectable()
export class PoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly settings: SettingsService,
    private readonly jwt: JwtService
  ) {}

  // Kullanici istegi: kategori artik serbest metin - sabit liste
  // yerine, veritabaninda daha once GIRILMIS gercek degerleri (tekrar
  // etmeyen, en yeni ilk) doner. Frontend bunu bir autocomplete
  // oneri listesi olarak kullanir.
  async listDistinctCategories(): Promise<string[]> {
    const rows = await this.prisma.poolEntry.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((r) => r.category!).filter(Boolean);
  }

  // Gorev 6.1: Baslik, soru, cevap (hash'lenerek), kategori ve
  // gorunurluk ile soru kaydi olusturur (Bolum 4, 9).
  async createEntry(ownerUserId: string, dto: CreatePoolEntryDto) {
    const answerHash = await hashSecret(dto.answer);

    const entry = await this.prisma.poolEntry.create({
      data: {
        ownerUserId,
        title: dto.title,
        questionText: dto.question,
        answerHash,
        category: dto.category ?? null,
        visibility: dto.visibility,
        matchMode: dto.matchMode ?? "exact",
      },
    });

    return { poolEntryId: entry.id };
  }

  // Gorev 6.2: Kategori filtresi ve sayfalama ile PUBLIC sorulari
  // listeler. Gizli link (unlisted) sorular bu listede hic gorunmez -
  // sadece dogrudan ID ile erisilebilir (Bolum 4, "Gizli link").
  async listEntries(category: string | undefined, page: number, pageSize: number) {
    const where = {
      visibility: "public" as const,
      hiddenByOwner: false,
      ...(category ? { category } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.poolEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          questionText: true,
          category: true,
          createdAt: true,
        },
      }),
      this.prisma.poolEntry.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }

  // Gorev 12.4 icin gerekli ek: tek bir soruyu ID ile getirir (detay
  // sayfasi + OG etiketleri icin, Gorev 12.5). answerHash ASLA donmez.
  // Kullanici istegi (bug duzeltmesi): soru sahibi kendi sorusunun
  // sayfasina girdiginde ona da "cevabi gir" formu gosteriliyordu - bu
  // sacma, cunku cevabi zaten kendisi belirledi. requestingUserId
  // verilirse (kullanici giris yapmissa), sahibi olup olmadigi
  // isOwner alaninda donulur - ownerUserId'nin kendisi ASLA disari
  // sizdirilmaz (baska kimsenin bunu bilmesine gerek yok).
  async getEntryById(id: string, requestingUserId?: string) {
    const entry = await this.prisma.poolEntry.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        questionText: true,
        category: true,
        visibility: true,
        matchMode: true,
        createdAt: true,
        ownerUserId: true,
        hiddenByOwner: true,
      },
    });

    if (!entry || entry.hiddenByOwner) {
      throw new NotFoundException("Soru bulunamadi.");
    }

    const { ownerUserId, hiddenByOwner, ...publicFields } = entry;
    return { ...publicFields, isOwner: requestingUserId === ownerUserId };
  }

  // Kullanici istegi: soru sahibi istedigi zaman sorusunu kaldirabilir -
  // veri fiilen silinmez (mevcut PoolAttempt/MessageThread referanslari
  // bozulmasin diye), sadece gizlenir. Bu noktadan sonra hem herkese
  // acik listede/detayda hem "Mesajlarim"da gorunmez olur.
  async deleteEntryForOwner(entryId: string, ownerUserId: string): Promise<void> {
    const entry = await this.prisma.poolEntry.findUnique({
      where: { id: entryId },
      select: { ownerUserId: true },
    });

    if (!entry || entry.ownerUserId !== ownerUserId) {
      throw new NotFoundException("Soru bulunamadi.");
    }

    await this.prisma.poolEntry.update({
      where: { id: entryId },
      data: { hiddenByOwner: true },
    });
  }

  // Kullanici istegi: kendi sorumun sayfasina girdigimde, gelen HER
  // yaniti (bekleyen/kabul edilmis/reddedilmis fark etmeksizin) ayri
  // birer "iletisim" olarak gormek istiyorum - devam edip etmemeye
  // ben karar veririm.
  async getAllAttemptsForOwner(entryId: string, ownerUserId: string) {
    const entry = await this.prisma.poolEntry.findUnique({
      where: { id: entryId },
      select: { ownerUserId: true },
    });

    if (!entry || entry.ownerUserId !== ownerUserId) {
      throw new NotFoundException("Soru bulunamadi.");
    }

    const attempts = await this.prisma.poolAttempt.findMany({
      where: { poolEntryId: entryId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        answerText: true,
        status: true,
        threadId: true,
        createdAt: true,
        attempter: { select: { avatarId: true } },
      },
    });

    return attempts.map((a) => ({
      id: a.id,
      answerText: a.answerText,
      status: a.status,
      threadId: a.threadId,
      createdAt: a.createdAt,
      attempterAvatarId: a.attempter.avatarId,
    }));
  }

  // Kullanici istegi: havuza biraktigim sorular, ayri bir menu yerine
  // dogrudan "Mesajlarim" listesinde ("Gonderdiklerim" altinda) gorunur -
  // "Havuz Sorusu" etiketiyle. Review modundaki sorular icin bekleyen
  // yanitlar da burada gomulu olarak donulur (ayri bir sayfaya gerek
  // kalmadan kabul/reddedilebilsin diye).
  async listMyPoolEntries(ownerUserId: string) {
    const entries = await this.prisma.poolEntry.findMany({
      where: { ownerUserId, hiddenByOwner: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        questionText: true,
        matchMode: true,
        attemptCount: true,
        createdAt: true,
        attempts: {
          where: { status: "pending" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            answerText: true,
            createdAt: true,
            attempter: { select: { avatarId: true } },
          },
        },
      },
    });

    return entries.map((e) => ({
      id: e.id,
      title: e.title,
      questionText: e.questionText,
      matchMode: e.matchMode,
      attemptCount: e.attemptCount,
      createdAt: e.createdAt,
      pendingAttempts: e.attempts.map((a) => ({
        id: a.id,
        answerText: a.answerText,
        createdAt: a.createdAt,
        attempterAvatarId: a.attempter.avatarId,
      })),
    }));
  }

  private attemptRateLimitKey(poolEntryId: string): string {
    return `pool-attempt-rl:${poolEntryId}`;
  }

  // Gorev 6.3 + 6.4: Cevap denemesi + dakikalik rate limit (brute-force
  // onleme, Bolum 10). Dogru cevap -> soru sahibiyle anlik bir thread
  // olusturulur (origin_type='pool') ve deneyen kisiye hem threadId hem
  // de (unlock'a gerek kalmadan) bir thread_access_token doner - cunku
  // dogru cevabi zaten kanitlamis oldu (Bolum 4, Adim 3).
  async attemptEntry(poolEntryId: string, attemptingUserId: string, answer: string) {
    const limit = await this.settings.getNumber("POOL_ATTEMPT_RATE_LIMIT_PER_MINUTE");
    const attemptCount = await this.redis.incr(this.attemptRateLimitKey(poolEntryId), 60);
    if (attemptCount > limit) {
      throw new HttpException(
        "Bu soruya cok fazla deneme yapildi. Lutfen bir dakika sonra tekrar deneyin.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const entry = await this.prisma.poolEntry.findUnique({
      where: { id: poolEntryId },
    });

    if (!entry || entry.hiddenByOwner) {
      throw new NotFoundException("Soru bulunamadi.");
    }

    // Kullanici istegi (bug duzeltmesi): soru sahibi kendi sorusuna
    // cevap DENEYEMEZ - bu mantiksiz olurdu (kendi belirledigi cevabi
    // zaten biliyor). Frontend zaten bu formu sahibine gostermiyor,
    // ama API'yi dogrudan cagiran biri icin de guvenlik onlemi.
    if (entry.ownerUserId === attemptingUserId) {
      throw new HttpException(
        "Kendi olusturdugun soruya cevap veremezsin.",
        HttpStatus.FORBIDDEN
      );
    }

    // Kalici deneme sayaci (veritabaninda) - istatistik/izleme amacli.
    await this.prisma.poolEntry.update({
      where: { id: poolEntryId },
      data: { attemptCount: { increment: 1 } },
    });

    // Kullanici istegi: "Tum Yanitlari Goster" modunda dogru/yanlis
    // ayrimi yapmadan HER yanit soru sahibine incelemek uzere dusuyor -
    // hicbir thread otomatik olusmuyor, sahip kabul/reddedene kadar.
    if (entry.matchMode === "review") {
      const attempt = await this.prisma.poolAttempt.create({
        data: {
          poolEntryId,
          attempterUserId: attemptingUserId,
          answerText: answer,
        },
      });
      return { success: null, pending: true, attemptId: attempt.id };
    }

    const isMatch = await compareSecret(answer, entry.answerHash);
    if (!isMatch) {
      return { success: false };
    }

    const thread = await this.prisma.messageThread.create({
      data: {
        originType: "pool",
        initiatorUserId: entry.ownerUserId,
        recipientUserId: attemptingUserId,
        lockType: "question",
        lockSecretHash: entry.answerHash,
        questionText: entry.questionText,
      },
    });

    // Havuzda dogru cevabi veren kisi de bu thread'i "actigini" kalici
    // olarak kanitlamis sayilir - ileride /mesaj/[id] uzerinden tekrar
    // ziyaret ettiginde cevap sorulmaz (tutarlilik, Bolum 8 UX).
    await this.prisma.threadUnlock.upsert({
      where: { threadId_userId: { threadId: thread.id, userId: attemptingUserId } },
      update: {},
      create: { threadId: thread.id, userId: attemptingUserId },
    });

    const threadAccessToken = await this.jwt.signAsync(
      { threadId: thread.id },
      {
        secret: process.env.JWT_THREAD_ACCESS_SECRET,
        expiresIn: process.env.JWT_THREAD_ACCESS_EXPIRES_IN ?? "10m",
      }
    );

    return { success: true, threadId: thread.id, threadAccessToken };
  }

  // Kullanici istegi: "Tum Yanitlari Goster" modundaki sorularimda
  // bekleyen (henuz kabul/reddedilmemis) yanitlari listeler - baglam
  // icin soru basligi ve yanit veren kisinin avatari da dahil edilir
  // (kimligi degil - Bolum 8 gizlilik modeli).
  async listPendingAttemptsForOwner(ownerUserId: string) {
    const attempts = await this.prisma.poolAttempt.findMany({
      where: {
        status: "pending",
        poolEntry: { ownerUserId },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        answerText: true,
        createdAt: true,
        attempterUserId: true,
        attempter: { select: { avatarId: true } },
        poolEntry: { select: { id: true, title: true, questionText: true } },
      },
    });

    return attempts.map((a) => ({
      id: a.id,
      answerText: a.answerText,
      createdAt: a.createdAt,
      attempterAvatarId: a.attempter.avatarId,
      poolEntryId: a.poolEntry.id,
      poolEntryTitle: a.poolEntry.title,
      poolEntryQuestion: a.poolEntry.questionText,
    }));
  }

  // Kullanici istegi: sahip bir yaniti kabul ederse, o yanit veren
  // kisiyle AYRI bir mesaj kutusu (thread) acilir - baska bir kisinin
  // yaniti farkli bir thread'de kalir, birbirine karismaz.
  async acceptAttempt(attemptId: string, ownerUserId: string) {
    const attempt = await this.prisma.poolAttempt.findUnique({
      where: { id: attemptId },
      include: { poolEntry: true },
    });

    if (!attempt || attempt.poolEntry.ownerUserId !== ownerUserId) {
      throw new NotFoundException("Yanit bulunamadi.");
    }

    if (attempt.status !== "pending") {
      throw new HttpException("Bu yanit zaten degerlendirilmis.", HttpStatus.CONFLICT);
    }

    // lockType "none" - sahip zaten bilerek kabul etti, alici (yanit
    // veren) tekrar bir sey girmeden dogrudan erisebilir.
    // Kullanici istegi: kabul edilen cevap, thread'in ILK mesaji olarak
    // kaydedilir - ve liste basligi icin answerTextDisplay'e sabitlenir
    // (sonraki mesajlar bu basligi degistirmez).
    const thread = await this.prisma.messageThread.create({
      data: {
        originType: "pool",
        initiatorUserId: ownerUserId,
        recipientUserId: attempt.attempterUserId,
        lockType: "none",
        questionText: attempt.poolEntry.questionText,
        answerTextDisplay: attempt.answerText,
        messages: {
          create: [
            {
              senderUserId: attempt.attempterUserId,
              body: attempt.answerText,
              isAnonymous: false,
            },
          ],
        },
      },
    });

    await this.prisma.poolAttempt.update({
      where: { id: attemptId },
      data: { status: "accepted", threadId: thread.id },
    });

    return { threadId: thread.id };
  }

  async rejectAttempt(attemptId: string, ownerUserId: string): Promise<void> {
    const attempt = await this.prisma.poolAttempt.findUnique({
      where: { id: attemptId },
      include: { poolEntry: true },
    });

    if (!attempt || attempt.poolEntry.ownerUserId !== ownerUserId) {
      throw new NotFoundException("Yanit bulunamadi.");
    }

    if (attempt.status !== "pending") {
      throw new HttpException("Bu yanit zaten degerlendirilmis.", HttpStatus.CONFLICT);
    }

    await this.prisma.poolAttempt.update({
      where: { id: attemptId },
      data: { status: "rejected" },
    });
  }
}
