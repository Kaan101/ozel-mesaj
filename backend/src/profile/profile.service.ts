import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

// Kullanici istegi: mesajlastigin kisinin avatarina tiklayinca acilan
// kisisellestirilmis profil sayfasi - kullanici kendi bilgi
// kalemlerini (etiket+deger) ekler/duzenler/siler, her birini AYRI
// AYRI public ya da private yapabilir. Baskasinin profilini SADECE
// onunla en az bir konusma (MessageThread) paylasan kisiler gorebilir
// - rastgele profil "tarama"sini engellemek icin.
@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  // Kullanici istegi: kendi profil DUZENLEME ekrani icin - TUM
  // alanlar (public+private) doner.
  async getMyFields(userId: string) {
    return this.prisma.profileField.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    });
  }

  async addField(userId: string, label: string, value: string, visibility: string) {
    const last = await this.prisma.profileField.findFirst({
      where: { userId },
      orderBy: { sortOrder: "desc" },
    });
    return this.prisma.profileField.create({
      data: {
        userId,
        label: label.trim(),
        value: value.trim(),
        visibility: visibility === "public" ? "public" : "private",
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateField(
    userId: string,
    fieldId: string,
    data: { label?: string; value?: string; visibility?: string }
  ) {
    // Kullanici istegi: bir kullanici SADECE KENDI alanini
    // guncelleyebilir - baskasinin profil alanini degistiremez.
    const field = await this.prisma.profileField.findUnique({ where: { id: fieldId } });
    if (!field || field.userId !== userId) {
      throw new ForbiddenException("Bu profil alanını düzenleme yetkin yok.");
    }
    return this.prisma.profileField.update({
      where: { id: fieldId },
      data: {
        ...(data.label !== undefined ? { label: data.label.trim() } : {}),
        ...(data.value !== undefined ? { value: data.value.trim() } : {}),
        ...(data.visibility !== undefined
          ? { visibility: data.visibility === "public" ? "public" : "private" }
          : {}),
      },
    });
  }

  async deleteField(userId: string, fieldId: string): Promise<void> {
    const field = await this.prisma.profileField.findUnique({ where: { id: fieldId } });
    if (!field || field.userId !== userId) {
      throw new ForbiddenException("Bu profil alanını silme yetkin yok.");
    }
    await this.prisma.profileField.delete({ where: { id: fieldId } });
  }

  // Kullanici istegi: profil DUZENLEME ekraninda, kullanicinin havuz
  // sorularina verdigi TUM yanitlari (soru metniyle birlikte) listeler
  // - her birinin gorunurlugu (public/private) burada degistirilebilir.
  async getMyPoolAnswers(userId: string) {
    const attempts = await this.prisma.poolAttempt.findMany({
      where: { attempterUserId: userId, hiddenByOwner: false },
      orderBy: { createdAt: "desc" },
      include: {
        poolEntry: { select: { id: true, title: true, questionText: true } },
      },
    });
    return attempts.map((a) => ({
      id: a.id,
      questionTitle: a.poolEntry.title,
      questionText: a.poolEntry.questionText,
      answerText: a.answerText,
      visibility: a.profileVisibility,
      createdAt: a.createdAt,
    }));
  }

  async updatePoolAnswerVisibility(
    userId: string,
    attemptId: string,
    visibility: string
  ): Promise<void> {
    const attempt = await this.prisma.poolAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.attempterUserId !== userId) {
      throw new ForbiddenException("Bu yanıtın görünürlüğünü değiştirme yetkin yok.");
    }
    await this.prisma.poolAttempt.update({
      where: { id: attemptId },
      data: { profileVisibility: visibility === "public" ? "public" : "private" },
    });
  }

  // Kullanici istegi: baskasinin profilini goruntuleme - SADECE
  // PUBLIC alanlar doner, VE goruntuleyen kisi hedefle en az bir
  // konusma paylasmiyorsa erisim reddedilir.
  async getPublicProfile(viewerUserId: string, targetUserId: string) {
    if (viewerUserId !== targetUserId) {
      const sharedThread = await this.prisma.messageThread.findFirst({
        where: {
          OR: [
            { initiatorUserId: viewerUserId, recipientUserId: targetUserId },
            { initiatorUserId: targetUserId, recipientUserId: viewerUserId },
          ],
        },
      });
      if (!sharedThread) {
        throw new ForbiddenException(
          "Bu profili görüntülemek için bu kişiyle bir konuşman olması gerekiyor."
        );
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, displayName: true, showAvatar: true, avatarId: true, avatarConfig: true },
    });
    if (!user) throw new NotFoundException("Kullanıcı bulunamadı.");

    const fields = await this.prisma.profileField.findMany({
      where: { userId: targetUserId, visibility: "public" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true, value: true },
    });

    // Kullanici istegi: profili goruntuleyen kisi, hedefin PUBLIC
    // isaretledigi havuz soru-yanit ciftlerini de gorsun.
    const poolAnswers = await this.prisma.poolAttempt.findMany({
      where: {
        attempterUserId: targetUserId,
        profileVisibility: "public",
        hiddenByOwner: false,
      },
      orderBy: { createdAt: "desc" },
      include: {
        poolEntry: { select: { id: true, title: true, questionText: true } },
      },
    });

    return {
      displayName: user.showAvatar ? user.displayName : null,
      avatarId: user.showAvatar ? user.avatarId : null,
      avatarConfig: user.showAvatar ? user.avatarConfig : null,
      fields,
      poolAnswers: poolAnswers.map((a) => ({
        id: a.id,
        questionTitle: a.poolEntry.title,
        questionText: a.poolEntry.questionText,
        answerText: a.answerText,
      })),
    };
  }
}
