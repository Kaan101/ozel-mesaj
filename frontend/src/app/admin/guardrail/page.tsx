"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

// Kullanici istegi: toksisite skorlamasindan gecen (esigi asan)
// mesajlar - inceleme bekliyor.
interface PendingMessage {
  messageId: string;
  threadId: string;
  body: string;
  toxicityScore: number | null;
  createdAt: string;
  senderPhone: string | null;
  senderDisplayName: string | null;
  recipientPhone: string | null;
}

interface GuardrailInfo {
  threshold: number;
  severeWords: string[];
  mildWords: string[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Kullanici istegi: Guardrail yonetim ekrani - toksik kelimeler,
// esik parametresi ve inceleme bekleyen mesajlar burada gorulur,
// admin onaylar/iptal eder.
export default function AdminGuardrailPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [info, setInfo] = useState<GuardrailInfo | null>(null);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [thresholdInput, setThresholdInput] = useState("");
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_secret");
    if (stored) {
      setAdminKey(stored);
      setIsUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      fetchInfo();
      fetchPending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked]);

  async function fetchInfo() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/guardrail`, {
        headers: { "x-admin-secret": adminKey },
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Geçersiz yönetim anahtarı." : "Bir hata oluştu.");
      }
      const data: GuardrailInfo = await res.json();
      setInfo(data);
      setThresholdInput(String(data.threshold));
    } catch (err: any) {
      setError(err.message);
      setIsUnlocked(false);
      sessionStorage.removeItem("admin_secret");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchPending() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/guardrail/pending`, {
        headers: { "x-admin-secret": adminKey },
      });
      if (res.ok) setPending(await res.json());
    } catch {
      // Sessizce gec - ust bilgi (esik/kelimeler) daha kritik.
    }
  }

  // Kullanici istegi: esik parametresini bu ekrandan da
  // guncelleyebilme (ayni /admin/settings PATCH endpoint'i).
  async function handleSaveThreshold() {
    setIsSavingThreshold(true);
    try {
      await fetch(`${API_BASE_URL}/admin/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({ key: "TOXIC_MESSAGE_THRESHOLD", value: Number(thresholdInput) }),
      });
      await fetchInfo();
    } catch {
      setError("Eşik güncellenemedi.");
    } finally {
      setIsSavingThreshold(false);
    }
  }

  async function handleApprove(messageId: string) {
    setProcessingId(messageId);
    try {
      await fetch(`${API_BASE_URL}/admin/guardrail/messages/${messageId}/approve`, {
        method: "POST",
        headers: { "x-admin-secret": adminKey },
      });
      setPending((prev) => prev.filter((m) => m.messageId !== messageId));
    } catch {
      setError("İşlem başarısız oldu.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(messageId: string) {
    if (!confirm("Bu mesaj kalıcı olarak iptal edilecek. Emin misin?")) return;
    setProcessingId(messageId);
    try {
      await fetch(`${API_BASE_URL}/admin/guardrail/messages/${messageId}/reject`, {
        method: "POST",
        headers: { "x-admin-secret": adminKey },
      });
      setPending((prev) => prev.filter((m) => m.messageId !== messageId));
    } catch {
      setError("İşlem başarısız oldu.");
    } finally {
      setProcessingId(null);
    }
  }

  function handleUnlock() {
    sessionStorage.setItem("admin_secret", adminKey);
    setIsUnlocked(true);
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
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/admin" className="font-body text-sm text-sky underline underline-offset-2">
          ← Yönetim Paneli
        </Link>
        <h1 className="font-display text-2xl font-bold text-slate">Guardrail Yönetimi</h1>
        <p className="font-body text-sm text-slate-light">
          Yazılan mesajlar, anahtar kelime/küfür listesiyle toksisite açısından skorlanır (0-100).
          Eşiği aşan mesajlar hemen gönderilmez - karşı taraf otomatik olarak göndereni bloke
          eder, mesaj burada incelemeye düşer.
        </p>

        {isLoading && <p className="font-body text-sm text-slate-light">Yükleniyor...</p>}
        {error && <p className="font-body text-sm text-coral">{error}</p>}

        {/* Esik parametresi */}
        <Card lifted className="space-y-3">
          <h2 className="font-display text-lg font-bold text-slate">Toksik Mesaj Eşiği</h2>
          <p className="font-body text-xs text-slate-light">
            Bir mesajın skoru bu değerin üstündeyse gönderim engellenir (0-100). Düşük değer
            daha sıkı filtreleme demektir.
          </p>
          <div className="flex items-end gap-2">
            <Input
              label="Eşik Değeri"
              type="number"
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              className="max-w-[120px]"
            />
            <Button onClick={handleSaveThreshold} disabled={isSavingThreshold}>
              {isSavingThreshold ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </Card>

        {/* Toksik kelime listeleri */}
        <Card lifted className="space-y-3">
          <h2 className="font-display text-lg font-bold text-slate">Toksik Kelime Listesi</h2>
          <div>
            <p className="font-body text-xs font-semibold text-coral">Ağır (40 puan)</p>
            <p className="font-body text-sm text-slate-light">{info?.severeWords.join(", ")}</p>
          </div>
          <div>
            <p className="font-body text-xs font-semibold text-slate">Hafif (20 puan)</p>
            <p className="font-body text-sm text-slate-light">{info?.mildWords.join(", ")}</p>
          </div>
        </Card>

        {/* Inceleme bekleyen mesajlar */}
        <h2 className="font-display text-lg font-bold text-slate">
          İncelemedeki Mesajlar ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="font-body text-sm text-slate-light">İncelemede mesaj yok.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((m) => (
              <Card key={m.messageId} lifted className="space-y-2">
                <p className="font-body text-sm text-slate">{m.body}</p>
                <p className="font-body text-xs text-slate-light">
                  Skor: <span className="font-semibold text-coral">{m.toxicityScore}</span> ·{" "}
                  {m.senderPhone ?? "—"}
                  {m.senderDisplayName && ` (${m.senderDisplayName})`} → {m.recipientPhone ?? "—"}
                  {" · "}
                  {new Date(m.createdAt).toLocaleString("tr-TR")}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(m.messageId)}
                    disabled={processingId === m.messageId}
                    className="rounded-full border-2 border-meadow px-3 py-1.5 font-body text-xs font-semibold text-meadow-hover hover:bg-meadow-light disabled:opacity-50"
                  >
                    Onayla
                  </button>
                  <button
                    onClick={() => handleReject(m.messageId)}
                    disabled={processingId === m.messageId}
                    className="rounded-full border-2 border-coral px-3 py-1.5 font-body text-xs font-semibold text-coral hover:bg-coral-light disabled:opacity-50"
                  >
                    İptal Et
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
