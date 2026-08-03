import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import path from "path";

// Kullanici istegi: sabit bir "yuz/resim" seti - public/images/face/
// klasorune konulan TUM PNG/JPG dosyalari otomatik olarak listelenir,
// kod degisikligi gerekmeden yeni resim eklenip cikarilabilir.
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public", "images", "face");
    const entries = await readdir(dir);
    const images = entries
      .filter((name) => ALLOWED_EXTENSIONS.includes(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "tr"));
    return NextResponse.json({ images });
  } catch {
    // Klasor henuz olusturulmamis/bossa, sessizce bos liste don.
    return NextResponse.json({ images: [] });
  }
}
