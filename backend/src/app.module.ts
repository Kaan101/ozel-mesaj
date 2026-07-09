import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./common/prisma.module";
import { ThreadModule } from "./thread/thread.module";
import { JobsModule } from "./jobs/jobs.module";
import { PoolModule } from "./pool/pool.module";
import { SafetyModule } from "./safety/safety.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    // Gorev 7.1: Genel, IP bazli rate limiting - TUM endpoint'lere
    // varsayilan olarak uygulanir (Bolum 10). Ozel endpoint'lerin
    // (OTP, thread-unlock, pool-attempt) kendi Redis tabanli, daha
    // siki limitleri buna ek olarak calismaya devam eder.
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
        limit: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100),
      },
    ]),
    PrismaModule,
    AuthModule,
    ThreadModule,
    JobsModule,
    PoolModule,
    SafetyModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
