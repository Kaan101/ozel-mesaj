import { NextRequest, NextResponse } from "next/server";
import { readdir } from "fs/promises";
import path from "path";

// Kullanici istegi: sabit resim setleri artik 3 AYRI kategoride -
// public/images/face|pool|type/ klasorlerinde. Her kategorideki TUM
// PNG/JPG dosyalari otomatik listelenir, kod degisikligi gerekmeden
// yeni resim eklenip cikarilabilir.
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const ALLOWED_CATEGORIES = ["face", "pool", "type"] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];

async function listCategory(category: Category): Promise<string[]> {
  try {
    const dir = path.join(process.cwd(), "public", "images", category);
    const entries = await readdir(dir);
    return entries
      .filter((name) => ALLOWED_EXTENSIONS.includes(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "tr"));
  } catch {
    // Klasor henuz olusturulmamis/bossa, sessizce bos liste don.
    return [];
  }
}

export async function GET(request: NextRequest) {
  // Kullanici istegi: "all=1" verilirse UC kategori de tek seferde
  // doner (buton ikonunu erkenden gostermek ve sekmeler arasinda
  // hizli gecis icin kullanisli).
  if (request.nextUrl.searchParams.get("all") === "1") {
    const [face, pool, type] = await Promise.all([
      listCategory("face"),
      listCategory("pool"),
      listCategory("type"),
    ]);
    return NextResponse.json({ face, pool, type });
  }

  const categoryParam = request.nextUrl.searchParams.get("category");
  const category: Category = ALLOWED_CATEGORIES.includes(categoryParam as Category)
    ? (categoryParam as Category)
    : "face";
  const images = await listCategory(category);
  return NextResponse.json({ images });
}
