import { Test, TestingModule } from "@nestjs/testing";
import {
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ThreadService } from "./thread.service";
import { PrismaService } from "../common/prisma.service";
import { RedisService } from "../common/redis.service";
import { SmsService } from "../sms/sms.service";
import { EmailService } from "../email/email.service";
import { SafetyService } from "../safety/safety.service";
import { SettingsService } from "../settings/settings.service";
import { AuditLogService } from "../audit/audit-log.service";

// Gorev 5.8: Senaryo A (dogrudan mesaj) akisinin tum backend adimlarini
// (thread olusturma, unlock, mesaj listeleme/gonderme) kapsayan unit
// testler. Redis/Prisma/SMS/JWT mock'lanir - CI ortaminda gercek
// Postgres/Redis olmadan da hizli ve deterministik calisir.

describe("ThreadService", () => {
  let service: ThreadService;
  let prisma: any;
  let redis: jest.Mocked<RedisService>;
  let sms: jest.Mocked<SmsService>;
  let jwt: jest.Mocked<JwtService>;

  beforeEach(async () => {
    // encryptReversible fonksiyonu gecerli bir anahtar bekliyor -
    // testlerde de gercekci bir sifreleme akisi calissin diye ornek
    // bir anahtar tanimliyoruz (gercek veriyle ilgisi yok).
    process.env.PHONE_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd";

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThreadService,
        {
          provide: PrismaService,
          useValue: {
            user: { upsert: jest.fn(), findUnique: jest.fn() },
            messageThread: { create: jest.fn(), findUnique: jest.fn() },
            message: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              updateMany: jest.fn(),
              count: jest.fn().mockResolvedValue(0),
            },
            messageAudit: { create: jest.fn() },
            threadUnlock: { upsert: jest.fn(), findUnique: jest.fn() },
          },
        },
        {
          provide: RedisService,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), incr: jest.fn() },
        },
        { provide: SmsService, useValue: { send: jest.fn() } },
        { provide: EmailService, useValue: { send: jest.fn() } },
        { provide: SafetyService, useValue: { isBlocked: jest.fn().mockResolvedValue(false) } },
        { provide: SettingsService, useValue: { getNumber: jest.fn().mockResolvedValue(5) } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        { provide: JwtService, useValue: { signAsync: jest.fn(), verifyAsync: jest.fn() } },
      ],
    }).compile();

    service = module.get(ThreadService);
    prisma = module.get(PrismaService);
    redis = module.get(RedisService);
    sms = module.get(SmsService);
    jwt = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("createThread", () => {
    it("thread + ilk mesaji olusturur ve aliciya SMS gonderir", async () => {
      prisma.user.upsert.mockResolvedValue({ id: "recipient-1" });
      prisma.messageThread.create.mockResolvedValue({ id: "thread-1" });

      const result = await service.createThread("initiator-1", {
        recipientPhone: "+905551234567",
        body: "Merhaba",
        lockType: "password",
        lockSecret: "Mavi Klasor",
        isAnonymous: true,
      } as any);

      expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.messageThread.create).toHaveBeenCalledTimes(1);
      expect(sms.send).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ threadId: "thread-1" });
    });
  });

  describe("unlockThread", () => {
    it("5 basarisiz denemeden sonra 423 firlatir (yeni denemeyi hic kontrol etmeden)", async () => {
      redis.get.mockResolvedValue("5");

      await expect(service.unlockThread("thread-1", "her-hangi-bir-sey", "user-1")).rejects.toThrow(
        HttpException
      );
      expect(prisma.messageThread.findUnique).not.toHaveBeenCalled();
    });

    it("thread bulunamazsa NotFoundException firlatir", async () => {
      redis.get.mockResolvedValue(null);
      prisma.messageThread.findUnique.mockResolvedValue(null);

      await expect(service.unlockThread("olmayan-id", "xyz", "user-1")).rejects.toThrow(
        NotFoundException
      );
    });

    it("yanlis secret icin deneme sayacini artirir ve 401 firlatir", async () => {
      redis.get.mockResolvedValue(null);
      prisma.messageThread.findUnique.mockResolvedValue({
        id: "thread-1",
        lockSecretHash: await (
          await import("../common/bcrypt.util")
        ).hashSecret("Mavi Klasor"),
      });

      await expect(service.unlockThread("thread-1", "yanlis", "user-1")).rejects.toThrow(
        UnauthorizedException
      );
      expect(redis.incr).toHaveBeenCalledTimes(1);
    });

    it("dogru secret icin sayaci sifirlar ve thread_access_token doner", async () => {
      redis.get.mockResolvedValue(null);
      const { hashSecret } = await import("../common/bcrypt.util");
      prisma.messageThread.findUnique.mockResolvedValue({
        id: "thread-1",
        lockSecretHash: await hashSecret("Mavi Klasor"),
      });
      jwt.signAsync.mockResolvedValue("thread-token");

      const result = await service.unlockThread("thread-1", "Mavi Klasor", "user-1");

      expect(redis.del).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ threadAccessToken: "thread-token" });
    });
  });

  describe("getMessages", () => {
    it("anonim mesajlarda senderUserId'yi gizler, okunmamislari isaretler", async () => {
      prisma.message.findMany.mockResolvedValue([
        {
          id: "m1",
          body: "gizli mesaj",
          isAnonymous: true,
          senderUserId: "user-1",
          readAt: null,
          createdAt: new Date(),
          sender: { avatarId: null },
        },
        {
          id: "m2",
          body: "acik mesaj",
          isAnonymous: false,
          senderUserId: "user-2",
          readAt: new Date(),
          createdAt: new Date(),
          sender: { avatarId: null },
        },
      ]);

      const result = await service.getMessages("thread-1");

      expect(prisma.message.updateMany).toHaveBeenCalledTimes(1); // m1 okunmamisti
      expect(result[0].senderUserId).toBeUndefined();
      expect(result[1].senderUserId).toBe("user-2");
    });
  });

  describe("sendMessage", () => {
    it("yeni mesaji olusturur ve doner", async () => {
      prisma.message.create.mockResolvedValue({
        id: "m3",
        body: "yanit",
        isAnonymous: false,
        createdAt: new Date(),
      });

      const result = await service.sendMessage("thread-1", "user-1", "yanit", false);

      expect(prisma.message.create).toHaveBeenCalledTimes(1);
      expect(result.body).toBe("yanit");
    });
  });
});
