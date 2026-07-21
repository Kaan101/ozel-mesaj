import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { UpdateSettingDto } from "./dto/update-setting.dto";
import { AdminGuard } from "./guards/admin.guard";

@Controller("admin/settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Kullanici istegi: frontend formlarinin (orn. mesaj olustur) admin
  // anahtari olmadan okuyabilecegi, SADECE bu tek bayragi doner - genel
  // ayar listesi hala AdminGuard korumali kaliyor.
  @Get("public/email-notification-enabled")
  async getEmailNotificationEnabled() {
    const value = await this.settingsService.getNumber("EMAIL_NOTIFICATION_ENABLED");
    return { enabled: value === 1 };
  }

  // Kullanici istegi: bildirim izni istemeden once frontend'in kontrol
  // edecegi iki parametre - (1) bildirimler tamamen acik mi, (2)
  // ekran genisligi esigi (mobil disinda calismasin diye).
  @Get("public/push-notification-config")
  async getPushNotificationConfig() {
    const enabled = await this.settingsService.getNumber("PUSH_NOTIFICATIONS_ENABLED");
    const maxWidthPx = await this.settingsService.getNumber("PUSH_NOTIFICATION_MAX_WIDTH_PX");
    return { enabled: enabled === 1, maxWidthPx };
  }

  // Kullanici istegi: kapatilirsa sistem HER ZAMAN Ingilizce calisir -
  // frontend bu bayrağı ulkeye gore otomatik dil secimini yapmadan
  // once kontrol eder.
  @Get("public/multi-language-enabled")
  async getMultiLanguageEnabled() {
    const value = await this.settingsService.getNumber("MULTI_LANGUAGE_ENABLED");
    return { enabled: value === 1 };
  }

  @UseGuards(AdminGuard)
  @Get()
  async list() {
    return this.settingsService.listAll();
  }

  @UseGuards(AdminGuard)
  @Patch()
  async update(@Body() dto: UpdateSettingDto) {
    await this.settingsService.setValue(dto.key, dto.value);
    return { message: "Ayar guncellendi." };
  }
}
