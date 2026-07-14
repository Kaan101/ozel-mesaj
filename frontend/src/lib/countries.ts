// Yaygin kullanilan ulkeler icin telefon kodu listesi. Bayrak
// emoji'leri ISO-3166 alpha-2 koddan otomatik uretiliyor (regional
// indicator sembolleri), boylece her ulke icin ayri emoji yazmaya
// gerek yok.
export interface CountryOption {
  iso2: string;
  name: string;
  dialCode: string; // "+" isareti olmadan, orn. "90"
}

export const COUNTRIES: CountryOption[] = [
  { iso2: "TR", name: "Türkiye", dialCode: "90" },
  { iso2: "US", name: "Amerika Birleşik Devletleri", dialCode: "1" },
  { iso2: "GB", name: "Birleşik Krallık", dialCode: "44" },
  { iso2: "DE", name: "Almanya", dialCode: "49" },
  { iso2: "FR", name: "Fransa", dialCode: "33" },
  { iso2: "NL", name: "Hollanda", dialCode: "31" },
  { iso2: "BE", name: "Belçika", dialCode: "32" },
  { iso2: "AT", name: "Avusturya", dialCode: "43" },
  { iso2: "CH", name: "İsviçre", dialCode: "41" },
  { iso2: "IT", name: "İtalya", dialCode: "39" },
  { iso2: "ES", name: "İspanya", dialCode: "34" },
  { iso2: "SE", name: "İsveç", dialCode: "46" },
  { iso2: "NO", name: "Norveç", dialCode: "47" },
  { iso2: "DK", name: "Danimarka", dialCode: "45" },
  { iso2: "GR", name: "Yunanistan", dialCode: "30" },
  { iso2: "BG", name: "Bulgaristan", dialCode: "359" },
  { iso2: "RO", name: "Romanya", dialCode: "40" },
  { iso2: "RU", name: "Rusya", dialCode: "7" },
  { iso2: "UA", name: "Ukrayna", dialCode: "380" },
  { iso2: "AZ", name: "Azerbaycan", dialCode: "994" },
  { iso2: "GE", name: "Gürcistan", dialCode: "995" },
  { iso2: "IR", name: "İran", dialCode: "98" },
  { iso2: "IQ", name: "Irak", dialCode: "964" },
  { iso2: "SY", name: "Suriye", dialCode: "963" },
  { iso2: "SA", name: "Suudi Arabistan", dialCode: "966" },
  { iso2: "AE", name: "Birleşik Arap Emirlikleri", dialCode: "971" },
  { iso2: "QA", name: "Katar", dialCode: "974" },
  { iso2: "KW", name: "Kuveyt", dialCode: "965" },
  { iso2: "EG", name: "Mısır", dialCode: "20" },
  { iso2: "IL", name: "İsrail", dialCode: "972" },
  { iso2: "CY", name: "Kıbrıs", dialCode: "357" },
  { iso2: "CN", name: "Çin", dialCode: "86" },
  { iso2: "JP", name: "Japonya", dialCode: "81" },
  { iso2: "KR", name: "Güney Kore", dialCode: "82" },
  { iso2: "IN", name: "Hindistan", dialCode: "91" },
  { iso2: "PK", name: "Pakistan", dialCode: "92" },
  { iso2: "AU", name: "Avustralya", dialCode: "61" },
  { iso2: "CA", name: "Kanada", dialCode: "1" },
  { iso2: "BR", name: "Brezilya", dialCode: "55" },
  { iso2: "MX", name: "Meksika", dialCode: "52" },
  { iso2: "ZA", name: "Güney Afrika", dialCode: "27" },
];

export function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

// navigator.language (orn. "tr-TR") uzerinden ulke tahmini - ag
// istegi gerektirmeyen, tarayici tabanli en pratik "otomatik
// algilama" yontemi.
export function detectCountryFromLocale(): CountryOption | null {
  if (typeof navigator === "undefined") return null;
  const locale = navigator.language || (navigator as any).userLanguage;
  if (!locale) return null;
  const parts = locale.split("-");
  const region = parts[1]?.toUpperCase();
  if (!region) return null;
  return COUNTRIES.find((c) => c.iso2 === region) ?? null;
}
