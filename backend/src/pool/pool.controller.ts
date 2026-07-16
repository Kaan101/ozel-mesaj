import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { JwtService } from "@nestjs/jwt";
import { PoolService } from "./pool.service";
import { CreatePoolEntryDto } from "./dto/create-pool-entry.dto";
import { AttemptPoolEntryDto } from "./dto/attempt-pool-entry.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("pool")
export class PoolController {
  constructor(
    private readonly poolService: PoolService,
    private readonly jwt: JwtService
  ) {}

  // Gorev 6.5 (revize - kullanici istegi): kategori artik serbest
  // metin. Bu endpoint sabit bir liste yerine, veritabaninda daha
  // once GIRILMIS gercek kategori degerlerini doner - frontend'de
  // yazarken oneri (autocomplete) olarak kullanilir.
  @Get("categories")
  async getCategories() {
    const categories = await this.poolService.listDistinctCategories();
    return { categories };
  }

  // Katman 1 auth zorunlu (Bolum 9): sadece giris yapmis kullanicilar
  // soru birakabilir.
  @UseGuards(JwtAuthGuard)
  @Post("entries")
  async createEntry(@Req() request: Request, @Body() dto: CreatePoolEntryDto) {
    const ownerUserId = (request as any).user.sub;
    const result = await this.poolService.createEntry(ownerUserId, dto);

    return {
      message: "Soru olusturuldu.",
      poolEntryId: result.poolEntryId,
    };
  }

  // Kullanici istegi: havuza biraktigim sorular Mesajlarim listesine
  // entegre edilecek - bu endpoint o listeyi besler. DIKKAT: "mine"
  // route'u ":id" route'undan ONCE tanimlanmali (routing cakismasi
  // onlemi, daha once /threads/mine icin de uyguladigimiz desen).
  @UseGuards(JwtAuthGuard)
  @Get("entries/mine")
  async listMyEntries(@Req() request: Request) {
    const ownerUserId = (request as any).user.sub;
    return this.poolService.listMyPoolEntries(ownerUserId);
  }

  // Gorev 6.2: Herkese acik listeleme - auth gerektirmez (Bolum 4, 9).
  @Get("entries")
  async listEntries(
    @Query("category") category?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.min(50, Math.max(1, Number(pageSize) || 10));

    return this.poolService.listEntries(category, pageNum, pageSizeNum);
  }

  // Gorev 12.4 icin gerekli ek: tek bir soruyu ID ile getirir - auth
  // ZORUNLU degil (detay sayfasi + OG etiketleri, herkes gorebilmeli,
  // Gorev 12.5). Ama kullanici GIRIS YAPMISSA, isOwner bilgisini
  // dondurebilmek icin token'i (varsa) sessizce cozmeye calisiyoruz -
  // gecersiz/eksik token hata FIRLATMAZ, sadece isOwner=false olur.
  @Get("entries/:id")
  async getEntry(@Req() request: Request, @Param("id") id: string) {
    let requestingUserId: string | undefined;
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    if (type === "Bearer" && token) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
          secret: process.env.JWT_ACCESS_SECRET,
        });
        requestingUserId = payload.sub;
      } catch {
        // Gecersiz/eksik token - sorun degil, sadece isOwner=false donecek.
      }
    }
    return this.poolService.getEntryById(id, requestingUserId);
  }

  // Kullanici istegi: soruyu istedigim zaman kaldirabilmeliyim.
  @UseGuards(JwtAuthGuard)
  @Delete("entries/:id")
  async deleteEntry(@Req() request: Request, @Param("id") id: string) {
    const ownerUserId = (request as any).user.sub;
    await this.poolService.deleteEntryForOwner(id, ownerUserId);
    return { message: "Soru kaldırıldı." };
  }

  // Kullanici istegi: kendi sorumun sayfasina girdigimde, gelen HER
  // yaniti (durumu ne olursa olsun) ayri birer "iletisim" olarak
  // gormek istiyorum.
  @UseGuards(JwtAuthGuard)
  @Get("entries/:id/attempts")
  async getEntryAttempts(@Req() request: Request, @Param("id") id: string) {
    const ownerUserId = (request as any).user.sub;
    return this.poolService.getAllAttemptsForOwner(id, ownerUserId);
  }

  // Gorev 6.3: Katman 1 auth zorunlu - deneyen kisinin kimligi
  // (attemptingUserId), basarili eslesmede olusacak thread'in
  // recipientUserId'si olarak kullanilacak (Bolum 4, 9).
  @UseGuards(JwtAuthGuard)
  @Post("entries/:id/attempt")
  async attempt(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: AttemptPoolEntryDto
  ) {
    const attemptingUserId = (request as any).user.sub;
    return this.poolService.attemptEntry(id, attemptingUserId, dto.answer);
  }

  // Kullanici istegi: "Tum Yanitlari Goster" modundaki sorularima
  // gelen, henuz kabul/reddedilmemis yanitlari listeler.
  @UseGuards(JwtAuthGuard)
  @Get("attempts/pending")
  async listPendingAttempts(@Req() request: Request) {
    const ownerUserId = (request as any).user.sub;
    return this.poolService.listPendingAttemptsForOwner(ownerUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("attempts/:id/accept")
  async acceptAttempt(@Req() request: Request, @Param("id") id: string) {
    const ownerUserId = (request as any).user.sub;
    return this.poolService.acceptAttempt(id, ownerUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("attempts/:id/reject")
  async rejectAttempt(@Req() request: Request, @Param("id") id: string) {
    const ownerUserId = (request as any).user.sub;
    await this.poolService.rejectAttempt(id, ownerUserId);
    return { message: "Yanit reddedildi." };
  }
}
