import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

// Gorev 3.6: Katman 1 (Authentication) guard'i - korumali route'lara
// takilir, Authorization: Bearer <access_token> header'ini dogrular.
// Bolum 8'deki "Bu numara gercekten sana mi ait?" sorusunun HTTP
// seviyesindeki karsiligi budur.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Access token eksik.");
    }

    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      // Sonraki handler'larda req.user olarak erisilebilir olsun.
      (request as any).user = payload;
    } catch {
      throw new UnauthorizedException("Access token gecersiz veya suresi dolmus.");
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
