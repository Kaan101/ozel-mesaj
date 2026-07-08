import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./common/prisma.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
