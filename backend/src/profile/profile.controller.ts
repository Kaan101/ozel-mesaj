import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ProfileService } from "./profile.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

// Kullanici istegi: mesajlastigin kisinin avatarina tiklayinca acilan
// kisisellestirilmis profil sayfasi.
@Controller("profile")
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  // Kendi profil DUZENLEME ekrani icin - TUM alanlar (public+private).
  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMyFields(@Req() request: Request) {
    const userId = (request as any).user.sub;
    return this.service.getMyFields(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("me")
  async addField(
    @Req() request: Request,
    @Body() dto: { label: string; value: string; visibility: string }
  ) {
    const userId = (request as any).user.sub;
    return this.service.addField(userId, dto.label, dto.value, dto.visibility);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me/:fieldId")
  async updateField(
    @Req() request: Request,
    @Param("fieldId") fieldId: string,
    @Body() dto: { label?: string; value?: string; visibility?: string }
  ) {
    const userId = (request as any).user.sub;
    return this.service.updateField(userId, fieldId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("me/:fieldId")
  async deleteField(@Req() request: Request, @Param("fieldId") fieldId: string) {
    const userId = (request as any).user.sub;
    await this.service.deleteField(userId, fieldId);
    return { message: "Profil alanı silindi." };
  }

  // Baskasinin profilini goruntuleme - SADECE public alanlar,
  // SADECE onunla bir konusma paylasiyorsan.
  @UseGuards(JwtAuthGuard)
  @Get(":userId")
  async getPublicProfile(@Req() request: Request, @Param("userId") userId: string) {
    const viewerUserId = (request as any).user.sub;
    return this.service.getPublicProfile(viewerUserId, userId);
  }
}
