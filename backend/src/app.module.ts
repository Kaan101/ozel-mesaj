import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./common/prisma.module";
import { RedisService } from "./common/redis.service";
import { ThreadModule } from "./thread/thread.module";
import { JobsModule } from "./jobs/jobs.module";
import { PoolModule } from "./pool/pool.module";
import { SafetyModule } from "./safety/safety.module";
import { UsersModule } from "./users/users.module";
import { SettingsModule } from "./settings/settings.module";
import { GlobalRateLimitGuard } from "./settings/guards/global-rate-limit.guard";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ThreadModule,
    JobsModule,
    PoolModule,
    SafetyModule,
    UsersModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    RedisService,
    // Gorev 7.1 (revize): Genel, IP bazli rate limiting - artik
    // SettingsService uzerinden yonetim ekranindan degistirilebilir
    // (Bolum 10). Ozel endpoint'lerin (OTP, thread-unlock, pool-attempt)
    // kendi Redis tabanli, daha siki limitleri buna ek olarak calismaya
    // devam eder.
    {
      provide: APP_GUARD,
      useClass: GlobalRateLimitGuard,
    },
  ],
})
export class AppModule {}
