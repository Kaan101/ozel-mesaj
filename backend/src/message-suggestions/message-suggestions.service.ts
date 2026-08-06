import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

// Kullanici istegi: mesaj yazarken sunulan hazir onerilerin varsayilan
// listesi (TURKCE) - ILK KURULUMDA (bu dilde hic kayit yoksa) tohumlamak
// icin kullanilir, sonrasi admin tarafindan tamamen duzenlenebilir.
const DEFAULT_SUGGESTIONS_TR: string[] = [
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

// Kullanici istegi: mesaj onerileri artik INGILIZCE de secilebiliyor -
// yukaridaki 50 onerinin anlamca esdeger cevirileri.
const DEFAULT_SUGGESTIONS_EN: string[] = [
  "Hi, how are you?",
  "Hey, do you have a minute to chat?",
  "Hi, would you like to get to know each other?",
  "Hey, how's your day going?",
  "Hi, I wanted to ask you something.",
  "Hey, up for a little chat?",
  "Hi, hope I'm not bothering you.",
  "Hey, how are you feeling today?",
  "Hi, I've wanted to talk to you for a while.",
  "Hey, just wanted to say hi as someone who knows you.",
  "Hi, I thought we might have a nice conversation.",
  "Hey, I'd love to get to know you a bit better.",
  "Hi, I might seem like a stranger right now, but I actually know you.",
  "Hey, would it bother you if we chatted while I stay anonymous for now?",
  "Hi, I wanted to chat a bit before revealing who I am.",
  "Hi, you might know me, but you don't know who this is yet.",
  "Hey, you've got a message from someone who might feel familiar.",
  "Hi, want to guess who I am?",
  "Hey, should we start with a little hint?",
  "Hi, we may have crossed paths somewhere before.",
  "Hey, you know me, but you probably can't guess right now.",
  "Hi, who do you think might be messaging you?",
  "Hi, greetings from behind the anonymity curtain.",
  "Hey, ready to play a guess-who game?",
  "Hi, don't worry, I'm not a secret admirer. Just anonymous for now.",
  "Hey, the person behind this message might be more familiar than you think.",
  "Hi, first clue: you've seen me before.",
  "Hey, we started anonymous, but I hope we won't stay strangers.",
  "Hi, I know you, but if it's okay that I stay anonymous, I'd love to chat a bit.",
  "Hey, I've been on the fence about messaging you for a while.",
  "Hi, maybe this is a little hello from someone you didn't expect.",
  "Hey, I have a few things I want to tell you, but let's get acquainted first.",
  "Hi, want to get to know my message before you know me?",
  "Hey, would you chat with me without knowing who I am?",
  "Hi, I think I'm writing to the right person for a good chat.",
  "Hey, wanted to leave you an anonymous hello today.",
  "Hi, started a bit mysteriously, but I just want to chat.",
  "Hey, you might recognize my voice right away if you heard it.",
  "Hi, I want to listen to you a bit before I tell you who I am.",
  "Hey, I'm not a stranger to you, just keeping my name secret for now.",
  "Hi, we may have talked before. Let's see if you remember.",
  "Hey, an unusual hello from someone anonymous.",
  "Hi, I wondered how a nice conversation might start, so I wrote to you.",
  "Hey, it took a bit of courage to message you, but I finally did.",
  "Hi, want to chat a little before trying to guess who I am?",
  "Hey, today I wanted to say a heartfelt hello to someone. That someone is you.",
  "Hi, would you like to ask me a question without knowing who I am?",
  "Hey, other than being anonymous, I'm actually a pretty normal person.",
  "Hi, this message might surprise you, but I mean no harm.",
  "Hey, I won't say my name for now, but I can tell you I'd like to meet you.",
];

@Injectable()
export class MessageSuggestionsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async list(language?: string) {
    return this.prisma.messageSuggestion.findMany({
      where: { language: language === "en" ? "en" : "tr" },
      orderBy: { createdAt: "asc" },
    });
  }

  async add(text: string, language: string = "tr") {
    return this.prisma.messageSuggestion.create({
      data: { text: text.trim(), language: language === "en" ? "en" : "tr" },
    });
  }

  // Kullanici istegi: bir alanda birden fazla oneri (satirla ayrilmis)
  // tek seferde eklenebilsin.
  async addBulk(texts: string[], language: string = "tr"): Promise<{ count: number }> {
    const trimmed = texts.map((t) => t.trim()).filter((t) => t.length > 0);
    if (trimmed.length === 0) return { count: 0 };
    const lang = language === "en" ? "en" : "tr";
    await this.prisma.messageSuggestion.createMany({
      data: trimmed.map((text) => ({ text, language: lang })),
    });
    return { count: trimmed.length };
  }

  async update(id: string, text: string) {
    return this.prisma.messageSuggestion.update({ where: { id }, data: { text: text.trim() } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.messageSuggestion.delete({ where: { id } }).catch(() => {});
  }

  async seedDefaults(): Promise<{ insertedTr: number; insertedEn: number }> {
    const [countTr, countEn] = await Promise.all([
      this.prisma.messageSuggestion.count({ where: { language: "tr" } }),
      this.prisma.messageSuggestion.count({ where: { language: "en" } }),
    ]);

    let insertedTr = 0;
    let insertedEn = 0;

    if (countTr === 0) {
      await this.prisma.messageSuggestion.createMany({
        data: DEFAULT_SUGGESTIONS_TR.map((text) => ({ text, language: "tr" })),
      });
      insertedTr = DEFAULT_SUGGESTIONS_TR.length;
    }
    if (countEn === 0) {
      await this.prisma.messageSuggestion.createMany({
        data: DEFAULT_SUGGESTIONS_EN.map((text) => ({ text, language: "en" })),
      });
      insertedEn = DEFAULT_SUGGESTIONS_EN.length;
    }

    return { insertedTr, insertedEn };
  }

  // Kullanici istegi: varsayilan oneriler (hem TR hem EN) ELLE
  // tiklamaya gerek kalmadan, uygulama BASLARKEN otomatik olarak
  // (o dilde hic kayit yoksa) yuklenir.
  async onModuleInit(): Promise<void> {
    try {
      await this.seedDefaults();
    } catch {
      // Baslangicta DB henuz hazir degilse sessizce gec.
    }
  }
}
