import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { hashPhoneNumber } from "../common/hash.util";

@Injectable()
export class SafetyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService
  ) {}

  // Gorev 7.2: Bir kullanicinin baska bir numarayi engellemesi.
  // Engellenen taraf, blocklayan kisiye bir daha thread/mesaj
  // gonderemez (Bolum 10) - kontrol ThreadService.createThread'de yapilir.
  async blockUser(blockerUserId: string, phoneNumber: string): Promise<void> {
    const blockedPhoneHash = hashPhoneNumber(phoneNumber);

    const blockedUser = await this.prisma.user.upsert({
      where: { phoneNumberHash: blockedPhoneHash },
      update: {},
      create: { phoneNumberHash: blockedPhoneHash, status: "active" },
    });

    await this.prisma.block.upsert({
      where: {
        blockerUserId_blockedUserId: {
          blockerUserId,
          blockedUserId: blockedUser.id,
        },
      },
      update: {},
      create: {
        blockerUserId,
        blockedUserId: blockedUser.id,
      },
    });
  }

  // ThreadService bu metodu kullanarak "recipient, initiator'i
  // engellemis mi?" diye kontrol eder.
  async isBlocked(blockerUserId: string, blockedUserId: string): Promise<boolean> {
    const block = await this.prisma.block.findUnique({
      where: {
        blockerUserId_blockedUserId: { blockerUserId, blockedUserId },
      },
    });
    return block !== null;
  }

  // Gorev 7.3: Mesaj/thread icin sikayet kaydi olusturur - moderasyon
  // kuyruguna eklenir (Bolum 10).
  // Gorev 7.3 + 7.4: Sikayet olusturur ve sikayet edilen kullanicinin
  // (thread'i baslatan kisinin) toplam sikayet sayisini kontrol eder.
  // Esik asilirsa hesap otomatik olarak 'suspended' durumuna gecer
  // (Bolum 10, "Otomatik askiya alma mantigi").
  async reportThread(reporterUserId: string, threadId: string, reason?: string) {
    const report = await this.prisma.report.create({
      data: {
        reporterUserId,
        threadId,
        reason: reason ?? null,
      },
    });

    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      select: { initiatorUserId: true },
    });

    if (thread) {
      const threshold = await this.settings.getNumber("REPORT_SUSPEND_THRESHOLD");
      const reportCount = await this.prisma.report.count({
        where: { thread: { initiatorUserId: thread.initiatorUserId } },
      });

      if (reportCount >= threshold) {
        await this.prisma.user.update({
          where: { id: thread.initiatorUserId },
          data: { status: "suspended" },
        });
      }
    }

    return { reportId: report.id };
  }

  // Moderasyon kuyrugu: bekleyen (henuz incelenmemis) sikayetleri listeler.
  async listPendingReports() {
    return this.prisma.report.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        threadId: true,
        reporterUserId: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    });
  }
}
