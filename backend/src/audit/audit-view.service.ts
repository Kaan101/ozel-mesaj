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

  // Kullanici istegi: "hangi telefon hangi telefona ne zaman mesaj
  // atti" sorusuna TEK ekranda cevap veren bir liste - TUM
  // konusmalari, HER IKI tarafin telefon numarasiyla (cozulmus),
  // mesaj sayisiyla ve tarihiyle birlikte gosterir.
  async listAllThreadsWithPhones(page: number, pageSize: number, phoneSearch?: string) {
    // Kullanici istegi: belirli bir telefon numarasinin ("5323770376"
    // gibi, +90/0 on eki olmadan da) attigi TUM mesajlari bulabilme.
    // Numara SIFRELI (ama geri dondurulebilir) saklandigi icin, DOGRUDAN
    // veritabaninda "arama" yapamayiz - bunun yerine, arama terimi
    // varsa ONCE TUM kullanicilarin telefonlarini cozup, aranani
    // ICEREN (format farkina duyarli olmadan) kullanicilarin ID'lerini
    // buluyoruz, SONRA thread'leri bu ID'lere gore filtreliyoruz.
    let matchingUserIds: string[] | null = null;
    if (phoneSearch && phoneSearch.trim()) {
      const digitsOnly = phoneSearch.replace(/\D/g, "");
      const allUsers = await this.prisma.user.findMany({
        select: { id: true, phoneNumberEncrypted: true },
      });
      matchingUserIds = allUsers
        .filter((u) => {
          if (!u.phoneNumberEncrypted) return false;
          const decrypted = decryptReversible(u.phoneNumberEncrypted).replace(/\D/g, "");
          return decrypted.includes(digitsOnly);
        })
        .map((u) => u.id);
    }

    const where =
      matchingUserIds !== null
        ? {
            OR: [
              { initiatorUserId: { in: matchingUserIds } },
              { recipientUserId: { in: matchingUserIds } },
            ],
          }
        : {};

    const [threads, total] = await Promise.all([
      this.prisma.messageThread.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          createdAt: true,
          originType: true,
          recipientPhoneDisplay: true,
          initiator: { select: { id: true, phoneNumberEncrypted: true, displayName: true } },
          recipient: { select: { id: true, phoneNumberEncrypted: true, displayName: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.messageThread.count({ where }),
    ]);

    return {
      items: threads.map((t) => ({
        threadId: t.id,
        createdAt: t.createdAt,
        originType: t.originType,
        initiatorUserId: t.initiator.id,
        initiatorPhone: t.initiator.phoneNumberEncrypted
          ? decryptReversible(t.initiator.phoneNumberEncrypted)
          : null,
        initiatorDisplayName: t.initiator.displayName,
        recipientUserId: t.recipient?.id ?? null,
        // Kullanici istegi: eger alici kayitli bir kullanicisiysa
        // ONUN GERCEK telefonu; henuz eslesmemis/kayitsizsa,
        // GONDERENIN YAZDIGI numara (recipientPhoneDisplay) gosterilir.
        recipientPhone: t.recipient?.phoneNumberEncrypted
          ? decryptReversible(t.recipient.phoneNumberEncrypted)
          : t.recipientPhoneDisplay,
        recipientDisplayName: t.recipient?.displayName ?? null,
        messageCount: t._count.messages,
      })),
      total,
      page,
      pageSize,
    };
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
  // silinmis olsalar bile. Her mesajin yaninda, GONDERENIN telefon
  // numarasi da (anonim degilse) cozulmus halde gosterilir.
  async revealThreadMessages(threadId: string) {
    const [audits, thread] = await Promise.all([
      this.prisma.messageAudit.findMany({
        where: { threadId },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.messageThread.findUnique({
        where: { id: threadId },
        select: {
          initiator: { select: { id: true, phoneNumberEncrypted: true } },
          recipient: { select: { id: true, phoneNumberEncrypted: true } },
        },
      }),
    ]);

    const phoneByUserId = new Map<string, string | null>();
    if (thread?.initiator) {
      phoneByUserId.set(
        thread.initiator.id,
        thread.initiator.phoneNumberEncrypted
          ? decryptReversible(thread.initiator.phoneNumberEncrypted)
          : null
      );
    }
    if (thread?.recipient) {
      phoneByUserId.set(
        thread.recipient.id,
        thread.recipient.phoneNumberEncrypted
          ? decryptReversible(thread.recipient.phoneNumberEncrypted)
          : null
      );
    }

    return audits.map((a) => ({
      id: a.id,
      originalMessageId: a.originalMessageId,
      senderUserId: a.senderUserId,
      // Kullanici istegi: anonim mesajlarda gonderenin telefonu
      // GOSTERILMEZ (anonimlik prensibi korunur) - anonim degilse
      // cozulmus telefon numarasi eklenir.
      senderPhone: a.isAnonymous || !a.senderUserId ? null : (phoneByUserId.get(a.senderUserId) ?? null),
      isAnonymous: a.isAnonymous,
      body: decryptReversible(a.bodyEncrypted),
      createdAt: a.createdAt,
    }));
  }
}
