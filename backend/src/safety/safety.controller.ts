import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { SafetyService } from "./safety.service";
import { BlockUserDto } from "./dto/block-user.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("safety")
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @UseGuards(JwtAuthGuard)
  @Post("block")
  async blockUser(@Req() request: Request, @Body() dto: BlockUserDto) {
    const blockerUserId = (request as any).user.sub;
    await this.safetyService.blockUser(blockerUserId, dto.phoneNumber);

    return { message: "Numara engellendi." };
  }
}
