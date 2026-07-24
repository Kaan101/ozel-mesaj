"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface Setting {
  key: string;
  label: string;
  description: string;
  value: number | string;
  type: "number" | "string";
  isDefault: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Yonetim ekrani: rate-limit vb. parametreleri deploy'a gerek kalmadan
// degistirmeyi saglar (kullanici geri bildirimi - test surecinde sabit
// limitler zorluk cikariyordu). ADMIN_SECRET anahtariyla korunur -
// bu ekran genel navigasyonda hic linklenmez, sadece URL'yi bilenler
// erisir.
export default function AdminAyarlarPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  // Kullanici istegi: hem parametre adina (label) hem anahtarina (key)
  // gore filtreleyen bir arama kutusu.
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_secret");
    if (stored) {
      setAdminKey(stored);
      setIsUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked]);

  async function fetchSettings() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        headers: { "x-admin-secret": adminKey },
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Geçersiz yönetim anahtarı." : "Bir hata oluştu.");
      }
      const data: Setting[] = await res.json();
      setSettings(data);
      const initialEdits: Record<string, string> = {};
      data.forEach((s) => (initialEdits[s.key] = String(s.value)));
      setEditValues(initialEdits);
    } catch (err: any) {
      setError(err.message);
      setIsUnlocked(false);
      sessionStorage.removeItem("admin_secret");
    } finally {
      setIsLoading(false);
    }
  }

  function handleUnlock() {
    sessionStorage.setItem("admin_secret", adminKey);
    setIsUnlocked(true);
  }

  async function handleSave(key: string) {
    setSavingKey(key);
    setError(null);
    try {
      // Kullanici istegi: string tipi parametreler (e-posta, adres
      // gibi) Number()'a cevrilmeden, oldugu gibi gonderilir.
      const setting = settings.find((s) => s.key === key);
      const rawValue = editValues[key];
      const value = setting?.type === "string" ? rawValue : Number(rawValue);

      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error("Kaydedilemedi.");
      await fetchSettings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingKey(null);
    }
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
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/admin" className="font-body text-sm text-sky underline underline-offset-2">
          ← Yönetim Paneli
        </Link>
        <h1 className="font-display text-2xl font-bold text-slate">
          Sistem Ayarları (Yönetim)
        </h1>
        <p className="font-body text-sm text-slate-light">
          Bu değerler değiştirildiğinde ~10 saniye içinde etkin olur, deploy gerekmez.
        </p>

        {/* Kullanici istegi: hem parametre adina (label) hem
            anahtarina (key) gore filtreleyen bir arama kutusu. */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Parametre adı veya anahtarına göre ara..."
          className="w-full rounded-2xl border-2 border-sky-light bg-white px-4 py-3 font-body text-slate focus:outline-none focus:border-sky"
        />

        {/* Kullanici istegi: ALLOWED_ORIGINS bilgi amacli - bu, veritabani
            tabanli sistem ayarlarindan degil, Railway'de env degiskeni
            olarak yonetiliyor. Degeri (guvenlik/konfigurasyon bilgisi
            oldugu icin) burada gosterilmez, sadece varligindan haberdar
            edilir. */}
        {"ALLOWED_ORIGINS".toLowerCase().includes(searchQuery.toLowerCase()) && (
          <Card className="border-2 border-sun/40 bg-sun/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-bold text-slate">
                  ALLOWED_ORIGINS
                </h2>
                <p className="mt-0.5 font-body text-xs text-slate-light">
                  CORS icin izin verilen kaynaklar - bu ekrandan degil, Railway&apos;deki
                  Variables (ortam degiskenleri) uzerinden yonetiliyor. Deger burada
                  gosterilmez.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-sun/30 px-2 py-0.5 font-body text-xs text-slate">
                Sadece bilgi
              </span>
            </div>
          </Card>
        )}

        {isLoading ? (
          <p className="font-body text-slate-light">Yükleniyor...</p>
        ) : (
          settings
            .filter((setting) => {
              const q = searchQuery.trim().toLowerCase();
              if (!q) return true;
              return (
                setting.label.toLowerCase().includes(q) ||
                setting.key.toLowerCase().includes(q)
              );
            })
            .map((setting) => (
              <Card key={setting.key}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="font-display text-sm font-bold text-slate">
                      {setting.label}{" "}
                      {/* Kullanici istegi: parametre adinin yaninda
                          kendi anahtari (key) da gorunsun - hangi env
                          degiskenine/ayara karsilik geldigi net olsun. */}
                      <span className="font-body text-xs font-normal text-slate-light">
                        ({setting.key})
                      </span>
                    </h2>
                    <p className="mt-0.5 font-body text-xs text-slate-light">
                      {setting.description}
                    </p>
                    {setting.isDefault && (
                      <span className="mt-1 inline-block rounded-full bg-sky-light px-2 py-0.5 font-body text-xs text-sky">
                        Varsayılan değer kullanılıyor
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      value={editValues[setting.key] ?? ""}
                      onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
                      }
                      className="w-24"
                      inputMode="numeric"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => handleSave(setting.key)}
                      disabled={savingKey === setting.key}
                    >
                      {savingKey === setting.key ? "..." : "Kaydet"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
        )}

        {error && <p className="font-body text-sm text-coral">{error}</p>}
      </div>
    </main>
  );
}
