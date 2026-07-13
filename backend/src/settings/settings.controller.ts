import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { UpdateSettingDto } from "./dto/update-setting.dto";
import { AdminGuard } from "./guards/admin.guard";

@UseGuards(AdminGuard)
@Controller("admin/settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async list() {
    return this.settingsService.listAll();
  }

  @Patch()
  async update(@Body() dto: UpdateSettingDto) {
    await this.settingsService.setValue(dto.key, dto.value);
    return { message: "Ayar guncellendi." };
  }
}
