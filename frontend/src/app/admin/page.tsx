"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

// Kullanici istegi: admin sayfalarini konsolide eden bir ana giris
// (hub) ekrani - Ayarlar, Proje Takibi ve Dokumantasyon'a tek yerden
// erisim. Ayni ADMIN_SECRET korumasini (diger admin sayfalariyla
// paylasilan sessionStorage anahtari) kullanir.
export default function AdminHubPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_secret");
    if (stored) {
      setAdminKey(stored);
      setIsUnlocked(true);
    }
  }, []);

  function handleUnlock() {
    sessionStorage.setItem("admin_secret", adminKey);
    setIsUnlocked(true);
    setError(null);
  }

  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-mint flex items-center justify-center px-4">
        <Card lifted className="max-w-sm w-full space-y-4">
          <h1 className="font-display text-xl font-bold text-slate">Yönetim Girişi</h1>
          <Input
            label="Yönetim Anahtarı"
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
          />
          {error && <p className="font-body text-sm text-coral">{error}</p>}
          <Button className="w-full" onClick={handleUnlock} disabled={!adminKey}>
            Giriş Yap
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate">Yönetim Paneli</h1>
          <p className="mt-1 font-body text-sm text-slate-light">
            Sistem ayarları, proje takibi ve dokümantasyona buradan ulaşabilirsin.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/admin/ayarlar">
            <Card lifted className="h-full hover:shadow-soft-lifted transition-shadow">
              <div className="text-3xl mb-2">⚙️</div>
              <h2 className="font-display text-base font-bold text-slate">Sistem Ayarları</h2>
              <p className="mt-1 font-body text-xs text-slate-light">
                Rate-limit ve diğer parametreleri deploy&apos;a gerek kalmadan değiştir.
              </p>
            </Card>
          </Link>

          <Link href="/admin/proje">
            <Card lifted className="h-full hover:shadow-soft-lifted transition-shadow">
              <div className="text-3xl mb-2">📋</div>
              <h2 className="font-display text-base font-bold text-slate">Proje Takibi</h2>
              <p className="mt-1 font-body text-xs text-slate-light">
                Yapılacak görevleri ekle, durumlarını ve önceliklerini takip et.
              </p>
            </Card>
          </Link>

          <Link href="/admin/dokuman">
            <Card lifted className="h-full hover:shadow-soft-lifted transition-shadow">
              <div className="text-3xl mb-2">📖</div>
              <h2 className="font-display text-base font-bold text-slate">Dokümantasyon</h2>
              <p className="mt-1 font-body text-xs text-slate-light">
                Sistemin mimarisi, özellikleri ve önemli notlar.
              </p>
            </Card>
          </Link>

          {/* Kullanici istegi: Sentry (hata izleme) dashboard'una hizli
              erisim - dis bir siteye gittigi icin yeni sekmede acilir. */}
          <a href="https://sentry.io" target="_blank" rel="noopener noreferrer">
            <Card lifted className="h-full hover:shadow-soft-lifted transition-shadow">
              <div className="text-3xl mb-2">🐛</div>
              <h2 className="font-display text-base font-bold text-slate">Sentry (Hata İzleme)</h2>
              <p className="mt-1 font-body text-xs text-slate-light">
                Canlıdaki backend hatalarını görüntüle (yeni sekmede açılır).
              </p>
            </Card>
          </a>

          <Link href="/admin/sikayetler">
            <Card lifted className="h-full hover:shadow-soft-lifted transition-shadow">
              <div className="text-3xl mb-2">🚩</div>
              <h2 className="font-display text-base font-bold text-slate">Şikayetler</h2>
              <p className="mt-1 font-body text-xs text-slate-light">
                Bekleyen şikayetleri görüntüle, incele veya reddet.
              </p>
            </Card>
          </Link>

          <Link href="/admin/gunlukler">
            <Card lifted className="h-full hover:shadow-soft-lifted transition-shadow">
              <div className="text-3xl mb-2">📜</div>
              <h2 className="font-display text-base font-bold text-slate">İşlem Günlükleri</h2>
              <p className="mt-1 font-body text-xs text-slate-light">
                Hukuki ispat için genel günlük, telefon açma, mesaj arşivi.
              </p>
            </Card>
          </Link>

          <Link href="/admin/bloke">
            <Card lifted className="h-full hover:shadow-soft-lifted transition-shadow">
              <div className="text-3xl mb-2">🚫</div>
              <h2 className="font-display text-base font-bold text-slate">Bloke Yönetimi</h2>
              <p className="mt-1 font-body text-xs text-slate-light">
                Bildirilen kullanıcıları listele, bloke et/geri al.
              </p>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}
