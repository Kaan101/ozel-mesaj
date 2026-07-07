import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  // DTO'lardaki class-validator kurallarini otomatik uygular
  // (orn. RequestOtpDto'daki telefon formatı kontrolu).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Ozel Mesaj backend calisiyor: http://localhost:${port}`);
}

bootstrap();
