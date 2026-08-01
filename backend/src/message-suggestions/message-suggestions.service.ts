import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

// Kullanici istegi: mesaj yazarken sunulan hazir onerilerin varsayilan
// listesi - ILK KURULUMDA (bos tablo) tohumlamak icin kullanilir,
// sonrasi admin tarafindan tamamen duzenlenebilir.
const DEFAULT_SUGGESTIONS: string[] = [
  "Merhaba, nasılsın?",
  "Selam, müsaitsen biraz konuşabilir miyiz?",
  "Merhaba, tanışmak ister misin?",
  "Selam, günün nasıl geçiyor?",
  "Merhaba, sana bir şey sormak istiyorum.",
  "Selam, biraz sohbet edelim mi?",
  "Merhaba, umarım rahatsız etmiyorumdur.",
  "Selam, bugün keyfin nasıl?",
  "Merhaba, uzun zamandır seninle konuşmak istiyordum.",
  "Selam, seni tanıyan biri olarak merhaba demek istedim.",
  "Merhaba, belki güzel bir sohbetimiz olur diye düşündüm.",
  "Selam, seni biraz daha yakından tanımak isterim.",
  "Merhaba, şu an yabancı gibi görünsem de aslında seni tanıyorum.",
  "Selam, anonim olmam seni rahatsız etmezse biraz konuşabilir miyiz?",
  "Merhaba, kim olduğumu hemen söylemeden önce biraz sohbet etmek istedim.",
  "Merhaba, beni tanıyor olabilirsin ama kim olduğumu henüz bilmiyorsun.",
  "Selam, sana tanıdık gelen anonim birinden mesaj var.",
  "Merhaba, kim olduğumu tahmin etmek ister misin?",
  "Selam, küçük bir ipucuyla başlayalım mı?",
  "Merhaba, geçmişte bir yerde karşılaşmış olabiliriz.",
  "Selam, beni tanıyorsun ama muhtemelen şu an tahmin edemeyeceksin.",
  "Merhaba, sence sana kim mesaj atıyor olabilir?",
  "Merhaba, anonimlik perdesinin arkasından selamlar.",
  "Selam, kim olduğumu tahmin etme oyunu oynamaya hazır mısın?",
  "Merhaba, korkma; gizli hayran değilim. Şimdilik sadece anonimim.",
  "Selam, bu mesajın sahibi sandığından daha tanıdık olabilir.",
  "Merhaba, ilk ipucu: Daha önce beni gördün.",
  "Selam, anonim başladık ama umarım yabancı kalmayız.",
  "Merhaba, seni tanıyorum fakat anonim olarak yazmam seni rahatsız etmezse biraz sohbet etmek isterim.",
  "Selam, bir süredir sana yazıp yazmamak konusunda kararsızdım.",
  "Merhaba, belki beklemediğin birinden gelen küçük bir selamdır bu.",
  "Selam, sana söylemek istediğim birkaç şey var ama önce tanışalım istedim.",
  "Merhaba, beni tanımadan önce mesajımı tanımak ister misin?",
  "Selam, kim olduğumu bilmeden benimle sohbet eder misin?",
  "Merhaba, sohbet etmek için doğru kişiye yazdığımı düşünüyorum.",
  "Selam, bugün sana anonim bir merhaba bırakmak istedim.",
  "Merhaba, biraz gizemli başladım ama niyetim sadece sohbet etmek.",
  "Selam, belki sesimi duysan hemen tanırdın.",
  "Merhaba, kimliğimi söylemeden önce seni biraz dinlemek istiyorum.",
  "Selam, sana yabancı değilim ama şimdilik ismim gizli.",
  "Merhaba, daha önce konuşmuş olabiliriz. Hatırlayabilecek misin bakalım?",
  "Selam, anonim birinden gelen sıradan olmayan bir merhaba.",
  "Merhaba, güzel bir sohbetin nasıl başlayacağını merak ettim ve sana yazdım.",
  "Selam, sana yazmam biraz cesaret istedi ama sonunda yazdım.",
  "Merhaba, beni tahmin etmeye çalışmadan önce biraz konuşalım mı?",
  "Selam, bugün birine içten bir merhaba demek istedim. O kişi sen oldun.",
  "Merhaba, kim olduğumu bilmeden bana bir soru sormak ister misin?",
  "Selam, anonim olmam dışında aslında oldukça normal biriyim.",
  "Merhaba, belki bu mesaj seni şaşırtır ama kötü bir niyetim yok.",
  "Selam, şimdilik adımı söylemeyeyim ama tanışmak istediğimi söyleyebilirim.",
];

@Injectable()
export class MessageSuggestionsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.messageSuggestion.findMany({ orderBy: { createdAt: "asc" } });
  }

  async add(text: string) {
    return this.prisma.messageSuggestion.create({ data: { text: text.trim() } });
  }

  // Kullanici istegi: bir alanda birden fazla oneri (satirla ayrilmis)
  // tek seferde eklenebilsin.
  async addBulk(texts: string[]): Promise<{ count: number }> {
    const trimmed = texts.map((t) => t.trim()).filter((t) => t.length > 0);
    if (trimmed.length === 0) return { count: 0 };
    await this.prisma.messageSuggestion.createMany({
      data: trimmed.map((text) => ({ text })),
    });
    return { count: trimmed.length };
  }

  async update(id: string, text: string) {
    return this.prisma.messageSuggestion.update({ where: { id }, data: { text: text.trim() } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.messageSuggestion.delete({ where: { id } }).catch(() => {});
  }

  async seedDefaults(): Promise<{ inserted: number }> {
    const count = await this.prisma.messageSuggestion.count();
    if (count > 0) return { inserted: 0 };
    await this.prisma.messageSuggestion.createMany({
      data: DEFAULT_SUGGESTIONS.map((text) => ({ text })),
    });
    return { inserted: DEFAULT_SUGGESTIONS.length };
  }

  // Kullanici istegi: varsayilan oneriler ELLE tiklamaya gerek
  // kalmadan, uygulama BASLARKEN otomatik olarak (tablo bossa) yuklenir.
  async onModuleInit(): Promise<void> {
    try {
      await this.seedDefaults();
    } catch {
      // Baslangicta DB henuz hazir degilse sessizce gec.
    }
  }
}
