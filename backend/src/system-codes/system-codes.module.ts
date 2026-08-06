import { Module } from "@nestjs/common";
import { SystemCodesController } from "./system-codes.controller";
import { SystemCodesService } from "./system-codes.service";

@Module({
  controllers: [SystemCodesController],
  providers: [SystemCodesService],
  exports: [SystemCodesService],
})
export class SystemCodesModule {}
