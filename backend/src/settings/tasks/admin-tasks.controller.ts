import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AdminTasksService } from "./admin-tasks.service";
import { CreateAdminTaskDto, UpdateAdminTaskDto } from "./dto/admin-task.dto";
import { AdminGuard } from "../guards/admin.guard";

// Kullanici istegi: proje/gorev takip ekrani (yonetim paneli).
// Ayni ADMIN_SECRET korumasini (AdminGuard) kullanir.
@Controller("admin/tasks")
@UseGuards(AdminGuard)
export class AdminTasksController {
  constructor(private readonly tasksService: AdminTasksService) {}

  @Get()
  async list(@Query("status") status?: string, @Query("priority") priority?: string) {
    return this.tasksService.list(status, priority);
  }

  @Post()
  async create(@Body() dto: CreateAdminTaskDto) {
    return this.tasksService.create(dto);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateAdminTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.tasksService.delete(id);
    return { message: "Silindi." };
  }
}
