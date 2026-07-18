import { Module } from "@nestjs/common";
import { SafetyController } from "./safety.controller";
import { SafetyService } from "./safety.service";
import { AuthModule } from "../auth/auth.module";
import { SettingsModule } from "../settings/settings.module";
import { AdminGuard } from "../settings/guards/admin.guard";

@Module({
  // JwtService artik GlobalJwtModule uzerinden global olarak saglaniyor.
  imports: [AuthModule, SettingsModule],
  controllers: [SafetyController],
  providers: [SafetyService, AdminGuard],
  exports: [SafetyService],
})
export class SafetyModule {}
