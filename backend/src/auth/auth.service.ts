import { Injectable } from "@nestjs/common";
import { RedisService } from "../common/redis.service";
import { SmsService } from "../sms/sms.service";
import { generateOtpCode, hashPhoneNumber } from "../common/hash.util";

@Injectable()
export class AuthService {
  constructor(
    private readonly redis: RedisService,
    private readonly sms: SmsService
  ) {}

  private otpKey(phoneHash: string): string {
    return `otp:${phoneHash}`;
  }

  // Gorev 3.2 + 3.3: Telefon numarasini hash'ler, 4 haneli kod uretir,
  // Redis'e TTL:5dk ile yazar, sonra SmsService uzerinden gonderir.
  // Rate limiting Gorev 3.7'de eklenecek.
  async requestOtp(phoneNumber: string): Promise<{ phoneHash: string; ttlSeconds: number }> {
    const phoneHash = hashPhoneNumber(phoneNumber);
    const code = generateOtpCode(Number(process.env.OTP_LENGTH ?? 4));
    const ttlSeconds = Number(process.env.OTP_TTL_SECONDS ?? 300);

    await this.redis.set(this.otpKey(phoneHash), code, ttlSeconds);

    const text = `Ozel Mesaj dogrulama kodunuz: ${code}. Bu kod ${Math.round(ttlSeconds / 60)} dakika gecerlidir.`;
    await this.sms.send(phoneNumber, text);

    return { phoneHash, ttlSeconds };
  }
}
