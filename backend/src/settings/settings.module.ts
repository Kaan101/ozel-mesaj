import { Global, Module } from "@nestjs/common";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";

// Kullanici geri bildirimi: SettingsService birden fazla modulde
// (JobsModule, AuthModule, ThreadModule, PoolModule, SafetyModule)
// kullaniliyor ve her birine tek tek import etmek unutulmaya acik
// (nitekim JobsModule'de unutulmustu, crash'e sebep oldu). @Global()
// ile bu servis, hicbir modulun kendi imports dizisine eklemesine
// gerek kalmadan her yerde kullanilabilir hale gelir (PrismaModule'de
// kullandigimiz ayni desen, Bolum 3).
@Global()
@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
