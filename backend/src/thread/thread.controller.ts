import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ThreadService } from "./thread.service";
import { CreateThreadDto } from "./dto/create-thread.dto";
import { UnlockThreadDto } from "./dto/unlock-thread.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ThreadAccessGuard } from "./guards/thread-access.guard";
import { ThreadAccessOrOwnerGuard } from "./guards/thread-access-or-owner.guard";
import { ThreadWriteGuard } from "./guards/thread-write.guard";

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
  async unlock(@Req() request: Request, @Param("id") id: string, @Body() dto: UnlockThreadDto) {
    const userId = (request as any).user.sub;
    const { threadAccessToken } = await this.threadService.unlockThread(id, dto.secret, userId);

    return { thread_access_token: threadAccessToken };
  }

  // Kullanicinin dahil oldugu tum thread'leri listeler ("Mesajlarim"
  // sayfasi icin). DIKKAT: bu route ":id" route'undan ONCE tanimlanmali,
  // yoksa "/threads/mine" istegi yanlislikla ":id"="mine" ile eslesir.
  @UseGuards(JwtAuthGuard)
  @Get("mine")
  async listMyThreads(@Req() request: Request) {
    const userId = (request as any).user.sub;
    return this.threadService.listMyThreads(userId);
  }

  // Kullanici geri bildirimi: "mesaj silme" - gercekte veri silinmez,
  // sadece istegi yapan kullanicinin KENDI listesinden gizlenir.
  @UseGuards(JwtAuthGuard)
  @Delete(":id/hide")
  async hideThread(@Req() request: Request, @Param("id") id: string) {
    const userId = (request as any).user.sub;
    await this.threadService.hideThreadForUser(id, userId);
    return { message: "Silindi." };
  }

  // Gorev 11.5 icin gerekli ek: alici, unlock denemeden once kilit
  // tipini (parola/soru) ve soru metnini gormeli. Sadece Katman 1
  // yeterli - hicbir sir donmuyor.
  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async getThreadMeta(@Req() request: Request, @Param("id") id: string) {
    const requestingUserId = (request as any).user?.sub;
    return this.threadService.getThreadMeta(id, requestingUserId);
  }

  // Gorev 5.4 (revize): Thread'e ait mesajlari listeler. Ya thread_access_token
  // (bilgiye dayali - alici icin) ya da thread'i olusturan kisinin Katman 1
  // token'i (sahiplik - initiator icin, tekrar parola sormamak icin) yeterli.
  @UseGuards(ThreadAccessOrOwnerGuard)
  @Get(":id/messages")
  async getMessages(@Req() request: Request, @Param("id") id: string) {
    // Kullanici istegi (bug duzeltmesi): "eski mesajlar silinmis olarak
    // gelsin" icin, kimlik biliniyorsa (Katman 1 ile erisildiyse)
    // gecirilir. thread_access_token ile erisimde kimlik bilinmez -
    // bu durumda filtre uygulanmaz (guvenli varsayilan: tum gecmis gorunur).
    const requestingUserId = (request as any).user?.sub;
    return this.threadService.getMessages(id, requestingUserId);
  }

  // Gorev 5.5 (revize): Yanit gonderme. ThreadWriteGuard tek basina hem
  // kimligi (senderUserId icin) hem yazma yetkisini (thread_access_token
  // VEYA sahiplik) kontrol eder (Bolum 9, UX iyilestirmesi).
  @UseGuards(ThreadWriteGuard)
  @Post(":id/messages")
  async sendMessage(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: SendMessageDto
  ) {
    const senderUserId = (request as any).user.sub;
    return this.threadService.sendMessage(
      id,
      senderUserId,
      dto.body,
      dto.isAnonymous,
      dto.destroyAfterRead ?? false
    );
  }
}
