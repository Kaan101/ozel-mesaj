import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException, HttpException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { RedisService } from "../common/redis.service";
import { PrismaService } from "../common/prisma.service";
import { SmsService } from "../sms/sms.service";

// Gorev 3.8: Auth akisi (OTP request/verify/refresh) icin unit testler.
// Redis/Prisma/SMS/JWT gercek servisler yerine mock'lanir - boylece
// testler gercek veritabani/Redis/SMS'e ihtiyac duymadan, hizli ve
// deterministik calisir (CI ortaminda da sorunsuz).

describe("AuthService", () => {
  let service: AuthService;
  let redis: jest.Mocked<RedisService>;
  let prisma: any;
  let sms: jest.Mocked<SmsService>;
  let jwt: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            incr: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: SmsService,
          useValue: { send: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    redis = module.get(RedisService);
    prisma = module.get(PrismaService);
    sms = module.get(SmsService);
    jwt = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("requestOtp", () => {
    it("rate limit asilmadiysa kod uretip SMS gonderir", async () => {
      redis.incr.mockResolvedValue(1); // hem dakika hem saat sayaci limit altinda

      const result = await service.requestOtp("+905551234567");

      expect(redis.set).toHaveBeenCalledTimes(1);
      expect(sms.send).toHaveBeenCalledTimes(1);
      expect(result.ttlSeconds).toBeGreaterThan(0);
    });

    it("dakikalik rate limit asilirsa 429 firlatir", async () => {
      redis.incr.mockResolvedValueOnce(2); // limit (1) asildi

      await expect(service.requestOtp("+905551234567")).rejects.toThrow(HttpException);
      expect(sms.send).not.toHaveBeenCalled();
    });
  });

  describe("verifyOtp", () => {
    it("kod yanlissa UnauthorizedException firlatir", async () => {
      redis.get.mockImplementation(async (key: string) =>
        key.startsWith("otp-verify-attempts") ? null : "1234"
      );

      await expect(service.verifyOtp("+905551234567", "9999")).rejects.toThrow(
        UnauthorizedException
      );
      expect(redis.incr).toHaveBeenCalledTimes(1);
    });

    it("5 basarisiz denemeden sonra 423 firlatir", async () => {
      redis.get.mockImplementation(async (key: string) =>
        key.startsWith("otp-verify-attempts") ? "5" : "1234"
      );

      await expect(service.verifyOtp("+905551234567", "9999")).rejects.toThrow(
        HttpException
      );
    });

    it("kod dogruysa kullaniciyi upsert eder ve token doner", async () => {
      redis.get.mockImplementation(async (key: string) =>
        key.startsWith("otp-verify-attempts") ? null : "1234"
      );
      prisma.user.upsert.mockResolvedValue({ id: "user-1", status: "active" });
      jwt.signAsync
        .mockResolvedValueOnce("access-token")
        .mockResolvedValueOnce("refresh-token");

      const result = await service.verifyOtp("+905551234567", "1234");

      expect(redis.del).toHaveBeenCalledTimes(2); // otp kodu + deneme sayaci
      expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
    });
  });

  describe("refreshAccessToken", () => {
    it("gecersiz refresh token icin UnauthorizedException firlatir", async () => {
      jwt.verifyAsync.mockRejectedValue(new Error("invalid signature"));

      await expect(service.refreshAccessToken("bad-token")).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("kullanici bulunamazsa UnauthorizedException firlatir", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "user-1" });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshAccessToken("good-token")).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("gecerli token + aktif kullanici icin yeni access token doner", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "user-1" });
      prisma.user.findUnique.mockResolvedValue({ id: "user-1", status: "active" });
      jwt.signAsync.mockResolvedValue("new-access-token");

      const result = await service.refreshAccessToken("good-token");

      expect(result).toEqual({ accessToken: "new-access-token" });
    });
  });
});
