import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { AuditViewService } from "./audit-view.service";
import { AdminGuard } from "../settings/guards/admin.guard";

// Kullanici istegi: hukuki ispat/belgeleme icin yonetim ekraninin
// kullandigi endpoint'ler - ADMIN_SECRET ile korunur.
@Controller("admin/audit")
@UseGuards(AdminGuard)
export class AuditViewController {
  constructor(private readonly auditView: AuditViewService) {}

  @Get("logs")
  async listLogs(
    @Query("eventType") eventType?: string,
    @Query("userId") userId?: string,
    @Query("threadId") threadId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.auditView.listLogs({
      eventType,
      userId,
      threadId,
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.min(100, Math.max(1, Number(pageSize) || 25)),
    });
  }

  @Get("users/:id/phone")
  async revealPhone(@Param("id") id: string) {
    return this.auditView.revealPhone(id);
  }

  @Get("threads/:id/messages")
  async revealThreadMessages(@Param("id") id: string) {
    return this.auditView.revealThreadMessages(id);
  }
}
