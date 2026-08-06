import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { SystemCodesService } from "./system-codes.service";
import { AdminGuard } from "../settings/guards/admin.guard";

// Kullanici istegi: "Sistem Ayarları > Kod Tanımları" ekrani icin -
// blok nedeni gibi kod listelerini yonetme. Tumu admin korumali.
@Controller("system-codes")
export class SystemCodesController {
  constructor(private readonly service: SystemCodesService) {}

  @UseGuards(AdminGuard)
  @Get()
  async listByCategory(@Query("category") category: string) {
    return this.service.listByCategory(category);
  }

  @UseGuards(AdminGuard)
  @Post()
  async add(@Body() dto: { category: string; code: string; description: string }) {
    return this.service.add(dto.category, dto.code, dto.description);
  }

  @UseGuards(AdminGuard)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: { code: string; description: string }) {
    return this.service.update(id, dto.code, dto.description);
  }

  @UseGuards(AdminGuard)
  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.service.delete(id);
    return { message: "Kod silindi." };
  }
}
