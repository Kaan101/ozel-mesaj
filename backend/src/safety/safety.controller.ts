import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { SafetyService } from "./safety.service";
import { BlockUserDto } from "./dto/block-user.dto";
import { ReportThreadDto } from "./dto/report-thread.dto";
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

  // Gorev 7.3: Herhangi bir thread icin sikayet olusturma.
  @UseGuards(JwtAuthGuard)
  @Post("threads/:id/report")
  async reportThread(
    @Req() request: Request,
    @Param("id") threadId: string,
    @Body() dto: ReportThreadDto
  ) {
    const reporterUserId = (request as any).user.sub;
    const result = await this.safetyService.reportThread(reporterUserId, threadId, dto.reason);

    return { message: "Sikayet alindi.", reportId: result.reportId };
  }

  // Moderasyon kuyrugu - MVP'de Katman 1 auth yeterli (admin rolu
  // ayrimi ileride eklenebilir).
  @UseGuards(JwtAuthGuard)
  @Get("reports")
  async listReports() {
    return this.safetyService.listPendingReports();
  }
}
