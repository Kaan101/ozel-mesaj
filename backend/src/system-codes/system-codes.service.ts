import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

// Kullanici istegi: blok nedeni gibi, sistem genelinde kullanilan KOD
// tanimlari icin genel amacli bir servis - "category" alanina gore
// birden fazla kod listesi ayni tabloda tutulur.

// Ilk kurulumda (tablo bossa) tohumlanacak varsayilan "block_reason"
// kodlari - sonrasi admin tarafindan tamamen duzenlenebilir.
const DEFAULT_BLOCK_REASONS: { code: string; description: string }[] = [
  { code: "SPAM", description: "İstenmeyen / tekrarlayan mesaj (spam)" },
  { code: "TACIZ", description: "Taciz veya rahatsız edici davranış" },
  { code: "TOKSIK_ICERIK", description: "Hakaret, küfür veya toksik içerik" },
  { code: "DOLANDIRICILIK", description: "Dolandırıcılık şüphesi" },
  { code: "ISTENMEYEN_ILETISIM", description: "Karşı tarafla iletişim istenmiyor" },
  { code: "DIGER", description: "Diğer / belirtilmemiş" },
];

@Injectable()
export class SystemCodesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async listByCategory(category: string) {
    return this.prisma.systemCode.findMany({
      where: { category },
      orderBy: { code: "asc" },
    });
  }

  async add(category: string, code: string, description: string) {
    return this.prisma.systemCode.create({
      data: { category, code: code.trim().toUpperCase(), description: description.trim() },
    });
  }

  async update(id: string, description: string) {
    return this.prisma.systemCode.update({
      where: { id },
      data: { description: description.trim() },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.systemCode.delete({ where: { id } }).catch(() => {});
  }

  // Kullanici istegi: varsayilan blok nedeni kodlari ELLE tiklamaya
  // gerek kalmadan, uygulama BASLARKEN otomatik olarak (tablo bossa)
  // yuklenir.
  async onModuleInit(): Promise<void> {
    try {
      const count = await this.prisma.systemCode.count({
        where: { category: "block_reason" },
      });
      if (count === 0) {
        await this.prisma.systemCode.createMany({
          data: DEFAULT_BLOCK_REASONS.map((r) => ({ category: "block_reason", ...r })),
        });
      }
    } catch {
      // Baslangicta DB henuz hazir degilse sessizce gec.
    }
  }
}
