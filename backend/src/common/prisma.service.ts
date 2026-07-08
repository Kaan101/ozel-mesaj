import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

// Bu servis, PrismaClient'i NestJS'in dependency injection sistemine
// baglar - boylece her yerde `new PrismaClient()` yazmak yerine
// tek bir baglanti havuzu paylasilir (Bolum 6, 7).
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
