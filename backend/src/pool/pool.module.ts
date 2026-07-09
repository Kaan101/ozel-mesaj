import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PoolController } from "./pool.controller";
import { PoolService } from "./pool.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [JwtModule.register({}), AuthModule],
  controllers: [PoolController],
  providers: [PoolService],
})
export class PoolModule {}
