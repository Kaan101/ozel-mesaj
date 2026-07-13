"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface Setting {
  key: string;
  label: string;
  description: string;
  value: number;
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
      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({ key, value: Number(editValues[key]) }),
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
        <h1 className="font-display text-2xl font-bold text-slate">
          Sistem Ayarları (Yönetim)
        </h1>
        <p className="font-body text-sm text-slate-light">
          Bu değerler değiştirildiğinde ~10 saniye içinde etkin olur, deploy gerekmez.
        </p>

        {isLoading ? (
          <p className="font-body text-slate-light">Yükleniyor...</p>
        ) : (
          settings.map((setting) => (
            <Card key={setting.key}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h2 className="font-display text-sm font-bold text-slate">{setting.label}</h2>
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
