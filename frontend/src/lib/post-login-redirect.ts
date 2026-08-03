// Kullanici istegi: giris sonrasi, "next" query parametresi verilmisse
// (orn. korumali bir sayfaya erismeye calisirken giris'e yonlendirildi)
// ONA saygi gosterilir. Verilmemisse (dogrudan giris yapildiysa),
// kullanici HER ZAMAN kisisellestirilmis /panel'e yonlendirilir
// (eskiden sadece "aktif" kullanicilar icin gecerliydi).
export async function getPostLoginRedirect(nextParam: string | null): Promise<string> {
  if (nextParam) return nextParam;
  return "/panel";
}
