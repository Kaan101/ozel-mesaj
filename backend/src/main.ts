import "dotenv/config";
import { NestFactory, HttpAdapterHost } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import { AppModule } from "./app.module";
import { SentryExceptionFilter } from "./common/sentry-exception.filter";

async function bootstrap() {
  // Gorev 7.5: SENTRY_DSN bos ise Sentry devre disi kalir (yerel
  // gelistirme sirasinda gereksiz kurulum/hesap gerektirmesin diye) -
  // ayni SMS_MOCK_MODE mantigi (Bolum 6).
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN });
    console.log("Sentry hata izleme aktif.");
  } else {
    console.log("SENTRY_DSN tanimli degil, hata izleme devre disi (sadece konsol loglari).");
  }

  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapterHost));

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Ozel Mesaj backend calisiyor: http://localhost:${port}`);
}

bootstrap();
