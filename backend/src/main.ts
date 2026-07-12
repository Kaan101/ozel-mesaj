import "dotenv/config";
import { NestFactory, HttpAdapterHost } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import * as Sentry from "@sentry/nestjs";
import { AppModule } from "./app.module";
import { SentryExceptionFilter } from "./common/sentry-exception.filter";

async function bootstrap() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN });
    console.log("Sentry hata izleme aktif.");
  } else {
    console.log("SENTRY_DSN tanimli degil, hata izleme devre disi (sadece konsol loglari).");
  }

  const app = await NestFactory.create(AppModule);

  // Gorev 7.6 (guvenlik bulgusu duzeltmesi): Standart guvenlik
  // header'lari (X-Content-Type-Options, X-Frame-Options, vb.) eksikti.
  app.use(helmet());

  // Gorev 7.6 (guvenlik bulgusu duzeltmesi): CORS herhangi bir
  // kisitlama olmadan (*) acikti. ALLOWED_ORIGINS tanimliysa sadece
  // o kaynaklara izin verilir; tanimsizsa (yerel gelistirme) hepsine
  // izin verilir - production'da mutlaka tanimlanmali (Gorev 13).
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapterHost));

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Ozel Mesaj backend calisiyor: http://localhost:${port}`);
}

bootstrap();
