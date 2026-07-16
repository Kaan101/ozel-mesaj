import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthService } from "./auth.service";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("otp/request")
  async requestOtp(@Body() dto: RequestOtpDto) {
    const { ttlSeconds, mockCode } = await this.authService.requestOtp(dto.phoneNumber, {
      kvkkConsentAccepted: dto.kvkkConsentAccepted,
      explicitConsentAccepted: dto.explicitConsentAccepted,
    });

    // Guvenlik: response'ta ASLA telefon numarasi veya hash'i donmez.
    // mockCode SADECE SMS_MOCK_MODE=true iken doluyor (yukarida
    // AuthService'te aciklandigi gibi) - gercek SMS modunda undefined
    // olacagi icin response'a hic eklenmeyecek.
    return {
      message: "Dogrulama kodu gonderildi.",
      expiresInSeconds: ttlSeconds,
      ...(mockCode ? { mockCode } : {}),
    };
  }

  @Post("otp/verify")
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const { accessToken, refreshToken } = await this.authService.verifyOtp(
      dto.phoneNumber,
      dto.code,
      dto.rememberMe ?? false
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  @Post("refresh")
  async refresh(@Body() dto: RefreshTokenDto) {
    const { accessToken } = await this.authService.refreshAccessToken(dto.refreshToken);

    return { access_token: accessToken };
  }

  // Gorev 3.6 proof endpoint'i: JwtAuthGuard'in gercekten calistigini
  // gostermek icin. Token'siz istek 401, gecerli token'li istek 200 doner.
  @UseGuards(JwtAuthGuard)
  @Get("whoami")
  whoami(@Req() request: Request) {
    return { userId: (request as any).user.sub };
  }
}
