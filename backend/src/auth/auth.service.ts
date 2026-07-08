import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { RedisService } from "../common/redis.service";
import { PrismaService } from "../common/prisma.service";
import { SmsService } from "../sms/sms.service";
import { generateOtpCode, hashPhoneNumber } from "../common/hash.util";

@Injectable()
export class AuthService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly jwt: JwtService
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

  // Gorev 3.4: Redis'teki kodla karsilastirir, dogruysa kullaniciyi
  // bulur/olusturur (upsert) ve JWT access + refresh token uretir
  // (Bolum 8, Katman 1 - Kimlik Dogrulama).
  async verifyOtp(
    phoneNumber: string,
    code: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const phoneHash = hashPhoneNumber(phoneNumber);
    const storedCode = await this.redis.get(this.otpKey(phoneHash));

    if (!storedCode || storedCode !== code) {
      throw new UnauthorizedException("Kod hatali veya suresi dolmus.");
    }

    // Kod bir kez kullanilir - dogrulandiktan sonra hemen silinir.
    await this.redis.del(this.otpKey(phoneHash));

    const user = await this.prisma.user.upsert({
      where: { phoneNumberHash: phoneHash },
      update: { lastSeenAt: new Date() },
      create: { phoneNumberHash: phoneHash, status: "active" },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
      }
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
      }
    );

    return { accessToken, refreshToken };
  }
}
