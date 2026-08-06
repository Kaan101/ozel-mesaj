import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
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

  // Kullanici istegi: yeni bir test senaryosu elle eklenebilsin.
  @Post()
  async add(@Body() dto: { section: string; scenario: string; expectedResult: string }) {
    return this.service.add(dto);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: { status?: string; note?: string; updatedBy: string }
  ) {
    return this.service.update(id, dto);
  }
}
