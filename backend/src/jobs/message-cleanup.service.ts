import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { PrismaService } from "../common/prisma.service";
import { SettingsService } from "../settings/settings.service";

// Gorev 5.6: destroy_after_read=true olan mesajlar, okunduktan
// (read_at set edildikten) belirli bir sure sonra veritabanindan
// HARD-DELETE edilir - soft-delete degil, satir tamamen silinir
// (Bolum 10). Sure, MESSAGE_DESTROY_DELAY_SECONDS ile ayarlanabilir
// (varsayilan: 10 saniye, test/demo icin kisa tutuldu; production'da
// "aninda" (0) veya "24 saat" (86400) gibi degerler de kullanilabilir).
@Injectable()
export class MessageCleanupService {
  private readonly logger = new Logger(MessageCleanupService.name);
  private lastDiagnosticLogAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService
  ) {}

  // Her 10 saniyede bir calisir ve suresi gelen mesajlari siler.
  @Interval(10_000)
  async handleCleanup() {
    const delaySeconds = await this.settings.getNumber("MESSAGE_DESTROY_DELAY_SECONDS");
    const threshold = new Date(Date.now() - delaySeconds * 1000);

    const result = await this.prisma.message.deleteMany({
      where: {
        destroyAfterRead: true,
        readAt: { not: null, lte: threshold },
      },
    });

    if (result.count > 0) {
      this.logger.log(`${result.count} mesaj destroy_after_read kurali geregi silindi.`);
    }

    // Kullanici istegi: gonderilen mesajlarin GENEL bir yasam suresi
    // (gun bazinda) - "okunduktan sonra sil"den bagimsiz, okunma
    // durumu ne olursa olsun belirli bir sureyi gecen HER mesaj
    // silinir. Hukuki ispat icin sifreli arsiv kopyasi (MessageAudit)
    // bundan ETKILENMEZ.
    //
    // Kullanici istegi: bir iletisimin ILK mesaji, o iletisimin
    // (Mesajlarim listesindeki) SABIT basligini olusturdugu icin asla
    // silinmez - yasam suresi kurali sadece ONDAN SONRAKI mesajlara
    // uygulanir.
    const lifespanDays = await this.settings.getNumber("MESSAGE_LIFESPAN_DAYS");
    // Teshis: her calismada gercekte okunan degeri logla - "10 girdim
    // ama 1 gibi davraniyor" turu sorunlari Railway loglarindan
    // dogrulamak icin. 5 dakikada bir sinirlanir (log kirliligi olmasin).
    if (Date.now() - this.lastDiagnosticLogAt > 5 * 60 * 1000) {
      this.logger.log(`MESSAGE_LIFESPAN_DAYS su an: ${lifespanDays} gun.`);
      this.lastDiagnosticLogAt = Date.now();
    }
    if (lifespanDays > 0) {
      const lifespanThreshold = new Date(Date.now() - lifespanDays * 24 * 60 * 60 * 1000);

      const firstMessages = await this.prisma.message.findMany({
        orderBy: { createdAt: "asc" },
        distinct: ["threadId"],
        select: { id: true },
      });
      const protectedIds = firstMessages.map((m) => m.id);

      const lifespanResult = await this.prisma.message.deleteMany({
        where: {
          createdAt: { lte: lifespanThreshold },
          id: { notIn: protectedIds },
        },
      });
      if (lifespanResult.count > 0) {
        this.logger.log(
          `${lifespanResult.count} mesaj, yasam suresi (${lifespanDays} gun) doldugu icin silindi (ilk mesajlar korundu).`
        );
      }
    }
  }
}
