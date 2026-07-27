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

// Kullanici istegi: toksik kelime listesi artik veritabaninda -
// kelime + puan olarak duzenlenebilir.
interface ToxicWord {
  id: string;
  word: string;
  score: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Kullanici istegi: Guardrail yonetim ekrani - toksik kelimeler
// (duzenlenebilir), esik parametresi ve inceleme bekleyen mesajlar
// burada gorulur, admin onaylar/iptal eder.
export default function AdminGuardrailPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [threshold, setThreshold] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [words, setWords] = useState<ToxicWord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [thresholdInput, setThresholdInput] = useState("");
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);

  // Kullanici istegi: mevcut kelimelerin puanini/metnini duzenleyebilme -
  // her satir icin ayri bir taslak (draft) state.
  const [wordDrafts, setWordDrafts] = useState<Record<string, { word: string; score: string }>>(
    {}
  );
  const [newWord, setNewWord] = useState("");
  const [newScore, setNewScore] = useState("40");

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
      fetchWords();
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
      const data: { threshold: number } = await res.json();
      setThreshold(data.threshold);
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
      // Sessizce gec.
    }
  }

  async function fetchWords() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/guardrail/words`, {
        headers: { "x-admin-secret": adminKey },
      });
      if (res.ok) {
        const data: ToxicWord[] = await res.json();
        setWords(data);
        const drafts: Record<string, { word: string; score: string }> = {};
        for (const w of data) drafts[w.id] = { word: w.word, score: String(w.score) };
        setWordDrafts(drafts);
      }
    } catch {
      // Sessizce gec.
    }
  }

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
    if (
      !confirm(
        "Bu mesaj 'Sorun var' olarak işaretlenecek - gönderen kişiye bildirilecek, blok kalıcı olacak. Emin misin?"
      )
    )
      return;
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

  // Kullanici istegi: yeni kelime + puan ekleyebilme.
  async function handleAddWord() {
    if (!newWord.trim()) return;
    try {
      await fetch(`${API_BASE_URL}/admin/guardrail/words`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({ word: newWord.trim(), score: Number(newScore) }),
      });
      setNewWord("");
      setNewScore("40");
      await fetchWords();
    } catch {
      setError("Kelime eklenemedi.");
    }
  }

  // Kullanici istegi: mevcut bir kelimenin metnini/puanini
  // guncelleyebilme.
  async function handleUpdateWord(id: string) {
    const draft = wordDrafts[id];
    if (!draft || !draft.word.trim()) return;
    try {
      await fetch(`${API_BASE_URL}/admin/guardrail/words/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({ word: draft.word.trim(), score: Number(draft.score) }),
      });
      await fetchWords();
    } catch {
      setError("Kelime güncellenemedi.");
    }
  }

  async function handleDeleteWord(id: string) {
    if (!confirm("Bu kelimeyi listeden kaldırmak istediğine emin misin?")) return;
    try {
      await fetch(`${API_BASE_URL}/admin/guardrail/words/${id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": adminKey },
      });
      setWords((prev) => prev.filter((w) => w.id !== id));
    } catch {
      setError("Kelime silinemedi.");
    }
  }

  // Kullanici istegi: ilk kurulumda (bos liste), varsayilan kelimelerle
  // tek tikla doldurabilme.
  async function handleSeedDefaults() {
    try {
      await fetch(`${API_BASE_URL}/admin/guardrail/words/seed-defaults`, {
        method: "POST",
        headers: { "x-admin-secret": adminKey },
      });
      await fetchWords();
    } catch {
      setError("Varsayılan liste yüklenemedi.");
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
          Yazılan mesajlar, aşağıdaki kelime listesine göre toksisite açısından skorlanır
          (0-100). Eşiği aşan mesajlar hemen gönderilmez - karşı taraf otomatik olarak
          göndereni bloke eder, mesaj burada incelemeye düşer.
        </p>

        {isLoading && <p className="font-body text-sm text-slate-light">Yükleniyor...</p>}
        {error && <p className="font-body text-sm text-coral">{error}</p>}

        {/* Esik parametresi */}
        <Card lifted className="space-y-3">
          <h2 className="font-display text-lg font-bold text-slate">Toksik Mesaj Eşiği</h2>
          <p className="font-body text-xs text-slate-light">
            Bir mesajın skoru bu değerin üstündeyse gönderim engellenir (0-100). Düşük değer
            daha sıkı filtreleme demektir. Şu an: <strong>{threshold ?? "—"}</strong>
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

        {/* Duzenlenebilir toksik kelime listesi */}
        <Card lifted className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate">Toksik Kelime Listesi</h2>
            {words.length === 0 && (
              <button
                onClick={handleSeedDefaults}
                className="font-body text-xs text-sky underline underline-offset-2"
              >
                Varsayılan listeyi yükle
              </button>
            )}
          </div>

          {/* Yeni kelime ekleme */}
          <div className="flex items-end gap-2">
            <Input
              label="Yeni Kelime"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="örn. hakaret"
            />
            <Input
              label="Puan"
              type="number"
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              className="max-w-[90px]"
            />
            <Button onClick={handleAddWord} disabled={!newWord.trim()}>
              Ekle
            </Button>
          </div>

          {/* Mevcut kelimeler - duzenlenebilir tablo */}
          {words.length === 0 ? (
            <p className="font-body text-sm text-slate-light">Henüz kelime eklenmedi.</p>
          ) : (
            <div className="space-y-2">
              {words.map((w) => (
                <div key={w.id} className="flex items-center gap-2">
                  <input
                    value={wordDrafts[w.id]?.word ?? ""}
                    onChange={(e) =>
                      setWordDrafts((prev) => ({
                        ...prev,
                        [w.id]: { ...prev[w.id], word: e.target.value },
                      }))
                    }
                    className="flex-1 rounded-2xl border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
                  />
                  <input
                    type="number"
                    value={wordDrafts[w.id]?.score ?? ""}
                    onChange={(e) =>
                      setWordDrafts((prev) => ({
                        ...prev,
                        [w.id]: { ...prev[w.id], score: e.target.value },
                      }))
                    }
                    className="w-20 rounded-2xl border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
                  />
                  <button
                    onClick={() => handleUpdateWord(w.id)}
                    className="rounded-full border-2 border-meadow px-3 py-1.5 font-body text-xs font-semibold text-meadow-hover hover:bg-meadow-light whitespace-nowrap"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => handleDeleteWord(w.id)}
                    className="rounded-full border-2 border-coral px-3 py-1.5 font-body text-xs font-semibold text-coral hover:bg-coral-light whitespace-nowrap"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          )}
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
                <p className="font-body text-xs font-semibold text-slate-light">İçerik</p>
                <p className="font-body text-sm text-slate whitespace-pre-wrap break-words">
                  {m.body}
                </p>
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
                    Sorun Yok
                  </button>
                  <button
                    onClick={() => handleReject(m.messageId)}
                    disabled={processingId === m.messageId}
                    className="rounded-full border-2 border-coral px-3 py-1.5 font-body text-xs font-semibold text-coral hover:bg-coral-light disabled:opacity-50"
                  >
                    Sorun Var
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
