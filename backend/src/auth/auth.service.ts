import { HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { RedisService } from "../common/redis.service";
import { PrismaService } from "../common/prisma.service";
import { SmsService } from "../sms/sms.service";
import { SettingsService } from "../settings/settings.service";
import { AuditLogService } from "../audit/audit-log.service";
import { generateOtpCode, hashPhoneNumber } from "../common/hash.util";
import { encryptReversible } from "../common/encryption.util";

@Injectable()
export class AuthService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly settings: SettingsService,
    private readonly auditLog: AuditLogService,
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
    const perMinuteLimit = await this.settings.getNumber("OTP_RATE_LIMIT_PER_MINUTE");
    const perHourLimit = await this.settings.getNumber("OTP_RATE_LIMIT_PER_HOUR");

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
  async requestOtp(
    phoneNumber: string
  ): Promise<{ phoneHash: string; ttlSeconds: number; mockCode?: string }> {
    const phoneHash = hashPhoneNumber(phoneNumber);

    await this.enforceRateLimit(phoneHash);

    const code = generateOtpCode(Number(process.env.OTP_LENGTH ?? 4));
    const ttlSeconds = Number(process.env.OTP_TTL_SECONDS ?? 300);

    await this.redis.set(this.otpKey(phoneHash), code, ttlSeconds);

    const text = `Ozel Mesaj dogrulama kodunuz: ${code}. Bu kod ${Math.round(ttlSeconds / 60)} dakika gecerlidir.`;
    await this.sms.send(phoneNumber, text);

    // Kullanici istegi: hukuki ispat icin genel islem gunlugu - hangi
    // numaraya (hash olarak) OTP istendigi kaydedilir.
    await this.auditLog.log({
      eventType: "otp_requested",
      metadata: { phoneHash },
    });

    // Kullanici geri bildirimi: sadece SMS_MOCK_MODE=true iken (yerel
    // gelistirme/test), kodu response'a da ekliyoruz ki frontend'de
    // otomatik doldurulabilsin. SMS_MOCK_MODE=false oldugunda (gercek
    // SMS gonderiliyorken) bu alan ASLA response'a eklenmez - aksi
    // halde OTP'nin tum guvenlik amacini (numarayi gercekten kontrol
    // etme) bosa cikarirdi (Bolum 8).
    const isMockMode = process.env.SMS_MOCK_MODE === "true";

    return { phoneHash, ttlSeconds, ...(isMockMode ? { mockCode: code } : {}) };
  }

  private otpVerifyAttemptsKey(phoneHash: string): string {
    return `otp-verify-attempts:${phoneHash}`;
  }

  // Gorev 7.6 (guvenlik bulgusu duzeltmesi): OTP dogrulamada deneme
  // siniri yoktu - Bolum 3, Adim 3'teki "5 deneme sonrasi kilitleme"
  // gereksinimini karsilamiyorduk. 5 yanlis denemeden sonra 15 dakika
  // kilitleniyor (thread-unlock'taki ayni desen, Bolum 8, 10).
  async verifyOtp(
    phoneNumber: string,
    code: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const phoneHash = hashPhoneNumber(phoneNumber);
    const maxAttempts = await this.settings.getNumber("OTP_VERIFY_MAX_ATTEMPTS");
    const lockoutSeconds = 15 * 60;

    const attemptsKey = this.otpVerifyAttemptsKey(phoneHash);
    const currentAttempts = Number((await this.redis.get(attemptsKey)) ?? 0);

    if (currentAttempts >= maxAttempts) {
      throw new HttpException(
        "Cok fazla yanlis deneme yapildi. Lutfen 15 dakika sonra yeni bir kod isteyin.",
        423 // Locked
      );
    }

    const storedCode = await this.redis.get(this.otpKey(phoneHash));

    if (!storedCode || storedCode !== code) {
      await this.redis.incr(attemptsKey, lockoutSeconds);
      throw new UnauthorizedException("Kod hatali veya suresi dolmus.");
    }

    // Basarili girisde hem OTP kodu hem deneme sayaci temizlenir.
    await this.redis.del(this.otpKey(phoneHash));
    await this.redis.del(attemptsKey);

    const user = await this.prisma.user.upsert({
      where: { phoneNumberHash: phoneHash },
      update: { lastSeenAt: new Date(), phoneNumberEncrypted: encryptReversible(phoneNumber) },
      create: {
        phoneNumberHash: phoneHash,
        phoneNumberEncrypted: encryptReversible(phoneNumber),
        status: "active",
      },
    });

    await this.auditLog.log({
      eventType: "otp_verified",
      userId: user.id,
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
