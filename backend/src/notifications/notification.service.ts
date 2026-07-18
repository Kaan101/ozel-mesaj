import { Injectable, Logger } from "@nestjs/common";
import * as webpush from "web-push";
import { PrismaService } from "../common/prisma.service";
import { SettingsService } from "../settings/settings.service";

// Kullanici istegi: gercek tarayici push bildirimleri - kullanici
// telefonunu kilitlemis/sekmeyi kapatmis olsa bile bildirim alabilsin.
// VAPID anahtarlariyla imzalanmis mesajlar, tarayicinin Push
// servisine (Chrome/Firefox/vb.) gonderilir; tarayici da bunu
// service worker'a iletir (bkz. frontend public/sw.js).
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private isConfigured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService
  ) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (publicKey && privateKey) {
      webpush.setVapidDetails("mailto:destek@youhavemi.com", publicKey, privateKey);
      this.isConfigured = true;
    } else {
      this.logger.warn(
        "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY tanimli degil - push bildirimleri devre disi."
      );
    }
  }

  async saveSubscription(
    userId: string,
    endpoint: string,
    p256dh: string,
    auth: string
  ): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh, auth },
      create: { userId, endpoint, p256dh, auth },
    });
  }

  async removeSubscription(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  // Kullanici istegi: yeni mesaj/havuz yaniti geldiginde ilgili
  // kullaniciya push bildirimi gonderir. Bildirim icerigi BILEREK
  // genel tutulur (mesaj metnini icermez) - bildirim, kilit ekraninda
  // da gorunebilecegi icin gizlilik acisindan hassas bilgi tasimamali.
  async notifyUser(userId: string, title: string, body: string, url: string): Promise<void> {
    const enabled = await this.settings.getNumber("PUSH_NOTIFICATIONS_ENABLED");
    if (!enabled || !this.isConfigured) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({ title, body, url });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
        } catch (err: any) {
          // 410/404 = abonelik artik gecerli degil (kullanici izni
          // geri cekmis/tarayici verisini temizlemis) - sessizce sil.
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            this.logger.warn(`Push gonderilemedi (${sub.id}): ${err?.message}`);
          }
        }
      })
    );
  }
}
