import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Gorev 8.1: Kullanici profilini doner. Telefon numarasi/hash'i
  // ASLA response'a dahil edilmez (Bolum 8, 10).
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("Kullanici bulunamadi.");
    }

    return {
      id: user.id,
      displayName: user.displayName,
      avatarAgeGender: user.avatarAgeGender,
      avatarHairLength: user.avatarHairLength,
      avatarHasGlasses: user.avatarHasGlasses,
      status: user.status,
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
    };
  }

  // Gorev 8.2 (genisletildi): displayName ve avatar tercihleri
  // guncellenebilir (Bolum 9). Avatar gercek kimlik tasimaz, sadece
  // gorsel bir secim.
  async updateProfile(
    userId: string,
    updates: {
      displayName?: string;
      avatarAgeGender?: string;
      avatarHairLength?: string;
      avatarHasGlasses?: boolean;
    }
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    return {
      id: user.id,
      displayName: user.displayName,
      avatarAgeGender: user.avatarAgeGender,
      avatarHairLength: user.avatarHairLength,
      avatarHasGlasses: user.avatarHasGlasses,
    };
  }

  // Gorev 8.3: KVKK kapsaminda hesap/veri silme talebi - HARD-DELETE,
  // soft-delete degil (Bolum 10). Kullanicinin dahil oldugu tum
  // thread'ler (initiator veya recipient olarak) ve mesajlar, sahip
  // olduğu pool_entries, block/report kayitlari da silinir - foreign
  // key kisitlarini (ON DELETE RESTRICT) karsilamak icin dogru sirada.
  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.report.deleteMany({ where: { reporterUserId: userId } });
      await tx.block.deleteMany({
        where: { OR: [{ blockerUserId: userId }, { blockedUserId: userId }] },
      });

      const threads = await tx.messageThread.findMany({
        where: { OR: [{ initiatorUserId: userId }, { recipientUserId: userId }] },
        select: { id: true },
      });
      const threadIds = threads.map((t) => t.id);

      if (threadIds.length > 0) {
        await tx.message.deleteMany({ where: { threadId: { in: threadIds } } });
        await tx.messageThread.deleteMany({ where: { id: { in: threadIds } } });
      }

      await tx.poolEntry.deleteMany({ where: { ownerUserId: userId } });

      await tx.user.delete({ where: { id: userId } });
    });
  }
}
