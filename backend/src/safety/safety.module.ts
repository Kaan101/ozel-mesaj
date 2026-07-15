import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { SafetyController } from "./safety.controller";
import { SafetyService } from "./safety.service";
import { AuthModule } from "../auth/auth.module";
import { SettingsModule } from "../settings/settings.module";
import { AdminGuard } from "../settings/guards/admin.guard";

@Module({
  imports: [JwtModule.register({}), AuthModule, SettingsModule],
  controllers: [SafetyController],
  providers: [SafetyService, AdminGuard],
  exports: [SafetyService],
})
export class SafetyModule {}
