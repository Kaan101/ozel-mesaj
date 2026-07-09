import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { MessageCleanupService } from "./message-cleanup.service";

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [MessageCleanupService],
})
export class JobsModule {}
