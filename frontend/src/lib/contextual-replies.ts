// Kullanici istegi: karsi taraftan gelen mesajin ICERIGINE gore
// pratik yanit onerileri sunma - ucretsiz, anahtar kelime
// eslestirmesiyle calisir (harici bir AI servisine istek atmaz).
//
// Her kural: mesaj metninde gecen anahtar kelime(ler) + o duruma
// uygun 3 kisa yanit onerisi. Ilk eslesen kural kullanilir (sirali
// kontrol edilir - daha spesifik kurallar ustte olmali).
interface ReplyRule {
  keywords: string[];
  replies: string[];
}

const REPLY_RULES: ReplyRule[] = [
  {
    keywords: ["nasılsın", "nasilsin", "naber", "n'aber", "iyi misin", "iyimisin"],
    replies: ["İyiyim, sen nasılsın?", "Gayet iyiyim, teşekkürler!", "Şöyle böyle, sen nasılsın?"],
  },
  {
    keywords: ["ne yapıyorsun", "ne yapiyorsun", "napıyosun", "napiyosun", "ne haber"],
    replies: ["Pek bir şey yapmıyorum, sen?", "Biraz dinleniyorum.", "Yeni bir şey yok, sen ne yapıyorsun?"],
  },
  {
    keywords: ["teşekkür", "tesekkur", "sağol", "sagol", "eyvallah"],
    replies: ["Rica ederim!", "Ne demek, her zaman!", "Bir şey değil 🙂"],
  },
  {
    keywords: ["özür", "ozur", "kusura bakma", "affedersin", "pardon"],
    replies: ["Sorun değil!", "Önemli değil, geçti.", "Tamam, anladım."],
  },
  {
    keywords: ["görüşürüz", "gorusuruz", "hoşçakal", "hoscakal", "bay bay", "kendine iyi bak"],
    replies: ["Görüşürüz!", "Hoşçakal, iyi günler!", "Sen de kendine iyi bak!"],
  },
  {
    keywords: ["tanışabilir", "tanisabilir", "tanışalım", "tanisalim", "kimsin"],
    replies: ["Olur, tanışalım!", "Neden olmasın 🙂", "Önce sen kendinden bahset."],
  },
  {
    keywords: ["müsait", "musait", "konuşabilir miyiz", "konusabilir miyiz"],
    replies: ["Evet, müsaitim.", "Şu an biraz meşgulüm, sonra yazarım.", "Tabii, dinliyorum."],
  },
  {
    keywords: ["selam", "merhaba", "hey", "selamlar"],
    replies: ["Selam!", "Merhaba, nasılsın?", "Selam, hoş geldin!"],
  },
];

// Genel soru (yukaridaki hicbir kalibi tutmayan ama "?" iceren mesajlar).
const GENERIC_QUESTION_REPLIES = [
  "İyi bir soru, biraz düşüneyim.",
  "Sanırım evet.",
  "Hayır, sanmıyorum.",
  "Emin değilim açıkçası.",
];

// Hicbir kural/soru eslesmezse gosterilecek genel-amacli yanitlar.
const FALLBACK_REPLIES = ["Anladım.", "Tamam, peki 🙂", "İlginç, devam et.", "Haklısın."];

// Kullanici istegi: gelen mesajin metnine gore 3-4 pratik yanit
// onerisi dondurur.
export function getContextualReplies(incomingText: string): string[] {
  const lower = incomingText.toLocaleLowerCase("tr-TR");

  for (const rule of REPLY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.replies;
    }
  }

  if (incomingText.includes("?")) {
    return GENERIC_QUESTION_REPLIES;
  }

  return FALLBACK_REPLIES;
}
