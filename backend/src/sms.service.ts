import { Injectable, Logger } from "@nestjs/common";

// Bu servis "adapter pattern" ile yazildi: SmsService.send() disariya
// tek bir arayuz sunar, ic taraftaki saglayici (su an Ileti Merkezi)
// ileride degisirse (orn. Twilio'ya gecilirse) sadece bu dosya
// degisir, onu cagiran kod (AuthService) hic etkilenmez (Bolum 6, 12).
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  // Gorev 3.3 / 4.3: SMS gonderim adapter modulu.
  // mockMode true ise (staging/test ortaminda) gercek SMS gonderilmez,
  // kod sadece loglanir - boylece SMS maliyeti olmadan gelistirme
  // yapilabilir (Bolum 4, "Mock SMS servisi").
  async send(phoneNumber: string, text: string): Promise<void> {
    const mockMode = process.env.SMS_MOCK_MODE !== "false";

    if (mockMode) {
      this.logger.log(`[MOCK SMS] Alici: ${phoneNumber} | Mesaj: ${text}`);
      return;
    }

    await this.sendViaIletiMerkezi(phoneNumber, text);
  }

  // Ileti Merkezi HTTP GET API:
  // http://api.iletimerkezi.com/v1/send-sms/get/?username=...&password=...&text=...&receipents=...&sender=...
  // Kaynak: https://www.iletimerkezi.com/blog/http-get-yontemi-ile-toplu-sms-gonderimi
  private async sendViaIletiMerkezi(phoneNumber: string, text: string): Promise<void> {
    const username = process.env.SMS_USERNAME;
    const password = process.env.SMS_PASSWORD;
    const sender = process.env.SMS_SENDER_HEADER;

    if (!username || !password || !sender) {
      throw new Error(
        "SMS_USERNAME, SMS_PASSWORD ve SMS_SENDER_HEADER .env icinde tanimli olmali."
      );
    }

    // Telefon numarasindaki '+' isaretini kaldiriyoruz, Ileti Merkezi
    // numaralari basinda ulke kodu olacak sekilde ama '+' olmadan bekliyor.
    const normalizedNumber = phoneNumber.replace(/^\+/, "");

    const params = new URLSearchParams({
      username,
      password,
      text,
      receipents: normalizedNumber, // API'nin kendi yazim sekli (typo degil)
      sender,
    });

    const url = `https://api.iletimerkezi.com/v1/send-sms/get/?${params.toString()}`;

    const response = await fetch(url);
    const body = await response.text();

    if (!response.ok) {
      this.logger.error(`SMS gonderimi basarisiz: ${response.status} - ${body}`);
      throw new Error("SMS gonderimi basarisiz oldu.");
    }

    // Ileti Merkezi hata durumlarinda da HTTP 200 donebilir, govdede
    // XML hata kodu doner. Basit bir kontrolle "code>200" gibi bir
    // hata isaretini yakalamaya calisiyoruz (detayli parse Gorev 4.4'te).
    if (body.includes("<code>4") || body.includes("<code>5")) {
      this.logger.error(`Ileti Merkezi hata dondu: ${body}`);
      throw new Error("SMS saglayicisi hata dondu.");
    }

    this.logger.log(`SMS gonderildi: ${normalizedNumber}`);
  }
}
