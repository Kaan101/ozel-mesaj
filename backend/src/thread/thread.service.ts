import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../common/prisma.service";
import { SmsService } from "../sms/sms.service";
import { hashPhoneNumber } from "../common/hash.util";
import { compareSecret, hashSecret } from "../common/bcrypt.util";
import { CreateThreadDto } from "./dto/create-thread.dto";

@Injectable()
export class ThreadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly jwt: JwtService
  ) {}

  // Gorev 5.1: Alici telefonu + mesaj + kilit tipi alir, thread ve ilk
  // mesaji olusturur, aliciya bildirim SMS'i gonderir (Bolum 3, 9).
  async createThread(initiatorUserId: string, dto: CreateThreadDto) {
    const recipientPhoneHash = hashPhoneNumber(dto.recipientPhone);

    // Alici henuz sisteme hic girmemis olabilir - "numarasiz kimlik"
    // modeline uygun olarak onceden bir kullanici kaydi olusturuyoruz
    // (Bolum 8). Alici kendi OTP'siyle giris yaptiginda ayni kayda
    // (ayni phone_number_hash) baglanacak.
    const recipient = await this.prisma.user.upsert({
      where: { phoneNumberHash: recipientPhoneHash },
      update: {},
      create: { phoneNumberHash: recipientPhoneHash, status: "active" },
    });

    const lockSecretHash = await hashSecret(dto.lockSecret);

    const thread = await this.prisma.messageThread.create({
      data: {
        originType: "direct",
        initiatorUserId,
        recipientUserId: recipient.id,
        lockType: dto.lockType,
        lockSecretHash,
        questionText: dto.lockType === "question" ? dto.questionText : null,
        messages: {
          create: [
            {
              senderUserId: initiatorUserId,
              body: dto.body,
              isAnonymous: dto.isAnonymous,
            },
          ],
        },
      },
    });

    // Aliciya bildirim SMS'i - OTP kodu degil, sadece "sana mesaj var" bilgisi.
    const appUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const text = `Sana ozel bir mesaj var. Gormek icin: ${appUrl}/mesaj/${thread.id}`;
    await this.sms.send(dto.recipientPhone, text);

    return { threadId: thread.id };
  }

  // Gorev 5.2: Katman 2 (Authorization) - "dogru kisi olmak" yetmez,
  // "dogru bilgiyi bilmek" de gerekir (Bolum 8). Dogru parola/cevap
  // girilirse, sadece bu thread'e ozel, kisa omurlu bir token uretilir.
  async unlockThread(
    threadId: string,
    secret: string
  ): Promise<{ threadAccessToken: string }> {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException("Thread bulunamadi.");
    }

    const isMatch = await compareSecret(secret, thread.lockSecretHash);
    if (!isMatch) {
      throw new UnauthorizedException("Parola/cevap hatali.");
    }

    const threadAccessToken = await this.jwt.signAsync(
      { threadId: thread.id },
      {
        secret: process.env.JWT_THREAD_ACCESS_SECRET,
        expiresIn: process.env.JWT_THREAD_ACCESS_EXPIRES_IN ?? "10m",
      }
    );

    return { threadAccessToken };
  }
}
