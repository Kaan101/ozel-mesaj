import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ThreadController } from "./thread.controller";
import { ThreadService } from "./thread.service";
import { RedisService } from "../common/redis.service";
import { SmsModule } from "../sms/sms.module";
import { AuthModule } from "../auth/auth.module";
import { ThreadAccessGuard } from "./guards/thread-access.guard";

@Module({
  imports: [SmsModule, JwtModule.register({}), AuthModule],
  controllers: [ThreadController],
  providers: [ThreadService, RedisService, ThreadAccessGuard],
})
export class ThreadModule {}
