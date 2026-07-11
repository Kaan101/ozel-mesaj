import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ThreadService } from "./thread.service";
import { CreateThreadDto } from "./dto/create-thread.dto";
import { UnlockThreadDto } from "./dto/unlock-thread.dto";
import { SendMessageDto } from "./dto/send-message.dto";
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

  // Gorev 11.5 icin gerekli ek: alici, unlock denemeden once kilit
  // tipini (parola/soru) ve soru metnini gormeli. Sadece Katman 1
  // yeterli - hicbir sir donmuyor.
  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async getThreadMeta(@Param("id") id: string) {
    return this.threadService.getThreadMeta(id);
  }

  // Gorev 5.4: Thread'e ait mesajlari listeler. Katman 2 (ThreadAccessGuard)
  // korumasi altinda - sadece dogru parolayi/cevabi bilenler erisir.
  @UseGuards(ThreadAccessGuard)
  @Get(":id/messages")
  async getMessages(@Param("id") id: string) {
    return this.threadService.getMessages(id);
  }

  // Gorev 5.5: Yanit gonderme. Iki guard birden: JwtAuthGuard (Katman 1
  // - kimin gonderdigini bilmek icin) + ThreadAccessGuard (Katman 2 -
  // dogru thread'e erisim). Ikisi de gecmeli (Bolum 9).
  @UseGuards(JwtAuthGuard, ThreadAccessGuard)
  @Post(":id/messages")
  async sendMessage(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: SendMessageDto
  ) {
    const senderUserId = (request as any).user.sub;
    return this.threadService.sendMessage(id, senderUserId, dto.body, dto.isAnonymous);
  }
}
