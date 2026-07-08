import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RedisService } from "../common/redis.service";
import { SmsModule } from "../sms/sms.module";

@Module({
  imports: [SmsModule],
  controllers: [AuthController],
  providers: [AuthService, RedisService],
})
export class AuthModule {}
