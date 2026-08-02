import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { MessageCleanupService } from "./message-cleanup.service";
import { PoolEntryCleanupService } from "./pool-entry-cleanup.service";
import { ThreadLifespanCleanupService } from "./thread-lifespan-cleanup.service";
import { SettingsModule } from "../settings/settings.module";
import { SafetyModule } from "../safety/safety.module";

@Module({
  imports: [ScheduleModule.forRoot(), SettingsModule, SafetyModule],
  providers: [MessageCleanupService, PoolEntryCleanupService, ThreadLifespanCleanupService],
})
export class JobsModule {}
