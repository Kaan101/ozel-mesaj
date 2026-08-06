import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { MessageSuggestionsService } from "./message-suggestions.service";
import { AdminGuard } from "../settings/guards/admin.guard";

// Kullanici istegi: mesaj onerileri artik veritabaninda - normal
// kullanicilar sadece listeyi GORUR (giris gerektirmez, herkese acik),
// admin ekleme/guncelleme/silme yapabilir. Oneriler artik DILE
// (tr/en) gore de ayrilabiliyor.
@Controller("message-suggestions")
export class MessageSuggestionsController {
  constructor(private readonly service: MessageSuggestionsService) {}

  // Herkese acik - mesaj yazarken oneri listesini gormek icin.
  @Get()
  async list(@Query("language") language?: string) {
    return this.service.list(language);
  }

  @UseGuards(AdminGuard)
  @Post()
  async add(@Body() dto: { text: string; language?: string }) {
    return this.service.add(dto.text, dto.language);
  }

  // Kullanici istegi: bir alanda birden fazla oneri (satirla ayrilmis)
  // tek seferde eklenebilsin.
  @UseGuards(AdminGuard)
  @Post("bulk")
  async addBulk(@Body() dto: { texts: string[]; language?: string }) {
    return this.service.addBulk(dto.texts, dto.language);
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
