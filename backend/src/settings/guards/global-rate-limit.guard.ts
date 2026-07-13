import { CanActivate, ExecutionContext, HttpException, Injectable } from "@nestjs/common";
import { Request } from "express";
import { RedisService } from "../common/redis.service";
import { SettingsService } from "../settings/settings.service";

// Gorev 7.1 (revize): Genel, IP bazli rate limiting - artik sabit
// @nestjs/throttler yapilandirmasi yerine SettingsService'ten okuyor,
// boylece yonetim ekranindan deploy'a gerek kalmadan degistirilebilir
// (kullanici geri bildirimi: test surecinde sabit limitler zorluk
// cikariyordu).
@Injectable()
export class GlobalRateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly settings: SettingsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? request.socket.remoteAddress ?? "unknown";

    const windowMs = await this.settings.getNumber("RATE_LIMIT_WINDOW_MS");
    const maxRequests = await this.settings.getNumber("RATE_LIMIT_MAX_REQUESTS");
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

    const key = `global-rl:${ip}`;
    const count = await this.redis.incr(key, windowSeconds);

    if (count > maxRequests) {
      throw new HttpException("ThrottlerException: Too Many Requests", 429);
    }

    return true;
  }
}
