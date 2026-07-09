import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [JwtModule.register({}), AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
