import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

// Gorev 5.3: Katman 2 guard'i - JwtAuthGuard'dan (Katman 1, "sen kimsin")
// farkli olarak, bu guard "bu thread'e erismeye yetkin var mi" sorusuna
// bakar (Bolum 8). thread_access_token'in JWT_THREAD_ACCESS_SECRET ile
// imzalanmis olmasi VE icindeki threadId'nin, route'taki :id parametresiyle
// birebir eslesmesi gerekir - aksi halde biri baska bir thread icin aldigi
// token'i bu thread'e karsi kullanamaz.
@Injectable()
export class ThreadAccessGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Thread access token eksik.");
    }

    let payload: { threadId: string };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_THREAD_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException("Thread access token gecersiz veya suresi dolmus.");
    }

    const routeThreadId = request.params.id;
    if (payload.threadId !== routeThreadId) {
      // Token gecerli ama BASKA bir thread icin uretilmis - bu thread'e
      // erisim yetkisi yok (403, "kimligini biliyoruz ama izni yok").
      throw new ForbiddenException("Bu token bu thread icin gecerli degil.");
    }

    (request as any).threadId = payload.threadId;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
