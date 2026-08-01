import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ThreadService } from "./thread.service";
import { SettingsService } from "../settings/settings.service";
import { AdminGuard } from "../settings/guards/admin.guard";

// Kullanici istegi: Guardrail yonetim ekrani - toksik kelimeler
// (artik DB'de, duzenlenebilir), esik parametresi ve inceleme
// bekleyen (pending) mesajlar burada yonetilir. Sadece admin
// erisimi (x-admin-secret header).
@Controller("admin/guardrail")
@UseGuards(AdminGuard)
export class GuardrailController {
  constructor(
    private readonly threadService: ThreadService,
    private readonly settings: SettingsService
  ) {}

  // Esik parametresini doner (kelime listesi artik ayri endpoint'te).
  @Get()
  async getGuardrailInfo() {
    const threshold = await this.settings.getNumber("TOXIC_MESSAGE_THRESHOLD");
    return { threshold };
  }

  // Inceleme bekleyen (pending) toksik mesajlari listeler.
  @Get("pending")
  async listPending() {
    return this.threadService.listPendingToxicMessages();
  }

  // Admin, toksik bulunan bir mesaji onaylar - gorunur olur, otomatik
  // blok kaldirilir.
  @Post("messages/:id/approve")
  async approve(@Param("id") messageId: string) {
    await this.threadService.approveToxicMessage(messageId);
    return { message: "Mesaj onaylandı." };
  }

  // Admin, toksik bulunan bir mesaji iptal eder - kalici olarak
  // gizli kalir, otomatik blok kalici hale gelir.
  @Post("messages/:id/reject")
  async reject(@Param("id") messageId: string) {
    await this.threadService.rejectToxicMessage(messageId);
    return { message: "Mesaj iptal edildi." };
  }

  // Kullanici istegi: toksik kelime listesi duzenlenebilir - listele,
  // ekle, guncelle, sil.
  @Get("words")
  async listWords() {
    return this.threadService.listToxicWords();
  }

  @Post("words")
  async addWord(@Body() dto: { word: string; score: number }) {
    return this.threadService.addToxicWord(dto.word, dto.score);
  }

  // Kullanici istegi: bir alanda birden fazla kelime (virgul/satir
  // ile ayrilmis) AYNI puanla tek seferde eklenebilsin.
  @Post("words/bulk")
  async addWordsBulk(@Body() dto: { words: string[]; score: number }) {
    return this.threadService.addToxicWordsBulk(dto.words, dto.score);
  }

  @Patch("words/:id")
  async updateWord(@Param("id") id: string, @Body() dto: { word: string; score: number }) {
    return this.threadService.updateToxicWord(id, dto.word, dto.score);
  }

  @Delete("words/:id")
  async deleteWord(@Param("id") id: string) {
    await this.threadService.deleteToxicWord(id);
    return { message: "Kelime silindi." };
  }

  // Kullanici istegi: ilk kurulumda (bos tablo), varsayilan kelime
  // listesiyle tohumlama - tekrar cagrilirsa zaten var olanlari atlar.
  @Post("words/seed-defaults")
  async seedDefaults() {
    return this.threadService.seedDefaultToxicWords();
  }

  // Kullanici istegi: su an inceleme altinda olan tum kisileri listele.
  @Get("under-review")
  async listUnderReview() {
    return this.threadService.listUsersUnderReview();
  }

  // Kullanici istegi: admin, bir kisiyi inceleme durumundan cikarir -
  // mesajlari tekrar normal (skor bazli) degerlendirilir.
  @Post("under-review/:userId/exit")
  async exitReview(@Param("userId") userId: string) {
    await this.threadService.exitReview(userId);
    return { message: "Kişi incelemeden çıkarıldı." };
  }
}
