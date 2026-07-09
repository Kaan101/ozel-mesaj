import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
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
}
