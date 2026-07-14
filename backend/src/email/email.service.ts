import { Injectable, Logger } from "@nestjs/common";

// SmsService ile ayni adapter deseni: gercek bir e-posta saglayicisi
// (orn. Resend, SendGrid) baglanana kadar mock modda calisir - kod
// sadece loglanir, gercek e-posta gonderilmez (Bolum 4 SMS mock
// mantigiyla tutarli). Kullanici istegi: opsiyonel ek bildirim kanali,
// alicinin giris/kimlik dogrulama yontemini degistirmez.
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send(email: string, subject: string, text: string): Promise<void> {
    const mockMode = process.env.EMAIL_MOCK_MODE !== "false";

    if (mockMode) {
      this.logger.log(`[MOCK EMAIL] Alici: ${email} | Konu: ${subject} | Icerik: ${text}`);
      return;
    }

    // Gercek saglayici entegrasyonu ileride buraya eklenecek
    // (EMAIL_PROVIDER_API_KEY vb. .env degiskenleriyle).
    this.logger.warn(
      `EMAIL_MOCK_MODE=false ama gercek saglayici entegrasyonu henuz yapilmadi. E-posta gonderilemedi: ${email}`
    );
  }
}
