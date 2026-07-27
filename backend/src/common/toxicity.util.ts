// Kullanici istegi: yazilan mesajlari/metinleri toksik olma ihtimaline
// gore skorlar (0-100) - ucretsiz, anahtar kelime/kufur listesi ile
// calisir (harici bir AI servisine istek atmaz). Sistem parametresine
// (TOXIC_MESSAGE_THRESHOLD) gore, skor esigin USTUNDEYSE mesaj
// GONDERILEMEZ (guardrail).
//
// Iki siddet katmani: agir (kufur/hakaret/tehdit - yuksek puan) ve
// hafif (kaba/rahatsiz edici - dusuk puan). Birden fazla kelime
// eslesirse puanlar TOPLANIR (100'de sinirlanir).
export const SEVERE_WORDS = [
  "orospu",
  "piç",
  "pic",
  "yavşak",
  "yavsak",
  "sikeyim",
  "siktir",
  "amk",
  "amına koyayım",
  "ananı",
  "anani",
  "göt",
  "got herif",
  "ibne",
  "kaltak",
  "şerefsiz",
  "serefsiz",
  "gerizekalı",
  "gerizekali",
  "salak",
  "aptal",
  "geber",
  "öldüreceğim",
  "oldurecegim",
  "seni bulup",
];

export const MILD_WORDS = [
  "aptalsın",
  "aptalsin",
  "sersem",
  "ahmak",
  "beyinsiz",
  "dangalak",
  "hıyar",
  "hiyar",
  "malsın",
  "malsin",
];

// Kullanici istegi: mesaj metnini analiz edip 0-100 arasi bir
// toksisite skoru dondurur.
export function getToxicityScore(text: string): number {
  const lower = text.toLocaleLowerCase("tr-TR");
  let score = 0;

  for (const word of SEVERE_WORDS) {
    if (lower.includes(word)) score += 40;
  }
  for (const word of MILD_WORDS) {
    if (lower.includes(word)) score += 20;
  }

  // Kullanici istegi: asiri buyuk harf kullanimi ("BAĞIRMA" hissi)
  // hafif bir ek puan - toksik tonun bir gostergesi olabilir.
  const letters = text.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, "");
  if (letters.length >= 8) {
    const upperRatio = (letters.match(/[A-ZÇĞİÖŞÜ]/g) ?? []).length / letters.length;
    if (upperRatio > 0.8) score += 10;
  }

  return Math.min(score, 100);
}
