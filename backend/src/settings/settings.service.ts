import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { SETTING_DEFINITIONS } from "./setting-definitions";

interface CacheEntry {
  value: number;
  expiresAt: number;
}

// Ayarlanabilir parametreleri veritabanindan (app_settings tablosu)
// okur, yoksa env degiskenine, o da yoksa kod icindeki varsayilana
// duser. Her deger 10 saniye onbelleklenir - boylece her istekte
// veritabanina gitmeden, yine de degisiklikler ~10sn icinde etkin olur
// (deploy gerekmez).
@Injectable()
export class SettingsService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 10_000;

  constructor(private readonly prisma: PrismaService) {}

  async getNumber(key: string): Promise<number> {
    const definition = SETTING_DEFINITIONS.find((d) => d.key === key);
    if (!definition) {
      throw new Error(`Bilinmeyen ayar anahtari: ${key}`);
    }

    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const row = await this.prisma.appSetting.findUnique({ where: { key } });
    const value = row
      ? Number(row.value)
      : Number(process.env[definition.envFallback] ?? definition.defaultValue);

    this.cache.set(key, { value, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return value;
  }

  async setValue(key: string, value: number): Promise<void> {
    const definition = SETTING_DEFINITIONS.find((d) => d.key === key);
    if (!definition) {
      throw new Error(`Bilinmeyen ayar anahtari: ${key}`);
    }

    await this.prisma.appSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });

    this.cache.delete(key);
  }

  async listAll(): Promise<
    Array<{ key: string; label: string; description: string; value: number; isDefault: boolean }>
  > {
    const rows = await this.prisma.appSetting.findMany();
    const rowMap = new Map(rows.map((r) => [r.key, r.value]));

    return Promise.all(
      SETTING_DEFINITIONS.map(async (def) => ({
        key: def.key,
        label: def.label,
        description: def.description,
        value: await this.getNumber(def.key),
        isDefault: !rowMap.has(def.key),
      }))
    );
  }
}
