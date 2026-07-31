import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ContactsService } from "./contacts.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

// Kullanici istegi: Rehber ekrani - gonderdigin her numara otomatik
// kaydedilir, karsi taraf yanit verirse avatar/nickname eklenir,
// elle not ekleme/duzenleme/silme.
@Controller("contacts")
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  async list(@Req() request: Request) {
    const userId = (request as any).user.sub;
    return this.contactsService.listContacts(userId);
  }

  @Post()
  async add(@Req() request: Request, @Body() dto: { phoneNumber: string; note?: string }) {
    const userId = (request as any).user.sub;
    return this.contactsService.addContact(userId, dto.phoneNumber, dto.note);
  }

  @Patch(":id")
  async update(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: { note?: string; phoneNumber?: string }
  ) {
    const userId = (request as any).user.sub;
    return this.contactsService.updateContact(userId, id, dto);
  }

  @Delete(":id")
  async remove(@Req() request: Request, @Param("id") id: string) {
    const userId = (request as any).user.sub;
    await this.contactsService.deleteContact(userId, id);
    return { message: "Kişi silindi." };
  }
}
