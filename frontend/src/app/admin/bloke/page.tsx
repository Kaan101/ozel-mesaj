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
          users.map((user) => (
            <Card key={user.userId} className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-display text-base font-bold text-slate">
                    {user.phoneNumber ?? "(numara kayıtlı değil)"}
                  </p>
                  <p className="font-body text-xs text-slate-light">
                    {user.totalReports} şikayet ({user.pendingReports} bekleyen)
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 font-body text-xs font-semibold ${
                    user.status === "suspended"
                      ? "bg-coral-light text-coral"
                      : "bg-meadow-light text-meadow-hover"
                  }`}
                >
                  {user.status === "suspended" ? "Bloke" : "Aktif"}
                </span>
              </div>

              {user.status === "suspended" ? (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleReactivate(user.userId)}
                  disabled={processingId === user.userId}
                >
                  Bloke Kaldır
                </Button>
              ) : (
                <button
                  onClick={() => handleSuspend(user.userId)}
                  disabled={processingId === user.userId}
                  className="w-full rounded-full bg-coral px-4 py-2 font-body text-sm font-semibold text-white hover:bg-coral/90 disabled:opacity-50"
                >
                  Bloke Et
                </button>
              )}
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
