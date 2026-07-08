import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

// @Global: Thread, Pool gibi ileride gelecek modüllerin her birinde
// ayrı ayrı import etmesine gerek kalmadan PrismaService'i kullanabilmesi için.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
