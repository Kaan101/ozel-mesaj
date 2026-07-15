import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { PoolService } from "./pool.service";
import { CreatePoolEntryDto } from "./dto/create-pool-entry.dto";
import { AttemptPoolEntryDto } from "./dto/attempt-pool-entry.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("pool")
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  // Gorev 6.5 (revize - kullanici istegi): kategori artik serbest
  // metin. Bu endpoint sabit bir liste yerine, veritabaninda daha
  // once GIRILMIS gercek kategori degerlerini doner - frontend'de
  // yazarken oneri (autocomplete) olarak kullanilir.
  @Get("categories")
  async getCategories() {
    const categories = await this.poolService.listDistinctCategories();
    return { categories };
  }

  // Katman 1 auth zorunlu (Bolum 9): sadece giris yapmis kullanicilar
  // soru birakabilir.
  @UseGuards(JwtAuthGuard)
  @Post("entries")
  async createEntry(@Req() request: Request, @Body() dto: CreatePoolEntryDto) {
    const ownerUserId = (request as any).user.sub;
    const result = await this.poolService.createEntry(ownerUserId, dto);

    return {
      message: "Soru olusturuldu.",
      poolEntryId: result.poolEntryId,
    };
  }

  // Gorev 6.2: Herkese acik listeleme - auth gerektirmez (Bolum 4, 9).
  @Get("entries")
  async listEntries(
    @Query("category") category?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.min(50, Math.max(1, Number(pageSize) || 10));

    return this.poolService.listEntries(category, pageNum, pageSizeNum);
  }

  // Gorev 12.4 icin gerekli ek: tek bir soruyu ID ile getirir - auth
  // gerektirmez (detay sayfasi + OG etiketleri, Gorev 12.5).
  @Get("entries/:id")
  async getEntry(@Param("id") id: string) {
    return this.poolService.getEntryById(id);
  }

  // Gorev 6.3: Katman 1 auth zorunlu - deneyen kisinin kimligi
  // (attemptingUserId), basarili eslesmede olusacak thread'in
  // recipientUserId'si olarak kullanilacak (Bolum 4, 9).
  @UseGuards(JwtAuthGuard)
  @Post("entries/:id/attempt")
  async attempt(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: AttemptPoolEntryDto
  ) {
    const attemptingUserId = (request as any).user.sub;
    return this.poolService.attemptEntry(id, attemptingUserId, dto.answer);
  }
}
