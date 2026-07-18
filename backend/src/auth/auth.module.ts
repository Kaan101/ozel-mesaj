import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RedisService } from "../common/redis.service";
import { SmsModule } from "../sms/sms.module";
import { SettingsModule } from "../settings/settings.module";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Module({
  // JwtService artik GlobalJwtModule uzerinden global olarak saglaniyor.
  imports: [SmsModule, SettingsModule],
  controllers: [AuthController],
  providers: [AuthService, RedisService, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
