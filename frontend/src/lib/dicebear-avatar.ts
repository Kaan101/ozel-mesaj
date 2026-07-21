import { createAvatar } from "@dicebear/core";
import { adventurer } from "@dicebear/collection";

// Kullanici istegi: gercek 3D-render kalitesinde olmasa da, DiceBear'in
// "adventurer" stili zengin ozellestirme (sac, ten rengi, gozluk,
// aksesuar) sunan, dostane cizgi-karakter tarzinda bir avatar
// kutuphanesi - ucretsiz, acik kaynak, sunucu bagimliligi olmadan
// (tamamen tarayicida) calisir.
export interface AvatarConfig {
  seed: string;
  hair: string;
  hairColor: string;
  skinColor: string;
  eyes: string;
  eyebrows: string;
  mouth: string;
  glasses: string | null; // null = gozluk yok
  feature: "none" | "mustache" | "blush" | "birthmark" | "freckles";
  earrings: string | null; // null = kupe yok
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  seed: "youhavemi",
  hair: "short01",
  hairColor: "2c1b18",
  skinColor: "f2d3b1",
  eyes: "variant01",
  eyebrows: "variant01",
  mouth: "variant01",
  glasses: null,
  feature: "none",
  earrings: null,
};

// Kullanici istegi: her secenek grubu icin, DiceBear'in ham (teknik)
// varyant isimleri yerine kucuk, anlasilir bir kurate liste sunulur -
// kullanici "variant07" gibi bir isim gormez, sadece gorsel onizlemeye
// bakip seçer.
export const HAIR_OPTIONS = [
  "short01", "short05", "short10", "short14", "short19",
  "long01", "long06", "long11", "long16", "long21",
] as const;

export const HAIR_COLOR_OPTIONS = [
  "2c1b18", "4a312c", "724133", "a55728", "b58143",
  "d6b370", "e8e1e1", "ecdcbf", "c93305", "000000",
] as const;

export const SKIN_COLOR_OPTIONS = [
  "f2d3b1", "ecad80", "d08b5b", "ae5d29", "614335", "9e5622",
] as const;

export const EYES_OPTIONS = [
  "variant01", "variant05", "variant10", "variant15", "variant20", "variant26",
] as const;

export const EYEBROWS_OPTIONS = [
  "variant01", "variant04", "variant07", "variant10", "variant13",
] as const;

export const MOUTH_OPTIONS = [
  "variant01", "variant05", "variant10", "variant15", "variant20", "variant26",
] as const;

export const GLASSES_OPTIONS = [
  "variant01", "variant02", "variant03", "variant04", "variant05",
] as const;

export const EARRINGS_OPTIONS = ["variant01", "variant02", "variant03", "variant04", "variant05", "variant06"] as const;

export const FEATURE_OPTIONS = ["none", "mustache", "blush", "birthmark", "freckles"] as const;

// Kullanici istegi: secilen tum ozelliklere gore tek bir SVG
// (string) uretir - tamamen tarayicida calisir, harici bir servise
// istek atmaz.
export function generateAvatarSvg(config: AvatarConfig): string {
  return createAvatar(adventurer, {
    seed: config.seed,
    hair: [config.hair as any],
    hairColor: [config.hairColor],
    skinColor: [config.skinColor],
    eyes: [config.eyes as any],
    eyebrows: [config.eyebrows as any],
    mouth: [config.mouth as any],
    glasses: config.glasses ? [config.glasses as any] : [],
    glassesProbability: config.glasses ? 100 : 0,
    features: config.feature !== "none" ? [config.feature as any] : [],
    featuresProbability: config.feature !== "none" ? 100 : 0,
    earrings: config.earrings ? [config.earrings as any] : [],
    earringsProbability: config.earrings ? 100 : 0,
  }).toString();
}

// Kullanici istegi: "Rastgele" butonu icin - her secenek grubundan
// rastgele bir deger secer.
export function randomAvatarConfig(): AvatarConfig {
  function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  return {
    seed: Math.random().toString(36).slice(2),
    hair: pick(HAIR_OPTIONS),
    hairColor: pick(HAIR_COLOR_OPTIONS),
    skinColor: pick(SKIN_COLOR_OPTIONS),
    eyes: pick(EYES_OPTIONS),
    eyebrows: pick(EYEBROWS_OPTIONS),
    mouth: pick(MOUTH_OPTIONS),
    glasses: Math.random() > 0.7 ? pick(GLASSES_OPTIONS) : null,
    feature: pick(FEATURE_OPTIONS),
    earrings: Math.random() > 0.7 ? pick(EARRINGS_OPTIONS) : null,
  };
}
