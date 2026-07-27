// Kullanici istegi: yazilan mesajlari/metinleri toksik olma ihtimaline
// gore skorlar (0-100) - ucretsiz, anahtar kelime/kufur listesi ile
// calisir (harici bir AI servisine istek atmaz). Sistem parametresine
// (TOXIC_MESSAGE_THRESHOLD) gore, skor esigin USTUNDEYSE mesaj
// GONDERILEMEZ (guardrail).
//
// Kullanici istegi: kelime listesi artik VERITABANINDA (ToxicWord
// modeli) - admin /admin/guardrail ekranindan kelime+puan
// ekleyebilir/guncelleyebilir/silebilir. Bu dosyadaki DEFAULT_TOXIC_WORDS
// sadece ILK KURULUMDA (bos tabloyu) tohumlamak icin kullanilir.
export interface ToxicWordEntry {
  word: string;
  score: number;
}

export const DEFAULT_TOXIC_WORDS: ToxicWordEntry[] = [
  // Agir (kufur/hakaret/tehdit) - 40 puan
  { word: "orospu", score: 40 },
  { word: "piç", score: 40 },
  { word: "pic", score: 40 },
  { word: "yavşak", score: 40 },
  { word: "yavsak", score: 40 },
  { word: "sikeyim", score: 40 },
  { word: "siktir", score: 40 },
  { word: "amk", score: 40 },
  { word: "amına koyayım", score: 40 },
  { word: "ananı", score: 40 },
  { word: "anani", score: 40 },
  { word: "göt", score: 40 },
  { word: "got herif", score: 40 },
  { word: "ibne", score: 40 },
  { word: "kaltak", score: 40 },
  { word: "şerefsiz", score: 40 },
  { word: "serefsiz", score: 40 },
  { word: "gerizekalı", score: 40 },
  { word: "gerizekali", score: 40 },
  { word: "salak", score: 40 },
  { word: "aptal", score: 40 },
  { word: "geber", score: 40 },
  { word: "öldüreceğim", score: 40 },
  { word: "oldurecegim", score: 40 },
  { word: "seni bulup", score: 40 },
  // Hafif (kaba/rahatsiz edici) - 20 puan
  { word: "aptalsın", score: 20 },
  { word: "aptalsin", score: 20 },
  { word: "sersem", score: 20 },
  { word: "ahmak", score: 20 },
  { word: "beyinsiz", score: 20 },
  { word: "dangalak", score: 20 },
  { word: "hıyar", score: 20 },
  { word: "hiyar", score: 20 },
  { word: "malsın", score: 20 },
  { word: "malsin", score: 20 },
];

// Kullanici istegi: mesaj metnini, verilen kelime listesine (DB'den
// gelir) gore analiz edip 0-100 arasi bir toksisite skoru dondurur.
export function getToxicityScore(text: string, wordList: ToxicWordEntry[]): number {
  const lower = text.toLocaleLowerCase("tr-TR");
  let score = 0;

  for (const entry of wordList) {
    if (lower.includes(entry.word.toLocaleLowerCase("tr-TR"))) {
      score += entry.score;
    }
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
