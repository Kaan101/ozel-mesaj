import * as crypto from "crypto";

// Kullanici istegi: telefon numaralarinin ve mesaj icerigininin,
// hash'ten farkli olarak GERI DONDURULEBILIR sekilde saklanmasi
// gerekiyor (hukuki ispat/soruşturma icin). Bu, projedeki genel
// "hash'le, asla geri donme" ilkesinin (Bolum 8, 10) BILINCLI bir
// istisnasidir - sadece bu iki alan (telefon kasasi, mesaj arsivi)
// icin, sadece yonetim ekranindan erisilebilir sekilde.
//
// AES-256-GCM kullanilir (authenticated encryption - hem gizlilik hem
// butunluk saglar). Anahtar, PHONE_ENCRYPTION_KEY env degiskeninden
// gelir (32 byte, hex formatinda, 64 karakter).

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const hexKey = process.env.PHONE_ENCRYPTION_KEY;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error(
      "PHONE_ENCRYPTION_KEY tanimli degil veya gecersiz (64 karakter hex olmali)."
    );
  }
  return Buffer.from(hexKey, "hex");
}

export function encryptReversible(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // iv + authTag + encrypted, hepsi tek bir base64 string'de birlestirilir.
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptReversible(payload: string): string {
  const key = getKey();
  const raw = Buffer.from(payload, "base64");

  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
