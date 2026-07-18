import { Module } from "@nestjs/common";
import { PoolController } from "./pool.controller";
import { PoolService } from "./pool.service";
import { RedisService } from "../common/redis.service";
import { AuthModule } from "../auth/auth.module";
import { SettingsModule } from "../settings/settings.module";

@Module({
  // JwtService artik GlobalJwtModule uzerinden global olarak saglaniyor.
  imports: [AuthModule, SettingsModule],
  controllers: [PoolController],
  providers: [PoolService, RedisService],
})
export class PoolModule {}
