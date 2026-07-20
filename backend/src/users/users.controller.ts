import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("me")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getProfile(@Req() request: Request) {
    const userId = (request as any).user.sub;
    return this.usersService.getProfile(userId);
  }

  @Patch()
  async updateProfile(@Req() request: Request, @Body() dto: UpdateProfileDto) {
    const userId = (request as any).user.sub;
    return this.usersService.updateProfile(userId, dto);
  }

  // Kullanici istegi: platform sadece 18+ icin calisir - dogum
  // tarihi ilk girişte toplanir.
  @Post("birthdate")
  async setBirthDate(@Req() request: Request, @Body() dto: { birthDate: string }) {
    const userId = (request as any).user.sub;
    const result = await this.usersService.setBirthDate(userId, dto.birthDate);
    if (!result.isAdult) {
      return {
        isAdult: false,
        message: "Üzgünüz, bu platform sadece 18 yaş ve üzerindeki kullanıcılar içindir.",
      };
    }
    return { isAdult: true };
  }

  @Delete()
  @HttpCode(204)
  async deleteAccount(@Req() request: Request) {
    const userId = (request as any).user.sub;
    await this.usersService.deleteAccount(userId);
  }
}
