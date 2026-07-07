import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RedisService } from "../common/redis.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, RedisService],
})
export class AuthModule {}
