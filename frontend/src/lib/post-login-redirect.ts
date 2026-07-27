import { apiFetch } from "./api-client";

// Kullanici istegi: giris sonrasi, "next" query parametresi verilmisse
// (orn. korumali bir sayfaya erismeye calisirken giris'e yonlendirildi)
// ONA saygi gosterilir. Verilmemisse (dogrudan giris yapildiysa),
// kullanici daha once mesaj atmis/havuza soru birakmis mi kontrol
// edilir - "aktif" ise kisisellestirilmis /panel'e, degilse genel
// landing page'e ("/") yonlendirilir.
export async function getPostLoginRedirect(nextParam: string | null): Promise<string> {
  if (nextParam) return nextParam;

  try {
    const { hasActivity } = await apiFetch<{ hasActivity: boolean }>("/me/has-activity");
    return hasActivity ? "/panel" : "/";
  } catch {
    return "/"; // Kontrol basarisiz olursa guvenli varsayilan.
  }
}
