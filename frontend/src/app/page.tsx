import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConnectionIllustration } from "@/components/ui/ConnectionIllustration";

// Gorev 14.1-14.4: Landing page. Hero (deger onerisi + 2 CTA), "nasil
// calisir" (gercek bir 3 adimli surec oldugu icin numaralandirildi),
// guven unsurlari (gizlilik/guvenlik one plana cikarilir - hassas bir
// urun oldugu icin bu bolum susleme degil, gercek icerik).
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-mint">
      {/* Nav */}
      <header className="mx-auto max-w-5xl px-4 py-6 flex items-center justify-between">
        <span className="font-display text-xl font-bold text-slate">YouHaveMi</span>
        <nav className="flex items-center gap-4">
          <Link href="/havuz" className="font-body text-sm text-slate-light hover:text-slate">
            Havuz
          </Link>
          <Link href="/giris">
            <Button variant="ghost">Giriş Yap</Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-8 md:py-16">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="font-display text-4xl font-bold text-slate leading-tight md:text-5xl">
              Ona söylemek istediğin şeyi,{" "}
              <span className="text-sky">doğru şekilde</span> ulaştır.
            </h1>
            <p className="mt-4 font-body text-lg text-slate-light">
              Beğendiğin birine mesaj atmak bazen zor. YouHaveMi, kimliğini istersen gizli
              tutarak, doğru kişiye ulaştığından emin olarak ilk adımı atmanı sağlar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/mesaj/olustur">
                <Button variant="primary">Ona Mesaj Gönder</Button>
              </Link>
              <Link href="/havuz">
                <Button variant="secondary">Havuza Göz At</Button>
              </Link>
            </div>
          </div>
          <ConnectionIllustration className="w-full h-auto max-w-sm mx-auto md:max-w-none" />
        </div>
      </section>

      {/* Nasil calisir - gercek bir surec oldugu icin numaralandirma anlamli */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-slate text-center mb-10">
          Nasıl çalışır?
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky font-display font-bold text-white">
              1
            </div>
            <h3 className="font-display text-base font-bold text-slate">Mesajını bırak</h3>
            <p className="mt-1 font-body text-sm text-slate-light">
              Numarasını girip mesajını yaz, bir parola veya soru ile kilitle.
            </p>
          </Card>
          <Card className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky font-display font-bold text-white">
              2
            </div>
            <h3 className="font-display text-base font-bold text-slate">SMS gider</h3>
            <p className="mt-1 font-body text-sm text-slate-light">
              Karşı taraf, birinin ona ulaşmaya çalıştığını gösteren bir SMS alır.
            </p>
          </Card>
          <Card className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky font-display font-bold text-white">
              3
            </div>
            <h3 className="font-display text-base font-bold text-slate">Doğru kişi okur</h3>
            <p className="mt-1 font-body text-sm text-slate-light">
              Parolayı/cevabı bilen kişi mesajı açar, isterse yanıtlar.
            </p>
          </Card>
        </div>
      </section>

      {/* Guven unsurlari - susleme degil, gercek icerik (hassas bir urun) */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-slate text-center mb-10">
          Güvenliğin bizim için önemli
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <h3 className="font-display text-base font-bold text-slate">
              🔒 Numaran asla görünmez
            </h3>
            <p className="mt-1 font-body text-sm text-slate-light">
              Anonim kalmayı seçersen, karşı taraf telefon numaranı hiçbir zaman göremez.
            </p>
          </Card>
          <Card>
            <h3 className="font-display text-base font-bold text-slate">
              🔑 Parolan hash&apos;lenir
            </h3>
            <p className="mt-1 font-body text-sm text-slate-light">
              Belirlediğin parola/cevap düz metin olarak hiçbir yerde saklanmaz.
            </p>
          </Card>
          <Card>
            <h3 className="font-display text-base font-bold text-slate">🚫 Engelle & Şikayet Et</h3>
            <p className="mt-1 font-body text-sm text-slate-light">
              İstenmeyen bir mesaj alırsan tek tıkla engelleyebilir, şikayet edebilirsin.
            </p>
          </Card>
          <Card>
            <h3 className="font-display text-base font-bold text-slate">🗑️ Verini istediğinde sil</h3>
            <p className="mt-1 font-body text-sm text-slate-light">
              Hesabını sildiğinde tüm verilerin kalıcı olarak silinir (KVKK uyumlu).
            </p>
          </Card>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-4 py-10 text-center">
        <p className="font-body text-xs text-slate-light">
          © {new Date().getFullYear()} YouHaveMi. Tüm hakları saklıdır.
        </p>
      </footer>
    </main>
  );
}
