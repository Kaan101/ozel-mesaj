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
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  firstMessageBody: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Kullanici istegi (revize): sikayetler sonuclandiginda SILINMEZ -
// tablo hâlinde (bloke ekraniyla ayni desen), AKTIF sikayetler ustte,
// sonuclandirilanlar (incelendi/reddedildi) altta ayri bir tabloda
// gosterilir. Sikayet tarihi + inceleme tarihi + aciklamalar dahil.
export default function AdminSikayetlerPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  const activeReports = reports.filter((r) => r.status === "pending");
  const resolvedReports = reports.filter((r) => r.status !== "pending");

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/admin" className="font-body text-sm text-sky underline underline-offset-2">
          ← Yönetim Paneli
        </Link>
        <h1 className="font-display text-2xl font-bold text-slate">Şikayetler</h1>

        {error && <p className="font-body text-sm text-coral">{error}</p>}

        {isLoading ? (
          <p className="font-body text-slate-light">Yükleniyor...</p>
        ) : (
          <>
            {/* Aktif şikayetler - üstte */}
            <div className="space-y-2">
              <h2 className="font-display text-sm font-bold text-slate-light uppercase tracking-wide">
                Aktif Şikayetler ({activeReports.length})
              </h2>
              {activeReports.length === 0 ? (
                <Card>
                  <p className="font-body text-slate-light text-center py-6">
                    Bekleyen şikayet yok. 🎉
                  </p>
                </Card>
              ) : (
                <Card className="overflow-x-auto p-0">
                  <table className="w-full border-collapse border border-slate-light/60 font-body text-sm">
                    <thead>
                      <tr className="bg-mint">
                        <th className="border border-slate-light/60 px-3 py-3 text-left text-slate font-bold">
                          Şikayet Tarihi
                        </th>
                        <th className="border border-slate-light/60 px-3 py-3 text-left text-slate font-bold">
                          Sebep
                        </th>
                        <th className="border border-slate-light/60 px-3 py-3 text-left text-slate font-bold">
                          Mesaj
                        </th>
                        <th className="border border-slate-light/60 px-3 py-3 text-left text-slate font-bold">
                          Sonuç Açıklaması
                        </th>
                        <th className="border border-slate-light/60 px-3 py-3 text-left text-slate font-bold">
                          İşlem
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeReports.map((report) => (
                        <tr key={report.id}>
                          <td className="border border-slate-light/60 px-3 py-3 text-slate-light whitespace-nowrap align-top">
                            {new Date(report.createdAt).toLocaleString("tr-TR")}
                          </td>
                          <td className="border border-slate-light/60 px-3 py-3 text-slate align-top">
                            {report.reason || "—"}
                          </td>
                          <td className="border border-slate-light/60 px-3 py-3 text-slate-light align-top max-w-[200px]">
                            {report.firstMessageBody ? `"${report.firstMessageBody}"` : "—"}
                          </td>
                          <td className="border border-slate-light/60 px-3 py-3 align-top">
                            <textarea
                              value={resolutionNotes[report.id] ?? ""}
                              onChange={(e) =>
                                setResolutionNotes((prev) => ({
                                  ...prev,
                                  [report.id]: e.target.value,
                                }))
                              }
                              placeholder="Örn: İncelendi, gerekli işlem yapıldı."
                              rows={2}
                              className="w-full min-w-[160px] rounded-xl border-2 border-sky-light bg-white px-2 py-1.5 font-body text-xs text-slate focus:outline-none focus:border-sky"
                            />
                          </td>
                          <td className="border border-slate-light/60 px-3 py-3 align-top">
                            <div className="flex flex-col gap-1.5">
                              <button
                                onClick={() => handleUpdateStatus(report.id, "reviewed")}
                                className="rounded-full bg-meadow px-3 py-1.5 font-body text-xs font-semibold text-white hover:bg-meadow-hover whitespace-nowrap"
                              >
                                İncelendi
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(report.id, "dismissed")}
                                className="rounded-full border-2 border-slate-light/40 bg-white px-3 py-1.5 font-body text-xs text-slate hover:bg-mint whitespace-nowrap"
                              >
                                Reddet
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>

            {/* Sonuçlandırılmış şikayetler - altta */}
            <div className="space-y-2">
              <h2 className="font-display text-sm font-bold text-slate-light uppercase tracking-wide">
                Sonuçlandırılmış Şikayetler ({resolvedReports.length})
              </h2>
              {resolvedReports.length === 0 ? (
                <Card>
                  <p className="font-body text-slate-light text-center py-6">
                    Henüz sonuçlandırılmış şikayet yok.
                  </p>
                </Card>
              ) : (
                <Card className="overflow-x-auto p-0">
                  <table className="w-full border-collapse border border-slate-light/60 font-body text-sm">
                    <thead>
                      <tr className="bg-mint">
                        <th className="border border-slate-light/60 px-3 py-3 text-left text-slate font-bold">
                          Şikayet Tarihi
                        </th>
                        <th className="border border-slate-light/60 px-3 py-3 text-left text-slate font-bold">
                          İnceleme Tarihi
                        </th>
                        <th className="border border-slate-light/60 px-3 py-3 text-left text-slate font-bold">
                          Sebep
                        </th>
                        <th className="border border-slate-light/60 px-3 py-3 text-left text-slate font-bold">
                          Açıklama
                        </th>
                        <th className="border border-slate-light/60 px-3 py-3 text-left text-slate font-bold">
                          Durum
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {resolvedReports.map((report) => (
                        <tr key={report.id}>
                          <td className="border border-slate-light/60 px-3 py-3 text-slate-light whitespace-nowrap">
                            {new Date(report.createdAt).toLocaleString("tr-TR")}
                          </td>
                          <td className="border border-slate-light/60 px-3 py-3 text-slate-light whitespace-nowrap">
                            {report.resolvedAt
                              ? new Date(report.resolvedAt).toLocaleString("tr-TR")
                              : "—"}
                          </td>
                          <td className="border border-slate-light/60 px-3 py-3 text-slate">
                            {report.reason || "—"}
                          </td>
                          <td className="border border-slate-light/60 px-3 py-3 text-slate-light">
                            {report.resolutionNote || "—"}
                          </td>
                          <td className="border border-slate-light/60 px-3 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                report.status === "reviewed"
                                  ? "bg-meadow-light text-meadow-hover"
                                  : "bg-coral-light text-coral"
                              }`}
                            >
                              {report.status === "reviewed" ? "İncelendi" : "Reddedildi"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
