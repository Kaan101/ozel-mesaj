import { Injectable, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../common/prisma.service";
import { compareSecret, hashSecret } from "../common/bcrypt.util";
import { CreatePoolEntryDto } from "./dto/create-pool-entry.dto";

@Injectable()
export class PoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

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

  // Gorev 6.3: Cevap denemesi. Dogru cevap -> soru sahibiyle anlik
  // bir thread olusturulur (origin_type='pool') ve deneyen kisiye
  // hem threadId hem de (unlock'a gerek kalmadan) bir thread_access_token
  // doner - cunku dogru cevabi zaten kanitlamis oldu (Bolum 4, Adim 3).
  async attemptEntry(poolEntryId: string, attemptingUserId: string, answer: string) {
    const entry = await this.prisma.poolEntry.findUnique({
      where: { id: poolEntryId },
    });

    if (!entry) {
      throw new NotFoundException("Soru bulunamadi.");
    }

    // Deneme sayaci her denemede artar (basarili/basarisiz fark etmez) -
    // Gorev 6.4'te buna rate-limit kontrolu eklenecek.
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
