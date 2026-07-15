"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface Report {
  id: string;
  threadId: string;
  reporterUserId: string;
  reason: string | null;
  status: string;
  createdAt: string;
  firstMessageBody: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Kullanici istegi: sikayetleri gorebilecegi ve yonetebilecegi bir
// ekran. Ayni ADMIN_SECRET korumasini kullanir (diger admin
// ekranlarindaki sessionStorage anahtariyla paylasilir).
export default function AdminSikayetlerPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Kullanici istegi: her sikayet icin ayri bir aciklama taslagi -
  // sonuclandirirken bu metin, sikayeti yapan kisiye sistem mesaji
  // olarak gonderilir.
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_secret");
    if (stored) {
      setAdminKey(stored);
      setIsUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked]);

  async function fetchReports() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/safety/reports`, {
        headers: { "x-admin-secret": adminKey },
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Geçersiz yönetim anahtarı." : "Bir hata oluştu.");
      }
      setReports(await res.json());
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

  async function handleUpdateStatus(id: string, status: "reviewed" | "dismissed") {
    try {
      await fetch(`${API_BASE_URL}/safety/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({ status, resolutionNote: resolutionNotes[id]?.trim() || undefined }),
      });
      await fetchReports();
    } catch {
      setError("Güncellenemedi.");
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
          Şikayetler ({reports.length} bekliyor)
        </h1>
        <p className="font-body text-sm text-slate-light">
          Bir şikayeti incelediğinde ya da gereksiz bulduğunda işaretleyebilirsin — kuyruktan çıkar.
        </p>

        {error && <p className="font-body text-sm text-coral">{error}</p>}

        {isLoading ? (
          <p className="font-body text-slate-light">Yükleniyor...</p>
        ) : reports.length === 0 ? (
          <Card>
            <p className="font-body text-slate-light text-center py-6">
              Bekleyen şikayet yok. 🎉
            </p>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-body text-xs text-slate-light">
                  {new Date(report.createdAt).toLocaleString("tr-TR")}
                </span>
                <span className="rounded-full bg-sun/30 px-2 py-0.5 font-body text-xs text-slate">
                  {report.status}
                </span>
              </div>
              {report.reason && (
                <p className="font-body text-sm text-slate">
                  <strong>Sebep:</strong> {report.reason}
                </p>
              )}
              {report.firstMessageBody && (
                <p className="font-body text-sm text-slate-light rounded-xl bg-mint p-2">
                  &quot;{report.firstMessageBody}&quot;
                </p>
              )}
              <p className="font-body text-xs text-slate-light break-all">
                Thread: {report.threadId}
              </p>
              <div>
                <label className="font-body text-xs font-semibold text-slate">
                  Sonuç Açıklaması (şikayet edene sistem mesajı olarak gönderilir)
                </label>
                <textarea
                  value={resolutionNotes[report.id] ?? ""}
                  onChange={(e) =>
                    setResolutionNotes((prev) => ({ ...prev, [report.id]: e.target.value }))
                  }
                  placeholder="Örn: İncelememiz sonucunda gerekli işlem yapılmıştır."
                  rows={2}
                  className="mt-1 w-full rounded-xl border-2 border-sky-light bg-white px-3 py-2 font-body text-sm text-slate focus:outline-none focus:border-sky"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="secondary" onClick={() => handleUpdateStatus(report.id, "reviewed")}>
                  İncelendi
                </Button>
                <button
                  onClick={() => handleUpdateStatus(report.id, "dismissed")}
                  className="rounded-full border-2 border-slate-light/40 bg-white px-4 py-1.5 font-body text-sm text-slate hover:bg-mint"
                >
                  Reddet
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
