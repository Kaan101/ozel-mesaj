"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface ReportedUser {
  userId: string;
  phoneNumber: string | null;
  status: "active" | "suspended" | "deleted";
  totalReports: number;
  pendingReports: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Kullanici istegi: bildirilen (Bildir) kullanicilari telefon
// numaralariyla listeleyen, gerekirse bloke edip (hesabi askiya
// alarak - giris yapamaz olur) geri alinabilen bir yonetim ekrani.
export default function AdminBlokePage() {
  const [adminKey, setAdminKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [users, setUsers] = useState<ReportedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_secret");
    if (stored) {
      setAdminKey(stored);
      setIsUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked]);

  async function fetchUsers() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/safety/reported-users`, {
        headers: { "x-admin-secret": adminKey },
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Geçersiz yönetim anahtarı." : "Bir hata oluştu.");
      }
      setUsers(await res.json());
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

  async function handleSuspend(userId: string) {
    if (!confirm("Bu kullanıcıyı bloke etmek (hesabını askıya almak) istediğine emin misin?")) {
      return;
    }
    setProcessingId(userId);
    try {
      await fetch(`${API_BASE_URL}/safety/users/${userId}/suspend`, {
        method: "POST",
        headers: { "x-admin-secret": adminKey },
      });
      await fetchUsers();
    } catch {
      setError("İşlem başarısız oldu.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReactivate(userId: string) {
    setProcessingId(userId);
    try {
      await fetch(`${API_BASE_URL}/safety/users/${userId}/reactivate`, {
        method: "POST",
        headers: { "x-admin-secret": adminKey },
      });
      await fetchUsers();
    } catch {
      setError("İşlem başarısız oldu.");
    } finally {
      setProcessingId(null);
    }
  }

  // Kullanici istegi: tablodan bir kaydi (bu kullaniciya ait tum
  // sikayetleri) sil - kullanicinin hesap durumunu etkilemez.
  async function handleDeleteRecord(userId: string) {
    if (!confirm("Bu kaydı (bu kullanıcıya ait tüm şikayetleri) silmek istediğine emin misin?")) {
      return;
    }
    setProcessingId(userId);
    try {
      await fetch(`${API_BASE_URL}/safety/reported-users/${userId}`, {
        method: "DELETE",
        headers: { "x-admin-secret": adminKey },
      });
      setUsers((prev) => prev.filter((u) => u.userId !== userId));
    } catch {
      setError("İşlem başarısız oldu.");
    } finally {
      setProcessingId(null);
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
        <h1 className="font-display text-2xl font-bold text-slate">Bloke Yönetimi</h1>
        <p className="font-body text-sm text-slate-light">
          Bildirilen (şikayet edilen) kullanıcılar telefon numaralarıyla birlikte listelenir.
          Gerekirse bloke edebilir (hesabını askıya alabilir), istediğin zaman geri alabilirsin.
        </p>

        {error && <p className="font-body text-sm text-coral">{error}</p>}

        {isLoading ? (
          <p className="font-body text-slate-light">Yükleniyor...</p>
        ) : users.length === 0 ? (
          <Card>
            <p className="font-body text-slate-light text-center py-6">
              Bildirilen bir kullanıcı yok.
            </p>
          </Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full border-collapse border border-slate-light/60 font-body text-sm">
              <thead>
                <tr className="bg-mint">
                  <th className="border border-slate-light/60 px-4 py-3 text-left text-slate font-bold">
                    Telefon
                  </th>
                  <th className="border border-slate-light/60 px-4 py-3 text-left text-slate font-bold">
                    Şikayet
                  </th>
                  <th className="border border-slate-light/60 px-4 py-3 text-left text-slate font-bold">
                    Durum
                  </th>
                  <th className="border border-slate-light/60 px-4 py-3 text-left text-slate font-bold">
                    İşlem
                  </th>
                  <th className="border border-slate-light/60 px-4 py-3 text-left text-slate font-bold">
                    Kayıt
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.userId}>
                    <td className="border border-slate-light/60 px-4 py-3 font-display font-bold text-slate whitespace-nowrap">
                      {user.phoneNumber ?? "(kayıtlı değil)"}
                    </td>
                    <td className="border border-slate-light/60 px-4 py-3 text-slate-light whitespace-nowrap">
                      {user.totalReports} ({user.pendingReports} bekleyen)
                    </td>
                    <td className="border border-slate-light/60 px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          user.status === "suspended"
                            ? "bg-coral-light text-coral"
                            : "bg-meadow-light text-meadow-hover"
                        }`}
                      >
                        {user.status === "suspended" ? "Bloke" : "Aktif"}
                      </span>
                    </td>
                    <td className="border border-slate-light/60 px-4 py-3">
                      {user.status === "suspended" ? (
                        <button
                          onClick={() => handleReactivate(user.userId)}
                          disabled={processingId === user.userId}
                          className="rounded-full border-2 border-meadow px-3 py-1.5 font-body text-xs font-semibold text-meadow-hover hover:bg-meadow-light disabled:opacity-50 whitespace-nowrap"
                        >
                          Bloke Kaldır
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(user.userId)}
                          disabled={processingId === user.userId}
                          className="rounded-full bg-coral px-3 py-1.5 font-body text-xs font-semibold text-white hover:bg-coral/90 disabled:opacity-50 whitespace-nowrap"
                        >
                          Bloke Et
                        </button>
                      )}
                    </td>
                    <td className="border border-slate-light/60 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(user.userId)}
                        disabled={processingId === user.userId}
                        className="rounded-full p-1.5 text-xs text-slate-light hover:bg-coral-light hover:text-coral disabled:opacity-50"
                        aria-label="Kaydı Sil"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </main>
  );
}
