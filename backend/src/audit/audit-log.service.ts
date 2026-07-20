import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

interface LogEventInput {
  eventType: string;
  userId?: string;
  threadId?: string;
  ipAddress?: string;
  userAgent?: string;
  acceptLanguage?: string;
  country?: string;
  city?: string;
  screenResolution?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
}

// Kullanici istegi: sistem sahibi olarak, hukuki bir talep geldiginde
// ispatlayabilecegi/belgeleyebilecek genel bir islem gunlugu. Ekleme-
// sadece (append-only) - normal API'ler bu tabloyu hicbir zaman okumaz,
// sadece yonetim ekrani okur.
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: LogEventInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          eventType: input.eventType,
          userId: input.userId ?? null,
          threadId: input.threadId ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          acceptLanguage: input.acceptLanguage ?? null,
          country: input.country ?? null,
          city: input.city ?? null,
          screenResolution: input.screenResolution ?? null,
          timezone: input.timezone ?? null,
          metadata: (input.metadata as any) ?? undefined,
        },
      });
    } catch (err) {
      // Loglama basarisiz olursa ana istegi ASLA bozmamali - sadece
      // sunucu logunda gorunsun.
      this.logger.error(`Audit log yazilamadi: ${(err as Error).message}`);
    }
  }
}
