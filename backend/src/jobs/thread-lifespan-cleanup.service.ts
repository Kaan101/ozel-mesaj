import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { PrismaService } from "../common/prisma.service";
import { SettingsService } from "../settings/settings.service";

// Kullanici istegi: bir iletisimin (mesajlasma/konusma) sistemsel bir
// maksimum yasam suresi olsun - THREAD_MAX_LIFESPAN_DAYS (varsayilan
// 365 gun) gecince, her iki taraf icin de Mesajlarim listesinden
// otomatik olarak arsivlenir (kullanicinin "sil" ozelligiyle AYNI
// mekanizma - hiddenAt zaman damgasi). Mesajlarin kendisi SILINMEZ,
// sadece gorunmez olur; yeni bir mesaj gelirse (Bolum: silme sonrasi
// geri acilma mantigi) tekrar listeye donebilir.
@Injectable()
export class ThreadLifespanCleanupService {
  private readonly logger = new Logger(ThreadLifespanCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService
  ) {}

  // Havuz sorusu temizligiyle ayni sıklikta (saatte bir) yeterli.
  @Interval(60 * 60 * 1000)
  async handleCleanup() {
    const lifespanDays = await this.settings.getNumber("THREAD_MAX_LIFESPAN_DAYS");
    if (!lifespanDays || lifespanDays <= 0) {
      return; // 0 ya da negatif = otomatik arsivleme devre disi.
    }

    const threshold = new Date(Date.now() - lifespanDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    const result = await this.prisma.messageThread.updateMany({
      where: {
        createdAt: { lte: threshold },
        // Zaten arsivlenmis olanlari tekrar tekrar guncellemeyelim.
        OR: [{ hiddenByInitiatorAt: null }, { hiddenByRecipientAt: null }],
      },
      data: { hiddenByInitiatorAt: now, hiddenByRecipientAt: now },
    });

    if (result.count > 0) {
      this.logger.log(
        `${result.count} iletisim, maksimum yasam suresi (${lifespanDays} gun) doldugu icin arsivlendi.`
      );
    }
  }
}
