import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreatePoolEntryDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  question: string;

  @IsString()
  @MinLength(4, { message: "answer en az 4 karakter olmali (brute-force zorlugu icin)." })
  answer: string;

  // Kullanici istegi: kategori artik sabit bir listeye bagli degil,
  // serbest metin - frontend'de daha once girilmis degerler oneri
  // olarak gosteriliyor (bkz. GET /pool/categories).
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsIn(["public", "unlisted"])
  visibility: "public" | "unlisted";

  // Kullanici istegi: "exact" (varsayilan) = dogru cevap otomatik
  // eslesir. "review" = tum yanitlar (dogru/yanlis fark etmeksizin)
  // soru sahibine incelemek uzere dusar.
  @IsOptional()
  @IsIn(["exact", "review"])
  matchMode?: "exact" | "review";
}
