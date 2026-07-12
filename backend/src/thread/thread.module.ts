import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ThreadController } from "./thread.controller";
import { ThreadService } from "./thread.service";
import { RedisService } from "../common/redis.service";
import { SmsModule } from "../sms/sms.module";
import { AuthModule } from "../auth/auth.module";
import { SafetyModule } from "../safety/safety.module";
import { ThreadAccessGuard } from "./guards/thread-access.guard";
import { ThreadAccessOrOwnerGuard } from "./guards/thread-access-or-owner.guard";
import { ThreadWriteGuard } from "./guards/thread-write.guard";

@Module({
  imports: [SmsModule, JwtModule.register({}), AuthModule, SafetyModule],
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
