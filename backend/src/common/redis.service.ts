import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

// Bu servis, OTP kodları ve rate-limit sayaçları gibi kısa ömürlü
// (TTL'li) verileri Redis'te tutmak için uygulama genelinde kullanılır
// (Bölüm 6, 8 - Teknik Mimari ve Auth tasarımı).
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    this.client = new Redis(url);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, "EX", ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const value = await this.client.incr(key);
    if (value === 1) {
      // Sayaç ilk kez oluşturuldu, TTL'sini ayarla.
      await this.client.expire(key, ttlSeconds);
    }
    return value;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
