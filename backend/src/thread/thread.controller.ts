import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ThreadService } from "./thread.service";
import { CreateThreadDto } from "./dto/create-thread.dto";
import { UnlockThreadDto } from "./dto/unlock-thread.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ThreadAccessGuard } from "./guards/thread-access.guard";

@Controller("threads")
export class ThreadController {
  constructor(private readonly threadService: ThreadService) {}

  // Katman 1 auth zorunlu (Bolum 9): sadece giris yapmis kullanicilar
  // mesaj/thread olusturabilir.
  @UseGuards(JwtAuthGuard)
  @Post()
  async createThread(@Req() request: Request, @Body() dto: CreateThreadDto) {
    const initiatorUserId = (request as any).user.sub;
    const result = await this.threadService.createThread(initiatorUserId, dto);

    return {
      message: "Mesaj olusturuldu ve aliciya bildirim gonderildi.",
      threadId: result.threadId,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/unlock")
  async unlock(@Param("id") id: string, @Body() dto: UnlockThreadDto) {
    const { threadAccessToken } = await this.threadService.unlockThread(id, dto.secret);

    return { thread_access_token: threadAccessToken };
  }

  // Gorev 5.3 proof endpoint'i: ThreadAccessGuard'in gercekten
  // calistigini gostermek icin. Bu endpoint Gorev 5.4'te
  // GET /threads/:id/messages ile degistirilecek/genisletilecek.
  @UseGuards(ThreadAccessGuard)
  @Get(":id/ping")
  ping(@Param("id") id: string) {
    return { threadId: id, message: "Bu thread'e erisim yetkin var." };
  }
}
