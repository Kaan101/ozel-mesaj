import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { SafetyController } from "./safety.controller";
import { SafetyService } from "./safety.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [JwtModule.register({}), AuthModule],
  controllers: [SafetyController],
  providers: [SafetyService],
  exports: [SafetyService],
})
export class SafetyModule {}
