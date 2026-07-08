import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("otp/request")
  async requestOtp(@Body() dto: RequestOtpDto) {
    const { ttlSeconds } = await this.authService.requestOtp(dto.phoneNumber);

    // Guvenlik: response'ta ASLA telefon numarasi, hash'i veya OTP kodu
    // donmez - sadece "istek alindi" bilgisi verilir (Bolum 8, 10).
    return {
      message: "Dogrulama kodu gonderildi.",
      expiresInSeconds: ttlSeconds,
    };
  }

  @Post("otp/verify")
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const { accessToken, refreshToken } = await this.authService.verifyOtp(
      dto.phoneNumber,
      dto.code
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
