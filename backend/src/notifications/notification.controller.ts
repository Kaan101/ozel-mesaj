import { Body, Controller, Delete, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { NotificationService } from "./notification.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("notifications")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // Kullanici istegi: frontend'in VAPID public key'i alabilmesi icin -
  // bu deger gizli degil (sadece PRIVATE key gizli tutulur).
  @Get("vapid-public-key")
  getVapidPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY ?? null };
  }

  @UseGuards(JwtAuthGuard)
  @Post("subscribe")
  async subscribe(
    @Req() request: Request,
    @Body() dto: { endpoint: string; keys: { p256dh: string; auth: string } }
  ) {
    const userId = (request as any).user.sub;
    await this.notificationService.saveSubscription(
      userId,
      dto.endpoint,
      dto.keys.p256dh,
      dto.keys.auth
    );
    return { message: "Bildirim aboneligi kaydedildi." };
  }

  @UseGuards(JwtAuthGuard)
  @Delete("subscribe")
  async unsubscribe(@Body() dto: { endpoint: string }) {
    await this.notificationService.removeSubscription(dto.endpoint);
    return { message: "Bildirim aboneligi kaldirildi." };
  }
}
