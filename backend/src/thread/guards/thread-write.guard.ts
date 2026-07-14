import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { PrismaService } from "../../common/prisma.service";

// Yanit gonderme (POST /threads/:id/messages) icin: Katman 1 (kimlik)
// HER ZAMAN zorunlu (senderUserId icin). Thread'e "yazma yetkisi" ise
// ya X-Thread-Access-Token (bilgiye dayali - alici icin) ya da
// kullanicinin thread'i olusturan kisi olmasi (sahiplik - initiator
// icin, tekrar parola girmeden yanit yazabilsin) ile saglanir.
@Injectable()
export class ThreadWriteGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const routeThreadId = request.params.id;

    // 1) Katman 1 kimligi HER ZAMAN gerekli (senderUserId icin).
    const [type, accessToken] = request.headers.authorization?.split(" ") ?? [];
    if (type !== "Bearer" || !accessToken) {
      throw new UnauthorizedException("Access token eksik.");
    }

    let userId: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(accessToken, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      userId = payload.sub;
      (request as any).user = payload;
    } catch {
      throw new UnauthorizedException("Access token gecersiz veya suresi dolmus.");
    }

    // 2) Thread'e yazma yetkisi: once X-Thread-Access-Token dene.
    const threadToken = request.headers["x-thread-access-token"];
    if (typeof threadToken === "string") {
      try {
        const payload = await this.jwt.verifyAsync<{ threadId: string }>(threadToken, {
          secret: process.env.JWT_THREAD_ACCESS_SECRET,
        });
        if (payload.threadId === routeThreadId) {
          return true;
        }
      } catch {
        // Gecersiz thread token - asagida sahiplik kontrolune dus.
      }
    }

    // 3) X-Thread-Access-Token yoksa/gecersizse, kullanici bu thread'i
    // olusturan kisi mi kontrol et (sahiplik - Bolum 8 UX istisnasi).
    // Ayrica lockType "none" ise (kilitsiz mesaj) recipient de dahil.
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: routeThreadId },
      select: { initiatorUserId: true, recipientUserId: true, lockType: true },
    });

    if (thread && thread.initiatorUserId === userId) {
      return true;
    }

    if (
      thread &&
      thread.lockType === "none" &&
      (thread.initiatorUserId === userId || thread.recipientUserId === userId)
    ) {
      return true;
    }

    // 4) Ya da bu kullanici bu thread'i daha once basariyla actiysa
    // (kalici ThreadUnlock kaydi), tekrar thread token'a gerek yok.
    const priorUnlock = await this.prisma.threadUnlock.findUnique({
      where: { threadId_userId: { threadId: routeThreadId, userId } },
    });

    if (priorUnlock) {
      return true;
    }

    throw new UnauthorizedException("Bu thread'e yazma yetkiniz yok.");
  }
}
