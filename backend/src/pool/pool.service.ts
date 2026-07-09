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
}
