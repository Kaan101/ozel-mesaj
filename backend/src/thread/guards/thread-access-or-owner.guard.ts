import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { PrismaService } from "../../common/prisma.service";

// Kullanici geri bildirimi: thread'i OLUSTURAN kisi (initiator), kendi
// belirledigi parolayi/cevabi bilerek zaten kanitlamis sayilir - kendi
// gonderdigi mesaji tekrar tekrar "acmak" icin ayni bilgiyi yeniden
// girmesini istemek gereksiz surtunme yaratiyordu. Bu guard, iki yoldan
// biriyle erisime izin verir:
//  1) Gecerli bir thread_access_token (bilgiye dayali - Bolum 8, mevcut
//     ThreadAccessGuard davranisi, ozellikle ALICI icin hala gerekli).
//  2) Gecerli bir Katman 1 access_token VE bu kullanicinin thread'i
//     olusturan (initiator) kisi olmasi.
@Injectable()
export class ThreadAccessOrOwnerGuard implements CanActivate {
  private readonly logger = new Logger(ThreadAccessOrOwnerGuard.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const routeThreadId = request.params.id;
    const token = this.extractToken(request);

    this.logger.log(`GIRIS: routeThreadId=${routeThreadId}, token var mi=${!!token}`);

    if (!token) {
      throw new UnauthorizedException("Yetkilendirme bilgisi eksik.");
    }

    // 1) Once thread_access_token olarak dogrulamayi dene.
    try {
      const payload = await this.jwt.verifyAsync<{ threadId: string }>(token, {
        secret: process.env.JWT_THREAD_ACCESS_SECRET,
      });
      this.logger.log(`Adim 1 basarili: payload.threadId=${payload.threadId}`);
      if (payload.threadId === routeThreadId) {
        (request as any).threadId = routeThreadId;
        return true;
      }
    } catch (err) {
      this.logger.log(`Adim 1 (thread_access_token) basarisiz: ${(err as Error).message}`);
    }

    // 2) Katman 1 (kullanici kimligi) token'i olarak dogrulamayi dene -
    // sadece thread'i olusturan kisi icin gecerli.
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      this.logger.log(`Adim 2: token dogrulandi, sub=${payload.sub}`);

      const thread = await this.prisma.messageThread.findUnique({
        where: { id: routeThreadId },
        select: { initiatorUserId: true },
      });
      this.logger.log(
        `Adim 2: thread initiatorUserId=${thread?.initiatorUserId}, sub=${payload.sub}, esit_mi=${thread?.initiatorUserId === payload.sub}`
      );

      if (thread && thread.initiatorUserId === payload.sub) {
        (request as any).threadId = routeThreadId;
        (request as any).user = payload;
        return true;
      }
    } catch (err) {
      this.logger.log(`Adim 2 (Katman 1 + sahiplik) basarisiz: ${(err as Error).message}`);
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
