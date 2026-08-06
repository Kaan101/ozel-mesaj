import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { TestCasesService } from "./test-cases.service";

// Kullanici istegi: ADMIN ALTINDA DEGIL, ayri, ekip tarafindan
// serbestce erisilebilen bir test takip ekrani - bu yuzden
// AdminGuard KULLANILMAZ (kimlik dogrulama gerektirmez).
@Controller("test-cases")
export class TestCasesController {
  constructor(private readonly service: TestCasesService) {}

  @Get()
  async list() {
    return this.service.list();
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: { status?: string; note?: string; updatedBy: string }
  ) {
    return this.service.update(id, dto);
  }
}
