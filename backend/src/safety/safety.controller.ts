import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { SafetyService } from "./safety.service";
import { BlockUserDto } from "./dto/block-user.dto";
import { ReportThreadDto } from "./dto/report-thread.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../settings/guards/admin.guard";

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

  // Kullanici istegi: mesaj ekranindan dogrudan engelleme - telefon
  // numarasi yerine threadId kullanir (Bolum 8 gizlilik modeliyle
  // tutarli, bkz. SafetyService.blockThreadCounterpart).
  @UseGuards(JwtAuthGuard)
  @Post("threads/:id/block")
  async blockThreadCounterpart(@Req() request: Request, @Param("id") threadId: string) {
    const requestingUserId = (request as any).user.sub;
    await this.safetyService.blockThreadCounterpart(threadId, requestingUserId);

    return { message: "Kullanıcı engellendi." };
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

  // Guvenlik duzeltmesi (kullanici geri bildirimi): bu endpoint
  // ONCEDEN sadece JwtAuthGuard ile korunuyordu - yani HERHANGI bir
  // giris yapmis kullanici tum sikayetleri gorebiliyordu. Artik
  // AdminGuard ile korunuyor (diger yonetim ekranlarinda kullandigimiz
  // ADMIN_SECRET).
  @UseGuards(AdminGuard)
  @Get("reports")
  async listReports() {
    return this.safetyService.listPendingReports();
  }

  // Kullanici istegi: sikayetleri "incelendi" veya "reddedildi" olarak
  // isaretleyebilme (yonetim ekranindan).
  @UseGuards(AdminGuard)
  @Patch("reports/:id")
  async updateReportStatus(
    @Param("id") id: string,
    @Body() dto: { status: "reviewed" | "dismissed" }
  ) {
    await this.safetyService.updateReportStatus(id, dto.status);
    return { message: "Şikayet güncellendi." };
  }
}
