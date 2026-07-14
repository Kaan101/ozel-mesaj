import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { PrismaService } from "../../common/prisma.service";

// Kullanici geri bildirimi: thread'i OLUSTURAN kisi (initiator), kendi
// belirledigi parolayi/cevabi bilerek zaten kanitlamis sayilir - kendi
// gonderdigi mesaji tekrar tekrar "acmak" icin ayni bilgiyi yeniden
// girmesini istemek gereksiz surtunme yaratiyordu. Ayni sekilde, bir
// ALICI da bir kez dogru parolayi/cevabi girdiyse, bir daha (cikis
// yapsa/tarayici kapatsa bile) tekrar sorulmamali. Ayrica lockType
// "none" olan (kilitsiz - Ona Mesaj Gonder akisinda alici zaten
// bilindigi icin kilit zorunlu degil) thread'lerde HER IKI taraf da
// (initiator VE recipient) direkt erisebilir. Bu guard, dort yoldan
// biriyle erisime izin verir:
//  1) Gecerli bir thread_access_token (bilgiye dayali - kisa omurlu).
//  2) Gecerli bir Katman 1 access_token VE bu kullanicinin thread'i
//     olusturan (initiator) kisi olmasi.
//  3) Gecerli bir Katman 1 access_token VE bu kullanicinin bu thread'i
//     daha once basariyla actigina dair kalici bir kayit (ThreadUnlock)
//     olmasi.
//  4) Thread'in lockType'i "none" ise VE kullanici bu thread'in
//     initiator VEYA recipient'i ise.
@Injectable()
export class ThreadAccessOrOwnerGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const routeThreadId = request.params.id;
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Yetkilendirme bilgisi eksik.");
    }

    // 1) Once thread_access_token olarak dogrulamayi dene.
    try {
      const payload = await this.jwt.verifyAsync<{ threadId: string }>(token, {
        secret: process.env.JWT_THREAD_ACCESS_SECRET,
      });
      if (payload.threadId === routeThreadId) {
        (request as any).threadId = routeThreadId;
        return true;
      }
    } catch {
      // Bu bir thread_access_token degilmis - asagida Katman 1 olarak dene.
    }

    // 2) + 3) + 4) Katman 1 (kullanici kimligi) token'i olarak
    // dogrulamayi dene.
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      const thread = await this.prisma.messageThread.findUnique({
        where: { id: routeThreadId },
        select: { initiatorUserId: true, recipientUserId: true, lockType: true },
      });

      if (!thread) {
        throw new UnauthorizedException("Bu thread'e erisim yetkiniz yok.");
      }

      const isParticipant =
        thread.initiatorUserId === payload.sub || thread.recipientUserId === payload.sub;

      if (thread.initiatorUserId === payload.sub) {
        (request as any).threadId = routeThreadId;
        (request as any).user = payload;
        return true;
      }

      if (thread.lockType === "none" && isParticipant) {
        (request as any).threadId = routeThreadId;
        (request as any).user = payload;
        return true;
      }

      const priorUnlock = await this.prisma.threadUnlock.findUnique({
        where: { threadId_userId: { threadId: routeThreadId, userId: payload.sub } },
      });

      if (priorUnlock) {
        (request as any).threadId = routeThreadId;
        (request as any).user = payload;
        return true;
      }
    } catch {
      // Ne thread_access_token ne de gecerli bir Katman 1 token - reddet.
    }

    throw new UnauthorizedException("Bu thread'e erisim yetkiniz yok.");
  }

  private extractToken(request: Request): string | undefined {
    const customHeaderToken = request.headers["x-thread-access-token"];
    if (typeof customHeaderToken === "string") {
      return customHeaderToken;
    }

    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
