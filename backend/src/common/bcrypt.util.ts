import * as bcrypt from "bcryptjs";

// Parola/cevap ve OTP disi tum "gizli bilgiler" duz metin saklanmaz,
// bcrypt ile hash'lenir (Bolum 7, 8, 10). bcryptjs (native derleme
// gerektirmeyen, saf JS) kullaniyoruz - Windows'ta build araci
// sorunlarindan kacinmak icin.
const SALT_ROUNDS = 10;

// Kullanici geri bildirimi: parola/cevap karsilastirmasi buyuk/kucuk
// harfe duyarli olmamali (orn. "Kutuphanede" ile "kutuphanede" ayni
// kabul edilmeli). Bunun icin hem hash'leme hem karsilastirma
// ONCESINDE metni normalize ediyoruz (kucuk harfe cevir + bas/son
// bosluklari temizle) - boylece her iki taraf da tutarli sekilde
// islenir. NOT: Bu degisiklikten ONCE olusturulmus kayitlarin
// hash'leri normalize edilmeden uretildigi icin, o eski kayitlar
// icin sadece orijinal (tam ayni harf durumunda girilen) metin
// eslesir - yeni olusturulan kayitlar icin harfe duyarsizlik tam
// calisir.
function normalizeSecret(plain: string): string {
  return plain.trim().toLowerCase();
}

export async function hashSecret(plain: string): Promise<string> {
  return bcrypt.hash(normalizeSecret(plain), SALT_ROUNDS);
}

export async function compareSecret(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(normalizeSecret(plain), hash);
}
