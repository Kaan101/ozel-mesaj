import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Request } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import * as geoip from "geoip-lite";
import { AuditLogService } from "./audit-log.service";

// Kullanici istegi: TUM API isteklerini (yontem, yol, durum kodu, IP,
// user-agent, varsa kullanici ID'si) otomatik olarak gunluge yazar -
// hukuki ispat icin genel bir "kim ne zaman ne yapti" kaydi. Her
// endpoint'e tek tek eklemek yerine global olarak calisir.
@Injectable()
export class AuditRequestInterceptor implements NestInterceptor {
  constructor(private readonly auditLog: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.recordEvent(request, "success", Date.now() - startedAt),
        error: (err) =>
          this.recordEvent(request, "error", Date.now() - startedAt, err?.status ?? 500),
      })
    );
  }

  private recordEvent(request: Request, outcome: string, durationMs: number, statusCode?: number) {
    // Sik cagirilan, gurultu yaratan health-check gibi endpoint'leri
    // gunluge yazmiyoruz.
    if (request.path === "/health") return;

    const userId = (request as any).user?.sub;
    const ip = request.ip ?? request.socket?.remoteAddress;

    // Kullanici istegi: IP'den yaklasik ulke/sehir - harici bir API'ye
    // istek atmadan, yerel (offline) bir veritabaniyla calisan
    // geoip-lite kutuphanesi kullanilir. Localhost/private IP'lerde
    // (test/gelistirme ortaminda) sonuc bulunamaz, bu normaldir.
    const geo = ip ? geoip.lookup(ip) : null;

    // Kullanici istegi: ekran cozunurlugu ve saat dilimi tarayicidan
    // gelir - frontend (bkz. api-client.ts) bunlari her istekte ozel
    // header olarak gonderir, biz burada okuyoruz.
    this.auditLog
      .log({
        eventType: `http_${request.method.toLowerCase()}`,
        userId,
        ipAddress: ip,
        userAgent: request.headers["user-agent"],
        acceptLanguage: request.headers["accept-language"],
        country: geo?.country,
        city: geo?.city,
        screenResolution: request.headers["x-screen-resolution"] as string | undefined,
        timezone: request.headers["x-timezone"] as string | undefined,
        metadata: {
          path: request.path,
          outcome,
          statusCode,
          durationMs,
        },
      })
      .catch(() => {});
  }
}
