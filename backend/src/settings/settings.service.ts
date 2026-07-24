import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { SETTING_DEFINITIONS } from "./setting-definitions";

interface CacheEntry {
  value: string;
  expiresAt: number;
}

// Ayarlanabilir parametreleri veritabanindan (app_settings tablosu)
// okur, yoksa env degiskenine, o da yoksa kod icindeki varsayilana
// duser. Her deger 10 saniye onbelleklenir - boylece her istekte
// veritabanina gitmeden, yine de degisiklikler ~10sn icinde etkin olur
// (deploy gerekmez).
//
// Kullanici istegi: sayisal (getNumber) parametrelerin yaninda, metin
// (getString) parametreler de desteklenir - orn. iletisim e-postasi,
// adres.
@Injectable()
export class SettingsService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 10_000;

  constructor(private readonly prisma: PrismaService) {}

  private async getRawValue(key: string): Promise<string> {
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
      ? row.value
      : String(process.env[definition.envFallback] ?? definition.defaultValue);

    this.cache.set(key, { value, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return value;
  }

  async getNumber(key: string): Promise<number> {
    return Number(await this.getRawValue(key));
  }

  async getString(key: string): Promise<string> {
    return this.getRawValue(key);
  }

  async setValue(key: string, value: number | string): Promise<void> {
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
    Array<{
      key: string;
      label: string;
      description: string;
      value: number | string;
      type: "number" | "string";
      isDefault: boolean;
    }>
  > {
    const rows = await this.prisma.appSetting.findMany();
    const rowMap = new Map(rows.map((r) => [r.key, r.value]));

    return Promise.all(
      SETTING_DEFINITIONS.map(async (def) => {
        const type = def.type ?? "number";
        return {
          key: def.key,
          label: def.label,
          description: def.description,
          value: type === "string" ? await this.getString(def.key) : await this.getNumber(def.key),
          type,
          isDefault: !rowMap.has(def.key),
        };
      })
    );
  }
}
