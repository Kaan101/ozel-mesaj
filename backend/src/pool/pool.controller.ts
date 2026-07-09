import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { PoolService } from "./pool.service";
import { CreatePoolEntryDto } from "./dto/create-pool-entry.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("pool/entries")
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  // Katman 1 auth zorunlu (Bolum 9): sadece giris yapmis kullanicilar
  // soru birakabilir.
  @UseGuards(JwtAuthGuard)
  @Post()
  async createEntry(@Req() request: Request, @Body() dto: CreatePoolEntryDto) {
    const ownerUserId = (request as any).user.sub;
    const result = await this.poolService.createEntry(ownerUserId, dto);

    return {
      message: "Soru olusturuldu.",
      poolEntryId: result.poolEntryId,
    };
  }

  // Gorev 6.2: Herkese acik listeleme - auth gerektirmez (Bolum 4, 9).
  @Get()
  async listEntries(
    @Query("category") category?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.min(50, Math.max(1, Number(pageSize) || 10));

    return this.poolService.listEntries(category, pageNum, pageSizeNum);
  }
}
