// Kullanici istegi: her release (deploy) sonrasi sayfanin en altinda
// kucuk fontla "Release Date: ..." yazsin ve her release'de otomatik
// guncellensin. "use client" OLMADAN sunucu bilesenidir - bu tarih,
// `next build` calistigi ANDA (yani her deploy sirasinda) bir kere
// hesaplanip statik HTML'e gomulur. Manuel guncelleme gerekmez -
// her `vercel --prod` / otomatik deploy calistiginda kendiliginden
// tazelenir.
const RELEASE_DATE = new Date();

export function ReleaseFooter() {
  const formatted = RELEASE_DATE.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <footer className="py-4 text-center">
      <p className="font-body text-[10px] text-slate-light/60">Release Date: {formatted}</p>
    </footer>
  );
}
