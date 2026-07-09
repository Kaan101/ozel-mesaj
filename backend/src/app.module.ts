import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./common/prisma.module";
import { ThreadModule } from "./thread/thread.module";
import { JobsModule } from "./jobs/jobs.module";

@Module({
  imports: [PrismaModule, AuthModule, ThreadModule, JobsModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
