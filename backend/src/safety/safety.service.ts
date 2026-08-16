import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { AuditLogService } from "../audit/audit-log.service";
import { hashPhoneNumber } from "../common/hash.util";
import { decryptReversible, encryptReversible } from "../common/encryption.util";
import { BLOCK_REASON_CODES } from "../system-codes/block-reason-codes.const";
import { NotificationService } from "../notifications/notification.service";

@Injectable()
export class SafetyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly auditLog: AuditLogService,
    private readonly notifications: NotificationService
  ) {}

  // Kullanici istegi: mesaj ekranindan dogrudan "bu kisiyi engelle"
  // ozelligi - frontend karsi tarafin telefon numarasini BILMEDIGI
  // icin (Bolum 8, "numara asla client'a sizmaz"), telefon yerine
  // threadId uzerinden calisir. Backend, thread'e bakarak karsi
  // tarafin userId'sini kendi cozup dogrudan Block kaydi olusturur -
  // hicbir zaman telefon numarasina donus yapmaz.
  async blockThreadCounterpart(threadId: string, requestingUserId: string): Promise<void> {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      select: { initiatorUserId: true, recipientUserId: true },
    });

    if (!thread) {
      return;
    }

    const counterpartUserId =
      thread.initiatorUserId === requestingUserId
        ? thread.recipientUserId
        : thread.initiatorUserId;

    if (!counterpartUserId || counterpartUserId === requestingUserId) {
      return;
    }

    await this.prisma.block.upsert({
      where: {
        blockerUserId_blockedUserId: {
          blockerUserId: requestingUserId,
          blockedUserId: counterpartUserId,
        },
      },
      update: { type: "manual", reasonCode: BLOCK_REASON_CODES.UNWANTED_CONTACT },
      create: {
        blockerUserId: requestingUserId,
        blockedUserId: counterpartUserId,
        type: "manual",
        // Kullanici istegi: "Blokla" eylemi dogrudan bu kisiyle
        // ARTIK iletisim istemedigi anlamina gelir - blok aksiyonuna
        // gore neden ZATEN belli, admin tekrar secmek zorunda degil.
        reasonCode: BLOCK_REASON_CODES.UNWANTED_CONTACT,
      },
    });

    await this.auditLog.log({
      eventType: "user_blocked",
      userId: requestingUserId,
      threadId,
      metadata: { blockedUserId: counterpartUserId },
    });

    // Kullanici istegi: blok gecmisi kalici olarak tutulur.
    await this.logBlockEvent(
      requestingUserId,
      counterpartUserId,
      "manual",
      BLOCK_REASON_CODES.UNWANTED_CONTACT
    );
  }

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
      update: { type: "manual" },
      create: {
        blockerUserId,
        blockedUserId: blockedUser.id,
        type: "manual",
      },
    });
  }

  // ThreadService bu metodu kullanarak "recipient, initiator'i
  // engellemis mi?" diye kontrol eder.
  // Kullanici istegi: sadece "bloklu mu" (true/false) degil, blogun
  // TIPINI (manual/toxic_pending/toxic_confirmed) ve suresini de
  // donerek, cagiran taraf DOGRU hata mesajini (orn. "sistem tarafindan
  // bloklandiniz" vs "bu kisi sizi engelledi") olusturabilsin.
  // ============================================================
  // Kullanici istegi: bloklama GECMISI kalici olarak tutulur - Block
  // satiri silinse bile BlockLog'daki kayit KALIR (unblockedAt
  // doldurulur, satir SILINMEZ).
  // ============================================================

  // Bir blok OLUSTUGUNDA (ya da tipi degistiginde, orn. pending'den
  // confirmed'a) cagrilir - acik (unblockedAt=null) bir kayit varsa
  // tipini gunceller, yoksa yeni bir kayit acar.
  async logBlockEvent(
    blockerUserId: string,
    blockedUserId: string,
    type: string,
    reasonCode?: string
  ): Promise<void> {
    // Kullanici istegi: sistem (toksik icerik) bloklari icin, blok
    // gecmisine otomatik olarak "Toksik Icerik" (kod "1") nedeni
    // atanir - kesin bilinen bir neden oldugu icin tahmine gerek yok.
    // Manuel bloklar icin cagiran taraf reasonCode'u ACIKCA gecirir
    // (orn. "Istenmeyen Iletisim").
    const isToxicType = type === "toxic_pending" || type === "toxic_confirmed";
    const resolvedReasonCode = isToxicType
      ? BLOCK_REASON_CODES.TOXIC_CONTENT
      : (reasonCode ?? undefined);
    const open = await this.prisma.blockLog.findFirst({
      where: { blockerUserId, blockedUserId, unblockedAt: null },
      orderBy: { blockedAt: "desc" },
    });
    if (open) {
      await this.prisma.blockLog.update({
        where: { id: open.id },
        data: {
          type: type as any,
          ...(resolvedReasonCode ? { reasonCode: resolvedReasonCode } : {}),
        },
      });
    } else {
      await this.prisma.blockLog.create({
        data: {
          blockerUserId,
          blockedUserId,
          type: type as any,
          reasonCode: resolvedReasonCode ?? null,
        },
      });
    }
  }

  // Bir blok HERHANGI BIR NEDENLE (onay, sure dolmasi, elle kaldirma)
  // KALKINCA cagrilir - acik kaydi "kapatir" (unblockedAt doldurulur).
  async logBlockRemoved(blockerUserId: string, blockedUserId: string): Promise<void> {
    const open = await this.prisma.blockLog.findFirst({
      where: { blockerUserId, blockedUserId, unblockedAt: null },
      orderBy: { blockedAt: "desc" },
    });
    if (open) {
      await this.prisma.blockLog.update({
        where: { id: open.id },
        data: { unblockedAt: new Date() },
      });
    }
  }

  // Kullanici istegi: TUM bloklama gecmisini (aktif + gecmis), en
  // yeni EN USTTE olacak sekilde, kim/sistem bilgisiyle ve HER
  // KAYITTA bloklanan kisinin O ANA KADAR kac kez bloklandigini
  // (kumulatif sayac) gostererek listeler.
  async listBlockHistory() {
    const [logs, reasonCodes] = await Promise.all([
      this.prisma.blockLog.findMany({
        orderBy: { blockedAt: "desc" },
        include: {
          blocker: { select: { phoneNumberEncrypted: true, displayName: true } },
          blocked: { select: { phoneNumberEncrypted: true, displayName: true } },
        },
      }),
      // Kullanici istegi: blok gecmisine de neden kodu aciklamasi
      // eklenir.
      this.prisma.systemCode.findMany({ where: { category: "block_reason" } }),
    ]);
    const reasonDescriptionByCode = new Map(reasonCodes.map((r) => [r.code, r.description]));

    // Kumulatif sayaci hesaplamak icin ESKIDEN YENIYE dogru isliyoruz.
    const chronological = [...logs].reverse();
    const cumulativeCountByBlockedUser = new Map<string, number>();
    const cumulativeAtLogId = new Map<string, number>();
    for (const log of chronological) {
      const next = (cumulativeCountByBlockedUser.get(log.blockedUserId) ?? 0) + 1;
      cumulativeCountByBlockedUser.set(log.blockedUserId, next);
      cumulativeAtLogId.set(log.id, next);
    }

    return logs.map((log) => {
      const isSystemBlock = log.type === "toxic_pending" || log.type === "toxic_confirmed";
      const isAdminManualBlock = log.type === "admin_manual";
      return {
        id: log.id,
        type: log.type,
        blockerDisplayName: isAdminManualBlock
          ? "Admin"
          : isSystemBlock
            ? "Sistem"
            : log.blocker.displayName,
        blockerPhone: isSystemBlock || isAdminManualBlock
          ? null
          : log.blocker.phoneNumberEncrypted
            ? decryptReversible(log.blocker.phoneNumberEncrypted)
            : null,
        blockedDisplayName: log.blocked.displayName,
        blockedPhone: log.blocked.phoneNumberEncrypted
          ? decryptReversible(log.blocked.phoneNumberEncrypted)
          : null,
        blockedAt: log.blockedAt,
        unblockedAt: log.unblockedAt,
        cumulativeCount: cumulativeAtLogId.get(log.id) ?? 1,
        // Kullanici istegi: blok nedeni - kod + aciklamasi birlikte
        // (mevcut kayitlar icin tahmini olarak doldurulmustur).
        reasonCode: log.reasonCode,
        reasonDescription: log.reasonCode
          ? (reasonDescriptionByCode.get(log.reasonCode) ?? log.reasonCode)
          : null,
      };
    });
  }

  async isBlocked(blockerUserId: string, blockedUserId: string) {
    return this.prisma.block.findUnique({
      where: {
        blockerUserId_blockedUserId: { blockerUserId, blockedUserId },
      },
      include: { blocked: { select: { toxicViolationCount: true } } },
    });
  }

  // Kullanici istegi: bir kisi mesaj alip gonderen kisiyi bloklamis
  // olsa bile, o mesajlara /ayarlar'dan erisebilsin - isterse
  // sonradan yanit verebilsin (yanit verince blok otomatik kalkar,
  // bkz. ThreadService.sendMessage).

  // Kullanici istegi: yonetim panelinde, sistemdeki TUM blok
  // kayitlarini (kim kimi bloklamis, telefon numaralariyla) gorme -
  // gerekirse admin olarak dogrudan kaldirabilme.
  async listAllBlocksForAdmin() {
    const [blocks, reasonCodes] = await Promise.all([
      this.prisma.block.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          blocker: { select: { id: true, phoneNumberEncrypted: true, displayName: true } },
          blocked: { select: { id: true, phoneNumberEncrypted: true, displayName: true } },
        },
      }),
      // Kullanici istegi: blok nedeni KOD olarak tutuluyor - aciklamasi
      // icin "block_reason" kategorisindeki tum kodlar cekilir.
      this.prisma.systemCode.findMany({ where: { category: "block_reason" } }),
    ]);
    const reasonDescriptionByCode = new Map(reasonCodes.map((r) => [r.code, r.description]));

    return blocks.map((b) => {
      // Kullanici istegi: sistem tarafindan (toksik icerik nedeniyle)
      // konulan bloklarda, "Bloklayan" olarak GERCEK kisi yerine
      // "Sistem" gosterilir - bu bir KISISEL tercih degil, otomatik
      // bir guvenlik onlemidir. Admin'in telefon numarasiyla ELLE
      // ekledigi bloklarda ise "Admin" gosterilir.
      const isSystemBlock = b.type === "toxic_pending" || b.type === "toxic_confirmed";
      const isAdminManualBlock = b.type === "admin_manual";
      return {
        blockId: b.id,
        type: b.type,
        expiresAt: b.expiresAt,
        blockerPhone: isSystemBlock || isAdminManualBlock
          ? null
          : b.blocker.phoneNumberEncrypted
            ? decryptReversible(b.blocker.phoneNumberEncrypted)
            : null,
        blockerDisplayName: isAdminManualBlock
          ? "Admin"
          : isSystemBlock
            ? "Sistem"
            : b.blocker.displayName,
        blockedPhone: b.blocked.phoneNumberEncrypted
          ? decryptReversible(b.blocked.phoneNumberEncrypted)
          : null,
        blockedDisplayName: b.blocked.displayName,
        createdAt: b.createdAt,
        // Kullanici istegi: blok nedeni - kod + aciklamasi birlikte.
        reasonCode: b.reasonCode,
        reasonDescription: b.reasonCode
          ? (reasonDescriptionByCode.get(b.reasonCode) ?? b.reasonCode)
          : null,
      };
    });
  }

  // Kullanici istegi: admin, bir blogu dogrudan (taraflardan biri
  // mesaj atmayi beklemeden) kaldirabilsin.
  // Kullanici istegi: admin, bir bloga neden KODU atayabilir/degistirebilir
  // (Sistem Ayarlari > Kod Tanimlari ekranindan yonetilen sabit kod
  // listesinden).
  async setBlockReason(blockId: string, reasonCode: string | null): Promise<void> {
    await this.prisma.block.update({
      where: { id: blockId },
      data: { reasonCode: reasonCode || null },
    });
  }

  async removeBlockAsAdmin(blockId: string): Promise<void> {
    // Kullanici istegi: silmeden ONCE blok kaydini oku (blocker/blocked
    // ID'lerini almak icin) - blok gecmisi kaydinin kapatilmasi
    // (unblockedAt) icin gerekli.
    const block = await this.prisma.block.findUnique({ where: { id: blockId } });
    await this.prisma.block.delete({ where: { id: blockId } }).catch(() => {});
    if (block) {
      await this.logBlockRemoved(block.blockerUserId, block.blockedUserId);
    }
  }

  // Kullanici istegi: test surecinde birikmis TUM blok kayitlarini
  // tek seferde temizleme - temiz bir baslangic noktasi icin.
  async clearAllBlocks(): Promise<number> {
    // Kullanici istegi: silmeden ONCE TUM bloklari oku - her biri icin
    // blok gecmisi kaydini kapatmak (unblockedAt) gerekiyor.
    const allBlocks = await this.prisma.block.findMany();
    const result = await this.prisma.block.deleteMany({});
    for (const block of allBlocks) {
      await this.logBlockRemoved(block.blockerUserId, block.blockedUserId);
    }
    return result.count;
  }

  // Kullanici istegi: /ayarlar > Bloklanmis Mesajlar listesinden,
  // konusmaya girip mesaj atmadan da dogrudan blogu kaldirabilme.
  async unblockThreadCounterpart(threadId: string, requestingUserId: string): Promise<void> {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      select: { initiatorUserId: true, recipientUserId: true },
    });
    if (!thread) return;

    const counterpartUserId =
      thread.initiatorUserId === requestingUserId
        ? thread.recipientUserId
        : thread.initiatorUserId;
    if (!counterpartUserId) return;

    await this.prisma.block
      .delete({
        where: {
          blockerUserId_blockedUserId: {
            blockerUserId: requestingUserId,
            blockedUserId: counterpartUserId,
          },
        },
      })
      .catch(() => {}); // Blok kaydi yoksa sessizce gec.

    // Kullanici istegi: blok gecmisi kalici olarak tutulur.
    await this.logBlockRemoved(requestingUserId, counterpartUserId);

    // Kullanici istegi: blok kaldirilinca karsi tarafa bildirim
    // gonderilir - "PUSH_NOTIFICATIONS_ENABLED" parametresine gore
    // calisir (notifyUser bunu zaten kendi icinde kontrol ediyor).
    await this.notifications
      .notifyUser(
        counterpartUserId,
        "Engel Kaldırıldı",
        "Seni engelleyen kişi artık seninle mesajlaşabilir.",
        "/mesajlarim"
      )
      .catch(() => {});
  }

  async listBlockedThreadsForUser(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerUserId: userId },
      select: { blockedUserId: true },
    });
    const blockedUserIds = blocks.map((b) => b.blockedUserId);
    if (blockedUserIds.length === 0) return [];

    const threads = await this.prisma.messageThread.findMany({
      where: {
        OR: [
          { initiatorUserId: userId, recipientUserId: { in: blockedUserIds } },
          { recipientUserId: userId, initiatorUserId: { in: blockedUserIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        initiatorUserId: true,
        recipientUserId: true,
        recipientRevealedAt: true,
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { body: true },
        },
      },
    });

    // Kullanici istegi (bug/tasarim duzeltmesi): ayni bloklanan kisiyle
    // birden fazla iletisim (thread) olabilir - orn. hem havuz eslesmesi
    // hem dogrudan mesaj. Liste THREAD bazinda degil, BLOKLANAN KISI
    // bazinda gosterilir - her bloklanan kisi icin SADECE EN SON
    // (en guncel) thread'i temsilci olarak alinir. threads zaten
    // createdAt DESC sirali oldugu icin, ilk rastlanan = en yeni olan.
    const latestThreadByBlockedPerson = new Map<string, (typeof threads)[number]>();
    for (const t of threads) {
      const blockedPersonId = t.initiatorUserId === userId ? t.recipientUserId : t.initiatorUserId;
      if (!blockedPersonId) continue;
      if (!latestThreadByBlockedPerson.has(blockedPersonId)) {
        latestThreadByBlockedPerson.set(blockedPersonId, t);
      }
    }

    return Array.from(latestThreadByBlockedPerson.values()).map((t) => {
      // Guvenlik (bug duzeltmesi): eger bu kisi ALICI ise ve mesaji
      // bloklamadan ONCE hic "Mesaji Goster"e basmadiysa (reveal-gate),
      // mesaj icerigi burada da ASLA gosterilmez - "mesaji hic
      // gormeden bloke etme" garantisi bu ekranda da gecerlidir.
      const isRecipient = t.initiatorUserId !== userId;
      const canShowBody = !isRecipient || !!t.recipientRevealedAt;

      return {
        threadId: t.id,
        createdAt: t.createdAt,
        firstMessageBody: canShowBody ? (t.messages[0]?.body ?? null) : null,
        // Frontend'in "mesajı görmeden bloke ettin" notu gosterebilmesi icin.
        wasNeverRevealed: isRecipient && !t.recipientRevealedAt,
      };
    });
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
      select: { initiatorUserId: true, recipientUserId: true },
    });

    if (thread) {
      // Kullanici istegi: bir konusma sikayet edildiginde, sikayet
      // eden kisi KARSI TARAFI otomatik olarak (Sikayet kodu ile)
      // bloklamis olur - "Blok Nedeni" ZATEN belli, admin ya da
      // kullanici tekrar sec mek zorunda degil.
      const counterpartUserId =
        thread.initiatorUserId === reporterUserId
          ? thread.recipientUserId
          : thread.initiatorUserId;
      if (counterpartUserId && counterpartUserId !== reporterUserId) {
        await this.prisma.block
          .upsert({
            where: {
              blockerUserId_blockedUserId: {
                blockerUserId: reporterUserId,
                blockedUserId: counterpartUserId,
              },
            },
            update: { reasonCode: BLOCK_REASON_CODES.REPORTED },
            create: {
              blockerUserId: reporterUserId,
              blockedUserId: counterpartUserId,
              type: "manual",
              reasonCode: BLOCK_REASON_CODES.REPORTED,
            },
          })
          .catch(() => {});
        await this.logBlockEvent(
          reporterUserId,
          counterpartUserId,
          "manual",
          BLOCK_REASON_CODES.REPORTED
        ).catch(() => {});
      }

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

    await this.auditLog.log({
      eventType: "thread_reported",
      userId: reporterUserId,
      threadId,
      metadata: { reason: reason ?? null },
    });

    return { reportId: report.id };
  }

  // Moderasyon kuyrugu: bekleyen (henuz incelenmemis) sikayetleri listeler.
  // Kullanici istegi: yonetim ekraninda baglam gorebilmek icin thread'in
  // ilk mesaj metnini de dahil ediyoruz (moderasyon amacli - normal
  // kullanicilarin gordugu API'lerde bu yapilmaz).
  // Kullanici istegi (revize): sikayetler sonuclandiginda SILINMEZ -
  // tum sikayetler (aktif + sonuclandirilmis) donulur, frontend'de
  // durumuna gore iki ayri tabloya bolunur (aktif ustte, sonuclanan
  // altta).
  async listAllReports() {
    const reports = await this.prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        threadId: true,
        reporterUserId: true,
        reason: true,
        status: true,
        resolutionNote: true,
        createdAt: true,
        resolvedAt: true,
        thread: {
          select: {
            messages: {
              orderBy: { createdAt: "asc" },
              take: 1,
              select: { body: true },
            },
          },
        },
      },
    });

    return reports.map((r) => ({
      id: r.id,
      threadId: r.threadId,
      reporterUserId: r.reporterUserId,
      reason: r.reason,
      status: r.status,
      resolutionNote: r.resolutionNote,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
      firstMessageBody: r.thread.messages[0]?.body ?? null,
    }));
  }

  // Kullanici istegi: sikayeti "incelendi" ya da "reddedildi" olarak
  // isaretleme - moderasyon kuyrugundan cikarir. Admin bir aciklama
  // (resolutionNote) girdiyse, bu aciklama sikayeti yapan kisiye,
  // ilgili thread icinde "YouHaveMi"den gelen bir SISTEM MESAJI olarak
  // gonderilir (senderUserId=null, isSystemMessage=true).
  async updateReportStatus(
    reportId: string,
    status: "reviewed" | "dismissed",
    resolutionNote?: string
  ): Promise<void> {
    const report = await this.prisma.report.update({
      where: { id: reportId },
      data: { status, resolutionNote: resolutionNote ?? null, resolvedAt: new Date() },
      select: { threadId: true },
    });

    if (resolutionNote && resolutionNote.trim()) {
      await this.prisma.message.create({
        data: {
          threadId: report.threadId,
          senderUserId: null,
          body: resolutionNote,
          isSystemMessage: true,
          isAnonymous: false,
        },
      });
    }
  }

  // Kullanici istegi: bir bloke yonetim ekrani icin - sikayet edilmis
  // (Bildir) kullanicilari, telefon numaralariyla birlikte listeler.
  // "Bildirilen" kisi, sikayeti YAPAN degil, o thread'deki KARSI
  // taraftir (sikayet genelde initiator'a - mesaji baslatana - karsi
  // yapilir, bkz. Report modeli/reportThread).
  async listReportedUsers() {
    const reports = await this.prisma.report.findMany({
      select: {
        id: true,
        status: true,
        thread: {
          select: { initiatorUserId: true },
        },
      },
    });

    // Kullanici basina sikayet sayisini topla (ayni kisi birden fazla
    // kez bildirilmis olabilir).
    const countsByUserId = new Map<string, { total: number; pending: number }>();
    for (const r of reports) {
      const targetUserId = r.thread.initiatorUserId;
      const current = countsByUserId.get(targetUserId) ?? { total: 0, pending: 0 };
      current.total += 1;
      if (r.status === "pending") current.pending += 1;
      countsByUserId.set(targetUserId, current);
    }

    const userIds = [...countsByUserId.keys()];
    if (userIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, phoneNumberEncrypted: true, status: true },
    });

    return users
      .map((u) => {
        const counts = countsByUserId.get(u.id)!;
        return {
          userId: u.id,
          phoneNumber: u.phoneNumberEncrypted ? decryptReversible(u.phoneNumberEncrypted) : null,
          status: u.status,
          totalReports: counts.total,
          pendingReports: counts.pending,
        };
      })
      .sort((a, b) => b.totalReports - a.totalReports);
  }

  // Kullanici istegi: gerekirse bloke edilebilsin - kullanicinin
  // hesabi askiya alinir (giris yapamaz, bkz. AuthService.verifyOtp).
  async suspendUser(userId: string, reasonCode?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Kullanici bulunamadi.");

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: "suspended", ...(reasonCode ? { suspensionReasonCode: reasonCode } : {}) },
    });

    await this.auditLog.log({
      eventType: "user_suspended_by_admin",
      userId,
    });
  }

  // Kullanici istegi: admin, sikayet listesinde OLMAYAN (henuz hic
  // raporlanmamis) bir kisiyi de, telefon numarasini elle girerek
  // dogrudan bloke/askiya alabilsin - orn. "kotu niyetli kullanim"
  // dusundugu bir kisi icin. Kisi sistemde hic kayitli degilse bile
  // (henuz uygulamayi hic kullanmamis olsa da), ileride kayit olursa
  // hesabinin ASKIYA ALINMIS baslamasi icin bir "golge" kullanici
  // olusturulur (blockThreadCounterpart'taki desenle AYNI).
  async suspendUserByPhone(
    phoneNumberRaw: string,
    reasonCode: string
  ): Promise<{ userId: string }> {
    // Kullanici istegi (bug duzeltmesi): giris akisindaki numara
    // formatiyla ("+905321234567", BOSLUKSUZ) TAM ESLESSIN diye,
    // admin panelinden gelen numara da BOSLUK/TIRE temizlenerek
    // normalize edilir - aksi halde hash ESLESMEZ ve kisi giris
    // yapabilmeye devam eder.
    const phoneNumber = phoneNumberRaw.replace(/[\s-]/g, "");
    const phoneHash = hashPhoneNumber(phoneNumber);
    // Kullanici istegi: admin ekraninda telefon numarasi GORUNTULENEBILSIN
    // diye (sadece arama icin kullanilan hash yeterli degil), sifreli
    // ama GERI DONDURULEBILIR halde de saklanir.
    const phoneEncrypted = encryptReversible(phoneNumber);
    const user = await this.prisma.user.upsert({
      where: { phoneNumberHash: phoneHash },
      update: {
        status: "suspended",
        suspensionReasonCode: reasonCode,
        phoneNumberEncrypted: phoneEncrypted,
      },
      create: {
        phoneNumberHash: phoneHash,
        phoneNumberEncrypted: phoneEncrypted,
        status: "suspended",
        suspensionReasonCode: reasonCode,
      },
    });

    // Kullanici istegi: elle bloke edilen kisi, HEMEN "Tum Bloklar"
    // listesinde de gorunsun. Gercek bir "bloklayan kisi" olmadigi
    // icin (bu bir HESAP duzeyinde kisitlama), kendi kendine (blocker
    // = blocked) bir Block kaydi olusturulur - listede "Admin"
    // olarak gosterilir (bkz. listAllBlocksForAdmin).
    await this.prisma.block.upsert({
      where: {
        blockerUserId_blockedUserId: { blockerUserId: user.id, blockedUserId: user.id },
      },
      update: { type: "admin_manual", reasonCode },
      create: {
        blockerUserId: user.id,
        blockedUserId: user.id,
        type: "admin_manual",
        reasonCode,
      },
    });
    await this.logBlockEvent(user.id, user.id, "admin_manual", reasonCode);

    await this.auditLog.log({
      eventType: "user_suspended_by_admin_via_phone",
      userId: user.id,
    });

    return { userId: user.id };
  }

  // Kullanici istegi: bloke geri alinabilsin.
  async reactivateUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Kullanici bulunamadi.");

    await this.prisma.user.update({ where: { id: userId }, data: { status: "active" } });

    await this.auditLog.log({
      eventType: "user_reactivated_by_admin",
      userId,
    });
  }

  // Kullanici istegi: bloke yonetim ekranindaki tablodan bir kaydi
  // (bu kullaniciya ait TUM sikayetleri) silme - kullanicinin hesabini
  // etkilemez (bloke/aktif durumu ayni kalir), sadece bu listeden
  // kalkar.
  async deleteReportsForUser(userId: string): Promise<void> {
    await this.prisma.report.deleteMany({
      where: { thread: { initiatorUserId: userId } },
    });

    await this.auditLog.log({
      eventType: "reports_deleted_by_admin",
      userId,
    });
  }
}
