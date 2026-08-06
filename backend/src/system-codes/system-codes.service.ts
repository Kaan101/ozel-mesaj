import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import {
  DEFAULT_BLOCK_REASONS,
  LEGACY_CODE_RENAME_MAP,
  BLOCK_REASON_CODES,
} from "./block-reason-codes.const";

// Kullanici istegi: blok nedeni gibi, sistem genelinde kullanilan KOD
// tanimlari icin genel amacli bir servis - "category" alanina gore
// birden fazla kod listesi ayni tabloda tutulur. Kullanici istegi:
// kodlar SAYISAL (1, 2, 3, ...).

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

  // Kullanici istegi: ONCEKI bir surumde metin bazli kodlar (SPAM,
  // TACIZ, vb.) tohumlanmis olabilir - bunlari SILMEK yerine, ayni
  // satiri KORUYARAK sayisal karsiligina YENIDEN ADLANDIRIR (id ayni
  // kaldigi icin mevcut Block/BlockLog referanslari BOZULMAZ,
  // sadece "code" degeri degisir).
  private async migrateLegacyTextCodes(): Promise<void> {
    for (const [oldCode, newCode] of Object.entries(LEGACY_CODE_RENAME_MAP)) {
      const existing = await this.prisma.systemCode.findUnique({
        where: { category_code: { category: "block_reason", code: oldCode } },
      });
      if (!existing) continue;
      const newAlreadyExists = await this.prisma.systemCode.findUnique({
        where: { category_code: { category: "block_reason", code: newCode } },
      });
      if (newAlreadyExists) continue; // Cakisma varsa dokunma, elle cozulur.
      await this.prisma.systemCode.update({
        where: { id: existing.id },
        data: { code: newCode },
      });
    }
  }

  // Kullanici istegi: mevcut (henuz neden kodu atanmamis) blok
  // kayitlarina, blok TIPINE gore TAHMINI bir sayisal kod atanir:
  // sistem (toxic_pending/toxic_confirmed) bloklari kesin olarak
  // "Toksik Icerik" (1) ile, manuel bloklar "Istenmeyen Iletisim" (5)
  // koduyla doldurulur (manuel blok = kisi bilerek engellemistir).
  // Admin, /admin/bloke ekranindan bunlari istedigi gibi degistirebilir.
  private async backfillReasonCodes(): Promise<void> {
    await this.prisma.block.updateMany({
      where: { reasonCode: null, type: { in: ["toxic_pending", "toxic_confirmed"] } },
      data: { reasonCode: BLOCK_REASON_CODES.TOXIC_CONTENT },
    });
    await this.prisma.block.updateMany({
      where: { reasonCode: null, type: "manual" },
      data: { reasonCode: BLOCK_REASON_CODES.UNWANTED_CONTACT },
    });
    await this.prisma.blockLog.updateMany({
      where: { reasonCode: null, type: { in: ["toxic_pending", "toxic_confirmed"] } },
      data: { reasonCode: BLOCK_REASON_CODES.TOXIC_CONTENT },
    });
    await this.prisma.blockLog.updateMany({
      where: { reasonCode: null, type: "manual" },
      data: { reasonCode: BLOCK_REASON_CODES.UNWANTED_CONTACT },
    });
  }

  // Kullanici istegi: varsayilan blok nedeni kodlari, ONCEKI metin
  // bazli kodlarin sayisala GECISI, ve mevcut blok kayitlarinin
  // tahmini doldurulmasi, ELLE tiklamaya gerek kalmadan, uygulama
  // BASLARKEN otomatik olarak calisir.
  async onModuleInit(): Promise<void> {
    try {
      await this.migrateLegacyTextCodes();

      // Eksik olan varsayilan kodlari (id cakismasi olmadan) tek tek
      // ekler - boylece "Sikayet" gibi SONRADAN eklenen bir kod da,
      // tablo zaten dolu olsa bile otomatik tamamlanir.
      for (const reason of DEFAULT_BLOCK_REASONS) {
        const exists = await this.prisma.systemCode.findUnique({
          where: { category_code: { category: "block_reason", code: reason.code } },
        });
        if (!exists) {
          await this.prisma.systemCode.create({
            data: { category: "block_reason", ...reason },
          });
        }
      }

      await this.backfillReasonCodes();
    } catch {
      // Baslangicta DB henuz hazir degilse sessizce gec.
    }
  }
}
