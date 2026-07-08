import { HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
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

  private rateLimitMinuteKey(phoneHash: string): string {
    return `otp-rl-min:${phoneHash}`;
  }

  private rateLimitHourKey(phoneHash: string): string {
    return `otp-rl-hour:${phoneHash}`;
  }

  // Gorev 3.7: Ayni numaraya dakikada N'den, saatte M'den fazla OTP
  // istegi engellenir (Bolum 8 "Rate limiting", Bolum 10 spam/smishing
  // onleme). Limit asilirsa 429 doner.
  private async enforceRateLimit(phoneHash: string): Promise<void> {
    const perMinuteLimit = Number(process.env.OTP_RATE_LIMIT_PER_MINUTE ?? 1);
    const perHourLimit = Number(process.env.OTP_RATE_LIMIT_PER_HOUR ?? 5);

    const minuteCount = await this.redis.incr(this.rateLimitMinuteKey(phoneHash), 60);
    if (minuteCount > perMinuteLimit) {
      throw new HttpException(
        "Cok sik istek yapildi, lutfen bir dakika sonra tekrar deneyin.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    const hourCount = await this.redis.incr(this.rateLimitHourKey(phoneHash), 3600);
    if (hourCount > perHourLimit) {
      throw new HttpException(
        "Saatlik istek limitine ulasildi, lutfen daha sonra tekrar deneyin.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  // Gorev 3.2 + 3.3 + 3.7: Telefon numarasini hash'ler, rate limit
  // kontrolu yapar, 4 haneli kod uretir, Redis'e TTL:5dk ile yazar,
  // sonra SmsService uzerinden gonderir.
  async requestOtp(phoneNumber: string): Promise<{ phoneHash: string; ttlSeconds: number }> {
    const phoneHash = hashPhoneNumber(phoneNumber);

    await this.enforceRateLimit(phoneHash);

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

  // Gorev 3.5: Refresh token'i dogrular, gecerliyse yeni bir access
  // token uretir. Kullanici tekrar SMS almadan oturumunu surdurebilir
  // (Bolum 8, "Neden JWT + refresh token").
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException("Refresh token gecersiz veya suresi dolmus.");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "active") {
      throw new UnauthorizedException("Kullanici bulunamadi veya aktif degil.");
    }

    const accessToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
      }
    );

    return { accessToken };
  }
}
