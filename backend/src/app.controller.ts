import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  // Görev 3.1 proof kriteri: /health endpoint'i 200 döner.
  @Get("health")
  getHealth() {
    return {
      status: "ok",
      service: "ozel-mesaj-backend",
      timestamp: new Date().toISOString(),
    };
  }

  // Gorev 7.5 proof endpoint'i: Sentry entegrasyonunu test etmek icin
  // bilerek hata firlatir. Production'da kaldirilabilir/korunabilir.
  @Get("debug-sentry")
  getDebugSentry() {
    throw new Error("Bu, Sentry entegrasyonunu test etmek icin bilerek firlatilan bir hatadir.");
  }
}
