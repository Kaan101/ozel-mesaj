import { createHmac } from "crypto";

// Telefon numaraları veritabaninda ASLA duz metin saklanmaz (Bolum 10).
// HMAC-SHA256 kullaniyoruz (duz SHA256 yerine) cunku bir "secret" ile
// birlikte hash'leniyor - boylece ayni numarayi bilen biri, hash'i
// veritabani sizintisindan tekrar uretemez (rainbow table saldirisina karsi).
export function hashPhoneNumber(phoneNumber: string): string {
  const secret = process.env.PHONE_HASH_SECRET ?? "dev-only-insecure-secret";
  return createHmac("sha256", secret).update(phoneNumber.trim()).digest("hex");
}

export function generateOtpCode(length = 4): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}
