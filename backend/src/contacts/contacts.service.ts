import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { hashPhoneNumber } from "../common/hash.util";
import { encryptReversible, decryptReversible } from "../common/encryption.util";

// Kullanici istegi: Rehber - gonderdigin her numara otomatik
// kaydedilir, karsi taraf yanit verirse (biliniyorsa) avatar/nickname'i
// de eklenir, elle not eklenebilir/duzenlenebilir/silinebilir.
@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async listContacts(ownerUserId: string) {
    const contacts = await this.prisma.contact.findMany({
      where: { ownerUserId },
      orderBy: { updatedAt: "desc" },
    });
    return contacts.map((c) => ({
      id: c.id,
      phoneNumber: decryptReversible(c.phoneNumberEncrypted),
      note: c.note,
      contactAvatarId: c.contactAvatarId,
      contactAvatarConfig: c.contactAvatarConfig,
      contactDisplayName: c.contactDisplayName,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  // Kullanici istegi: bir numaraya mesaj gonderince, o numara otomatik
  // rehbere eklenir (zaten varsa dokunulmaz - not/nickname korunur).
  async upsertContactFromOutgoingMessage(ownerUserId: string, phoneNumber: string): Promise<void> {
    const phoneNumberHash = hashPhoneNumber(phoneNumber);
    const existing = await this.prisma.contact.findUnique({
      where: { ownerUserId_phoneNumberHash: { ownerUserId, phoneNumberHash } },
    });
    if (existing) return;

    await this.prisma.contact
      .create({
        data: {
          ownerUserId,
          phoneNumberHash,
          phoneNumberEncrypted: encryptReversible(phoneNumber),
        },
      })
      .catch(() => {}); // Yarisda bir yerde ayni anda olusmus olabilir - sessizce gec.
  }

  // Kullanici istegi: karsi taraf yanit verirse, GORUNEN avatar/nickname
  // bilgisi (hangisi varsa) rehbere kaydedilir/guncellenir.
  async updateContactFromReply(
    ownerUserId: string,
    phoneNumber: string,
    info: { avatarId: string | null; avatarConfig: unknown; displayName: string | null }
  ): Promise<void> {
    const phoneNumberHash = hashPhoneNumber(phoneNumber);
    const existing = await this.prisma.contact.findUnique({
      where: { ownerUserId_phoneNumberHash: { ownerUserId, phoneNumberHash } },
    });

    const updateData = {
      ...(info.avatarId ? { contactAvatarId: info.avatarId } : {}),
      ...(info.avatarConfig ? { contactAvatarConfig: info.avatarConfig as any } : {}),
      ...(info.displayName ? { contactDisplayName: info.displayName } : {}),
    };
    // Hicbir yeni bilgi yoksa (hepsi gizliyse) dokunmaya gerek yok.
    if (Object.keys(updateData).length === 0) return;

    if (existing) {
      await this.prisma.contact.update({ where: { id: existing.id }, data: updateData });
    } else {
      await this.prisma.contact
        .create({
          data: {
            ownerUserId,
            phoneNumberHash,
            phoneNumberEncrypted: encryptReversible(phoneNumber),
            ...updateData,
          },
        })
        .catch(() => {});
    }
  }

  // Kullanici istegi: rehbere elle kisi ekleme (numara + opsiyonel not).
  async addContact(ownerUserId: string, phoneNumber: string, note?: string) {
    const phoneNumberHash = hashPhoneNumber(phoneNumber);
    return this.prisma.contact.upsert({
      where: { ownerUserId_phoneNumberHash: { ownerUserId, phoneNumberHash } },
      update: { note: note ?? undefined },
      create: {
        ownerUserId,
        phoneNumberHash,
        phoneNumberEncrypted: encryptReversible(phoneNumber),
        note: note ?? null,
      },
    });
  }

  // Kullanici istegi: rehber kaydini guncelleyebilme (not, gerekirse
  // numara).
  async updateContact(
    ownerUserId: string,
    contactId: string,
    updates: { note?: string; phoneNumber?: string }
  ) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.ownerUserId !== ownerUserId) {
      throw new NotFoundException("Kişi bulunamadı.");
    }

    const data: any = {};
    if (updates.note !== undefined) data.note = updates.note;
    if (updates.phoneNumber) {
      data.phoneNumberHash = hashPhoneNumber(updates.phoneNumber);
      data.phoneNumberEncrypted = encryptReversible(updates.phoneNumber);
    }

    return this.prisma.contact.update({ where: { id: contactId }, data });
  }

  // Kullanici istegi: rehberden kisi silebilme.
  async deleteContact(ownerUserId: string, contactId: string): Promise<void> {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.ownerUserId !== ownerUserId) {
      throw new NotFoundException("Kişi bulunamadı.");
    }
    await this.prisma.contact.delete({ where: { id: contactId } });
  }
}
