import { Global, Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { NotificationController } from "./notification.controller";
import { SettingsModule } from "../settings/settings.module";

// @Global: ThreadService ve PoolService gibi modullerin ayrica import
// etmesine gerek kalmadan NotificationService'i kullanabilmesi icin
// (AuditModule ile ayni desen).
@Global()
@Module({
  imports: [SettingsModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
