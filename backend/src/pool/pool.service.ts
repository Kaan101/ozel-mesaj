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
  async getEntryById(id: string) {
    const entry = await this.prisma.poolEntry.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        questionText: true,
        category: true,
        visibility: true,
        createdAt: true,
      },
    });

    if (!entry) {
      throw new NotFoundException("Soru bulunamadi.");
    }

    return entry;
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

    if (!entry) {
      throw new NotFoundException("Soru bulunamadi.");
    }

    // Kalici deneme sayaci (veritabaninda) - istatistik/izleme amacli.
    await this.prisma.poolEntry.update({
      where: { id: poolEntryId },
      data: { attemptCount: { increment: 1 } },
    });

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
}
