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
}
