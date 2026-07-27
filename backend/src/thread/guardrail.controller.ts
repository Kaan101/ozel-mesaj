import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ThreadService } from "./thread.service";
import { SettingsService } from "../settings/settings.service";
import { AdminGuard } from "../settings/guards/admin.guard";
import { SEVERE_WORDS, MILD_WORDS } from "../common/toxicity.util";

// Kullanici istegi: Guardrail yonetim ekrani - toksik kelimeler,
// esik parametresi ve inceleme bekleyen (pending) mesajlar burada
// yonetilir. Sadece admin erisimi (x-admin-secret header).
@Controller("admin/guardrail")
@UseGuards(AdminGuard)
export class GuardrailController {
  constructor(
    private readonly threadService: ThreadService,
    private readonly settings: SettingsService
  ) {}

  // Toksik kelime listeleri ve esik parametresini doner.
  @Get()
  async getGuardrailInfo() {
    const threshold = await this.settings.getNumber("TOXIC_MESSAGE_THRESHOLD");
    return {
      threshold,
      severeWords: SEVERE_WORDS,
      mildWords: MILD_WORDS,
    };
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
}
