// Gorev 6.5: Sabit kategori listesi (Bolum 4'teki ornekler baz alindi).
// Ileride ihtiyac olursa bu liste veritabanina tasinabilir (dinamik
// kategori yonetimi) - simdilik MVP icin sabit liste yeterli.
export const POOL_CATEGORIES = [
  "Felsefe",
  "Sehir hafizasi",
  "Ortak ani",
  "Muzik",
  "Kitaplar",
  "Seyahat",
  "Genel",
] as const;

export type PoolCategory = (typeof POOL_CATEGORIES)[number];
