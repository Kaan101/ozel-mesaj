import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { hashSecret } from "../common/bcrypt.util";
import { CreatePoolEntryDto } from "./dto/create-pool-entry.dto";

@Injectable()
export class PoolService {
  constructor(private readonly prisma: PrismaService) {}

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
}
