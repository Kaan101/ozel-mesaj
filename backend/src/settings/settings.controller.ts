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
