import { Module } from "@nestjs/common";
import { ThreadController } from "./thread.controller";
import { ThreadService } from "./thread.service";
import { RedisService } from "../common/redis.service";
import { SmsModule } from "../sms/sms.module";
import { EmailModule } from "../email/email.module";
import { AuthModule } from "../auth/auth.module";
import { SafetyModule } from "../safety/safety.module";
import { SettingsModule } from "../settings/settings.module";
import { ThreadAccessGuard } from "./guards/thread-access.guard";
import { ThreadAccessOrOwnerGuard } from "./guards/thread-access-or-owner.guard";
import { ThreadWriteGuard } from "./guards/thread-write.guard";

@Module({
  // JwtService artik GlobalJwtModule uzerinden global olarak saglaniyor.
  imports: [SmsModule, EmailModule, AuthModule, SafetyModule, SettingsModule],
  controllers: [ThreadController],
  providers: [
    ThreadService,
    RedisService,
    ThreadAccessGuard,
    ThreadAccessOrOwnerGuard,
    ThreadWriteGuard,
  ],
})
export class ThreadModule {}
