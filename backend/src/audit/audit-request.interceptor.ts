import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Request } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
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

    this.auditLog
      .log({
        eventType: `http_${request.method.toLowerCase()}`,
        userId,
        ipAddress: request.ip ?? request.socket?.remoteAddress,
        userAgent: request.headers["user-agent"],
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
