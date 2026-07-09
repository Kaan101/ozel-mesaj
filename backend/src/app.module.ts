import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./common/prisma.module";
import { ThreadModule } from "./thread/thread.module";

@Module({
  imports: [PrismaModule, AuthModule, ThreadModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
