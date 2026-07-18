import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./common/prisma.module";
import { GlobalJwtModule } from "./common/global-jwt.module";
import { RedisService } from "./common/redis.service";
import { ThreadModule } from "./thread/thread.module";
import { JobsModule } from "./jobs/jobs.module";
import { PoolModule } from "./pool/pool.module";
import { SafetyModule } from "./safety/safety.module";
import { UsersModule } from "./users/users.module";
import { SettingsModule } from "./settings/settings.module";
import { AuditModule } from "./audit/audit.module";
import { NotificationModule } from "./notifications/notification.module";
import { GlobalRateLimitGuard } from "./settings/guards/global-rate-limit.guard";
import { AuditRequestInterceptor } from "./audit/audit-request.interceptor";

@Module({
  imports: [
    PrismaModule,
    GlobalJwtModule,
    AuthModule,
    ThreadModule,
    JobsModule,
    PoolModule,
    SafetyModule,
    UsersModule,
    SettingsModule,
    AuditModule,
    NotificationModule,
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
    // Kullanici istegi: hukuki ispat/belgeleme icin TUM isteklerin
    // otomatik olarak gunluge yazilmasi (Bolum: "Audit Log").
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditRequestInterceptor,
    },
  ],
})
export class AppModule {}
