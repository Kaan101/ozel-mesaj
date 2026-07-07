import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Frontend'in (farklı porttan calisacak) backend'e istek atabilmesi icin.
  app.enableCors();

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Ozel Mesaj backend calisiyor: http://localhost:${port}`);
}

bootstrap();
