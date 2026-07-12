import * as bcrypt from "bcryptjs";

// Parola/cevap ve OTP disi tum "gizli bilgiler" duz metin saklanmaz,
// bcrypt ile hash'lenir (Bolum 7, 8, 10). bcryptjs (native derleme
// gerektirmeyen, saf JS) kullaniyoruz - Windows'ta build araci
// sorunlarindan kacinmak icin.
const SALT_ROUNDS = 10;

export async function hashSecret(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function compareSecret(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
