import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { MessageCleanupService } from "./message-cleanup.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  imports: [ScheduleModule.forRoot(), SettingsModule],
  providers: [MessageCleanupService],
})
export class JobsModule {}
