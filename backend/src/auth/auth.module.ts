import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RedisService } from "../common/redis.service";
import { SmsModule } from "../sms/sms.module";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Module({
  imports: [SmsModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, RedisService, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
