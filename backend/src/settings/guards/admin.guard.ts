import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";

// Henuz bir rol/yetki sistemimiz olmadigi icin (Faz 2'de eklenebilir),
// yonetim ekranini basit ama etkili bir yontemle koruyoruz: sadece
// ADMIN_SECRET env degiskenini bilen kisi erisebilir. Bu deger,
// kurucunun kendisi disinda kimseyle paylasilmamali.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedSecret = request.headers["x-admin-secret"];
    const expectedSecret = process.env.ADMIN_SECRET;

    if (!expectedSecret) {
      throw new UnauthorizedException("Yonetim paneli yapilandirilmamis.");
    }

    if (providedSecret !== expectedSecret) {
      throw new UnauthorizedException("Gecersiz yonetim anahtari.");
    }

    return true;
  }
}
