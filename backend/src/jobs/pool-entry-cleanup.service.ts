import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { PrismaService } from "../common/prisma.service";
import { SettingsService } from "../settings/settings.service";

// Kullanici istegi: havuz sorularinin sistemsel bir yasam omru olsun -
// POOL_ENTRY_LIFESPAN_DAYS (varsayilan 90 gun) gecince otomatik olarak
// gizlenir (hiddenByOwner=true). Kullanicinin bilerek sildigi sorularla
// AYNI mekanizma kullanilir - ilgili PoolAttempt/MessageThread kayitlari
// ETKILENMEZ, sadece soru gorunmez olur (Bolum 10 "asgari veri saklama"
// ile tutarli, ama kullanici bilerek istedigi surece de tutabilsin diye
// 0 girilirse devre disi kalir).
@Injectable()
export class PoolEntryCleanupService {
  private readonly logger = new Logger(PoolEntryCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService
  ) {}

  // Her saat basi calisir - havuz sorulari icin gunluk hassasiyet
  // yeterli, mesaj temizligindeki kadar sik kontrole gerek yok.
  @Interval(60 * 60 * 1000)
  async handleCleanup() {
    const lifespanDays = await this.settings.getNumber("POOL_ENTRY_LIFESPAN_DAYS");
    if (!lifespanDays || lifespanDays <= 0) {
      return; // 0 ya da negatif = otomatik kaldirma devre disi.
    }

    const threshold = new Date(Date.now() - lifespanDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.poolEntry.updateMany({
      where: {
        hiddenByOwner: false,
        createdAt: { lte: threshold },
      },
      data: { hiddenByOwner: true },
    });

    if (result.count > 0) {
      this.logger.log(
        `${result.count} havuz sorusu, yasam omru (${lifespanDays} gun) doldugu icin otomatik kaldirildi.`
      );
    }
  }
}
