import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

// Kullanici istegi: blok nedeni gibi, sistem genelinde kullanilan KOD
// tanimlari icin genel amacli bir servis - "category" alanina gore
// birden fazla kod listesi ayni tabloda tutulur. Kullanici istegi:
// kodlar artik SAYISAL (1, 2, 3, ...).

// Ilk kurulumda (tablo bossa) tohumlanacak varsayilan "block_reason"
// kodlari - sonrasi admin tarafindan tamamen duzenlenebilir. DIKKAT:
// "1" kodu, asagidaki backfillReasonCodes() fonksiyonunda SISTEM
// (toksik icerik) bloklari icin TAHMINI deger olarak kullanilir -
// bu kodun anlamini degistirirsen backfill mantigini da guncelle.
const DEFAULT_BLOCK_REASONS: { code: string; description: string }[] = [
  { code: "1", description: "Toksik İçerik / Hakaret" },
  { code: "2", description: "Spam (istenmeyen / tekrarlayan mesaj)" },
  { code: "3", description: "Taciz veya rahatsız edici davranış" },
  { code: "4", description: "Dolandırıcılık şüphesi" },
  { code: "5", description: "İstenmeyen iletişim" },
  { code: "6", description: "Diğer / belirtilmemiş" },
];

const TOXIC_REASON_CODE = "1";
const DEFAULT_MANUAL_REASON_CODE = "6";

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
      data: { category, code: code.trim(), description: description.trim() },
    });
  }

  async update(id: string, code: string, description: string) {
    return this.prisma.systemCode.update({
      where: { id },
      data: { code: code.trim(), description: description.trim() },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.systemCode.delete({ where: { id } }).catch(() => {});
  }

  // Kullanici istegi: mevcut (henuz neden kodu atanmamis) blok
  // kayitlarina, blok TIPINE gore TAHMINI bir sayisal kod atanir:
  // sistem (toxic_pending/toxic_confirmed) bloklari kesin olarak
  // "Toksik Icerik" (1) ile, manuel bloklar (gercek nedeni bilinmedigi
  // icin) genel "Diger" (6) koduyla doldurulur. Admin, /admin/bloke
  // ekranindan bunlari istedigi gibi degistirebilir.
  private async backfillReasonCodes(): Promise<void> {
    await this.prisma.block.updateMany({
      where: { reasonCode: null, type: { in: ["toxic_pending", "toxic_confirmed"] } },
      data: { reasonCode: TOXIC_REASON_CODE },
    });
    await this.prisma.block.updateMany({
      where: { reasonCode: null, type: "manual" },
      data: { reasonCode: DEFAULT_MANUAL_REASON_CODE },
    });
    await this.prisma.blockLog.updateMany({
      where: { reasonCode: null, type: { in: ["toxic_pending", "toxic_confirmed"] } },
      data: { reasonCode: TOXIC_REASON_CODE },
    });
    await this.prisma.blockLog.updateMany({
      where: { reasonCode: null, type: "manual" },
      data: { reasonCode: DEFAULT_MANUAL_REASON_CODE },
    });
  }

  // Kullanici istegi: varsayilan blok nedeni kodlari VE mevcut blok
  // kayitlarinin tahmini doldurulmasi, ELLE tiklamaya gerek kalmadan,
  // uygulama BASLARKEN otomatik olarak calisir.
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
      await this.backfillReasonCodes();
    } catch {
      // Baslangicta DB henuz hazir degilse sessizce gec.
    }
  }
}
