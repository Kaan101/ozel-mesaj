import { Global, Module } from "@nestjs/common";
import { AuditLogService } from "./audit-log.service";
import { AuditViewService } from "./audit-view.service";
import { AuditViewController } from "./audit-view.controller";
import { AdminGuard } from "../settings/guards/admin.guard";

// SettingsModule'de kullandigimiz ayni desen (Bolum 3): birden fazla
// modulde kullanilacagi icin @Global() yapiyoruz, her modulun kendi
// imports dizisine eklemesine gerek kalmadan.
@Global()
@Module({
  controllers: [AuditViewController],
  providers: [AuditLogService, AuditViewService, AdminGuard],
  exports: [AuditLogService],
})
export class AuditModule {}
