import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ThreadController } from "./thread.controller";
import { ThreadService } from "./thread.service";
import { SmsModule } from "../sms/sms.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [SmsModule, JwtModule.register({}), AuthModule],
  controllers: [ThreadController],
  providers: [ThreadService],
})
export class ThreadModule {}
