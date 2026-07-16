// Kullanici istegi: iletisim basliklarina "07 Temmuz" formatinda gun+ay
// eklenir - hem Mesajlarim listesinde hem mesaj detay sayfasinda ayni
// bicimde gorunur.
const TURKISH_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export function formatDayMonth(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = TURKISH_MONTHS[date.getMonth()];
  return `${day} ${month}`;
}
