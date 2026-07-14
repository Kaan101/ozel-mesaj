import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { CreateAdminTaskDto, UpdateAdminTaskDto } from "./dto/admin-task.dto";

@Injectable()
export class AdminTasksService {
  constructor(private readonly prisma: PrismaService) {}

  // Filtre destekli listeleme + basit onceliklendirme siralamasi
  // (yuksek oncelikli ustte, sonra en yeni olusturulan).
  async list(status?: string, priority?: string) {
    return this.prisma.adminTask.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(priority ? { priority: priority as any } : {}),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
  }

  async create(dto: CreateAdminTaskDto) {
    return this.prisma.adminTask.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        status: (dto.status as any) ?? "pending",
        priority: (dto.priority as any) ?? "medium",
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
  }

  async update(id: string, dto: UpdateAdminTaskDto) {
    const existing = await this.prisma.adminTask.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Gorev bulunamadi.");
    }

    return this.prisma.adminTask.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status !== undefined ? { status: dto.status as any } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority as any } : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
      },
    });
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.adminTask.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Gorev bulunamadi.");
    }
    await this.prisma.adminTask.delete({ where: { id } });
  }
}
