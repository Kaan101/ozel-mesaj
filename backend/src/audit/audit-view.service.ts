import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { decryptReversible } from "../common/encryption.util";

// Kullanici istegi: yonetim ekranindan hukuki ispat/belgeleme icin
// gunlukleri, arsivlenmis mesajlari ve telefon numaralarini gorme.
// Bu servisin TUM metodlari yalnizca AdminGuard korumali endpoint'ler
// tarafindan cagrilir - normal kullanicilar erisemez.
@Injectable()
export class AuditViewService {
  constructor(private readonly prisma: PrismaService) {}

  async listLogs(filters: {
    eventType?: string;
    userId?: string;
    threadId?: string;
    page: number;
    pageSize: number;
  }) {
    const where: any = {};
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.userId) where.userId = filters.userId;
    if (filters.threadId) where.threadId = filters.threadId;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  // Kullanici istegi: bir kullanicinin gercek (sifresi cozulmus)
  // telefon numarasini gosterir - sadece bilincli bir yonetim
  // islemiyle, hukuki ispat amaciyla kullanilmalidir.
  async revealPhone(userId: string): Promise<{ phoneNumber: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumberEncrypted: true },
    });

    if (!user) {
      throw new NotFoundException("Kullanici bulunamadi.");
    }

    if (!user.phoneNumberEncrypted) {
      return { phoneNumber: null };
    }

    return { phoneNumber: decryptReversible(user.phoneNumberEncrypted) };
  }

  // Kullanici istegi: bir thread'in TUM mesajlarinin arsivlenmis
  // (sifresi cozulmus) halini gosterir - "okunduktan sonra sil" ile
  // silinmis olsalar bile.
  async revealThreadMessages(threadId: string) {
    const audits = await this.prisma.messageAudit.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });

    return audits.map((a) => ({
      id: a.id,
      originalMessageId: a.originalMessageId,
      senderUserId: a.senderUserId,
      isAnonymous: a.isAnonymous,
      body: decryptReversible(a.bodyEncrypted),
      createdAt: a.createdAt,
    }));
  }
}
