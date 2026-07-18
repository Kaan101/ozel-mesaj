import { Test, TestingModule } from "@nestjs/testing";
import { HttpException, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PoolService } from "./pool.service";
import { PrismaService } from "../common/prisma.service";
import { RedisService } from "../common/redis.service";
import { NotificationService } from "../notifications/notification.service";

// Gorev 6.6: Senaryo B (havuz/kesisme) akisinin tum backend adimlarini
// (soru olusturma, listeleme, cevap denemesi + rate limit) kapsayan
// unit testler. Redis/Prisma/JWT mock'lanir - CI ortaminda gercek
// Postgres/Redis olmadan da hizli ve deterministik calisir.

describe("PoolService", () => {
  let service: PoolService;
  let prisma: any;
  let redis: jest.Mocked<RedisService>;
  let jwt: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoolService,
        {
          provide: PrismaService,
          useValue: {
            poolEntry: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            messageThread: { create: jest.fn() },
            threadUnlock: { upsert: jest.fn() },
            poolAttempt: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
          },
        },
        { provide: RedisService, useValue: { incr: jest.fn() } },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: NotificationService, useValue: { notifyUser: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(PoolService);
    prisma = module.get(PrismaService);
    redis = module.get(RedisService);
    jwt = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("createEntry", () => {
    it("cevabi hash'ler ve pool entry olusturur", async () => {
      prisma.poolEntry.create.mockResolvedValue({ id: "entry-1" });

      const result = await service.createEntry("owner-1", {
        title: "Ortak Animiz",
        question: "Nerede tanistik?",
        answer: "Kutuphanede",
        category: "Sehir hafizasi",
        visibility: "public",
      } as any);

      expect(prisma.poolEntry.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ poolEntryId: "entry-1" });
    });
  });

  describe("listEntries", () => {
    it("sadece public sorulari, kategori filtresiyle ve sayfalamayla doner", async () => {
      prisma.poolEntry.findMany.mockResolvedValue([
        { id: "entry-1", title: "Test", ownerUserId: "owner-1" },
      ]);
      prisma.poolEntry.count.mockResolvedValue(1);

      const result = await service.listEntries("Muzik", 1, 10);

      expect(prisma.poolEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { visibility: "public", hiddenByOwner: false, category: "Muzik" },
        })
      );
      expect(result).toEqual({
        items: [{ id: "entry-1", title: "Test", isOwner: false }],
        page: 1,
        pageSize: 10,
        total: 1,
      });
    });
  });

  describe("attemptEntry", () => {
    it("rate limit asilirsa 429 firlatir ve veritabanina hic gitmez", async () => {
      redis.incr.mockResolvedValue(6); // limit (5) asildi

      await expect(service.attemptEntry("entry-1", "user-1", "cevap")).rejects.toThrow(
        HttpException
      );
      expect(prisma.poolEntry.findUnique).not.toHaveBeenCalled();
    });

    it("entry bulunamazsa NotFoundException firlatir", async () => {
      redis.incr.mockResolvedValue(1);
      prisma.poolEntry.findUnique.mockResolvedValue(null);

      await expect(service.attemptEntry("olmayan-id", "user-1", "cevap")).rejects.toThrow(
        NotFoundException
      );
    });

    it("yanlis cevapta success:false doner, thread olusturmaz", async () => {
      redis.incr.mockResolvedValue(1);
      const { hashSecret } = await import("../common/bcrypt.util");
      prisma.poolEntry.findUnique.mockResolvedValue({
        id: "entry-1",
        ownerUserId: "owner-1",
        answerHash: await hashSecret("dogru-cevap"),
        questionText: "Soru?",
      });

      const result = await service.attemptEntry("entry-1", "user-1", "yanlis-cevap");

      expect(result).toEqual({ success: false });
      expect(prisma.messageThread.create).not.toHaveBeenCalled();
    });

    it("dogru cevapta thread olusturur ve threadAccessToken doner", async () => {
      redis.incr.mockResolvedValue(1);
      const { hashSecret } = await import("../common/bcrypt.util");
      prisma.poolEntry.findUnique.mockResolvedValue({
        id: "entry-1",
        ownerUserId: "owner-1",
        answerHash: await hashSecret("dogru-cevap"),
        questionText: "Soru?",
      });
      prisma.messageThread.create.mockResolvedValue({ id: "thread-1" });
      jwt.signAsync.mockResolvedValue("thread-token");

      const result = await service.attemptEntry("entry-1", "user-2", "dogru-cevap");

      expect(prisma.messageThread.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            originType: "pool",
            initiatorUserId: "owner-1",
            recipientUserId: "user-2",
          }),
        })
      );
      expect(result).toEqual({
        success: true,
        threadId: "thread-1",
        threadAccessToken: "thread-token",
      });
    });
    it("review modunda dogru/yanlis fark etmeksizin bekleyen yanit olusturur, thread acmaz", async () => {
      redis.incr.mockResolvedValue(1);
      const { hashSecret } = await import("../common/bcrypt.util");
      prisma.poolEntry.findUnique.mockResolvedValue({
        id: "entry-1",
        ownerUserId: "owner-1",
        answerHash: await hashSecret("dogru-cevap"),
        questionText: "Soru?",
        matchMode: "review",
      });
      prisma.poolAttempt.create.mockResolvedValue({ id: "attempt-1" });

      const result = await service.attemptEntry("entry-1", "user-3", "her-turlu-cevap");

      expect(prisma.poolAttempt.create).toHaveBeenCalledTimes(1);
      expect(prisma.messageThread.create).not.toHaveBeenCalled();
      expect(result).toEqual({ success: null, pending: true, attemptId: "attempt-1" });
    });
  });
});
