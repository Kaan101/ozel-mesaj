import { Injectable } from "@nestjs/common";
import { RedisService } from "../common/redis.service";
import { generateOtpCode, hashPhoneNumber } from "../common/hash.util";

@Injectable()
export class AuthService {
  constructor(private readonly redis: RedisService) {}

  private otpKey(phoneHash: string): string {
    return `otp:${phoneHash}`;
  }

  // Gorev 3.2: Telefon numarasini hash'ler, 4 haneli kod uretir,
  // Redis'e TTL:5dk ile yazar. SMS gonderimi Gorev 3.3'te bu servise
  // baglanacak; rate limiting Gorev 3.7'de eklenecek.
  async requestOtp(phoneNumber: string): Promise<{ phoneHash: string; ttlSeconds: number }> {
    const phoneHash = hashPhoneNumber(phoneNumber);
    const code = generateOtpCode(Number(process.env.OTP_LENGTH ?? 4));
    const ttlSeconds = Number(process.env.OTP_TTL_SECONDS ?? 300);

    await this.redis.set(this.otpKey(phoneHash), code, ttlSeconds);

    // NOT: Kod, gelistirme asamasinda gorunur olsun diye loglaniyor.
    // Gorev 3.3'te bu satirin yerini gercek SMS gonderimi alacak ve
    // kod asla logda gorunmeyecek.
    console.log(`[DEV] ${phoneNumber} icin OTP kodu: ${code} (TTL: ${ttlSeconds}s)`);

    return { phoneHash, ttlSeconds };
  }
}
