import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { MessageSuggestionsService } from "./message-suggestions.service";
import { AdminGuard } from "../settings/guards/admin.guard";

// Kullanici istegi: mesaj onerileri artik veritabaninda - normal
// kullanicilar sadece listeyi GORUR (giris gerektirmez, herkese acik),
// admin ekleme/guncelleme/silme yapabilir.
@Controller("message-suggestions")
export class MessageSuggestionsController {
  constructor(private readonly service: MessageSuggestionsService) {}

  // Herkese acik - mesaj yazarken oneri listesini gormek icin.
  @Get()
  async list() {
    return this.service.list();
  }

  @UseGuards(AdminGuard)
  @Post()
  async add(@Body() dto: { text: string }) {
    return this.service.add(dto.text);
  }

  // Kullanici istegi: bir alanda birden fazla oneri (satirla ayrilmis)
  // tek seferde eklenebilsin.
  @UseGuards(AdminGuard)
  @Post("bulk")
  async addBulk(@Body() dto: { texts: string[] }) {
    return this.service.addBulk(dto.texts);
  }

  @UseGuards(AdminGuard)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: { text: string }) {
    return this.service.update(id, dto.text);
  }

  @UseGuards(AdminGuard)
  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.service.delete(id);
    return { message: "Öneri silindi." };
  }
}
