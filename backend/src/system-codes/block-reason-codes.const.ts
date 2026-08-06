// Kullanici istegi: blok nedeni kodlari SAYISAL ve TEK BIR yerde
// tanimli - hem SystemCodesService (varsayilan tohumlama) hem
// SafetyService (otomatik atama: sistem/manuel/sikayet kaynakli
// bloklar) BU sabitleri kullanir, boylece kodlar hicbir zaman
// birbirinden sapmaz.
export const BLOCK_REASON_CODES = {
  TOXIC_CONTENT: "1",
  SPAM: "2",
  HARASSMENT: "3",
  FRAUD: "4",
  UNWANTED_CONTACT: "5",
  OTHER: "6",
  REPORTED: "7",
} as const;

export const DEFAULT_BLOCK_REASONS: { code: string; description: string }[] = [
  { code: BLOCK_REASON_CODES.TOXIC_CONTENT, description: "Toksik İçerik / Hakaret" },
  { code: BLOCK_REASON_CODES.SPAM, description: "Spam (istenmeyen / tekrarlayan mesaj)" },
  { code: BLOCK_REASON_CODES.HARASSMENT, description: "Taciz veya rahatsız edici davranış" },
  { code: BLOCK_REASON_CODES.FRAUD, description: "Dolandırıcılık şüphesi" },
  {
    code: BLOCK_REASON_CODES.UNWANTED_CONTACT,
    description: "İstenmeyen iletişim (kişi tarafından engellendi)",
  },
  { code: BLOCK_REASON_CODES.OTHER, description: "Diğer / belirtilmemiş" },
  { code: BLOCK_REASON_CODES.REPORTED, description: "Şikayet edildi" },
];

// Kullanici istegi: onceki bir surumde metin bazli kodlar (SPAM,
// TACIZ, vb.) tohumlanmis olabilir - bu kodlar SILINMEZ, yeni sayisal
// karsiliklarina YENIDEN ADLANDIRILIR (mevcut Block/BlockLog
// kayitlarinin referanslari bozulmasin diye ayni satir/id korunur).
export const LEGACY_CODE_RENAME_MAP: Record<string, string> = {
  TOKSIK_ICERIK: BLOCK_REASON_CODES.TOXIC_CONTENT,
  SPAM: BLOCK_REASON_CODES.SPAM,
  TACIZ: BLOCK_REASON_CODES.HARASSMENT,
  DOLANDIRICILIK: BLOCK_REASON_CODES.FRAUD,
  ISTENMEYEN_ILETISIM: BLOCK_REASON_CODES.UNWANTED_CONTACT,
  DIGER: BLOCK_REASON_CODES.OTHER,
};
