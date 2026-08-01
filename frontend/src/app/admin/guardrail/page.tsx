"use client";

import { useEffect, useMemo, useState } from "react";
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

// Kullanici istegi: "inceleme altindaki" (isUnderReview) kisiler -
// bunlarin TUM mesajlari (icerik ne olursa olsun) otomatik pending'e
// duser, admin manuel olarak "incelemeden cikarana" kadar.
interface UserUnderReview {
  userId: string;
  displayName: string | null;
  violationCount: number;
  phone: string | null;
}

// Kullanici istegi: toksik kelime listesi artik veritabaninda -
// kelime + puan olarak duzenlenebilir. Ayni puana sahip kelimeler
// TEK bir grupta (metin alaninda, virgulle ayrilmis) yonetilir.
interface ToxicWord {
  id: string;
  word: string;
  score: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Kullanici istegi: Guardrail yonetim ekrani - toksik kelimeler
// (puana gore gruplu, toplu duzenlenebilir), esik parametresi ve
// inceleme bekleyen mesajlar burada gorulur, admin onaylar/iptal eder.
export default function AdminGuardrailPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [threshold, setThreshold] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [underReview, setUnderReview] = useState<UserUnderReview[]>([]);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [words, setWords] = useState<ToxicWord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [thresholdInput, setThresholdInput] = useState("");
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);

  // Kullanici istegi: puana gore gruplanmis kelimeler icin, her
  // grubun DUZENLENEN (henuz kaydedilmemis) metnini tutan taslak
  // state - anahtar = puan degeri.
  const [groupDrafts, setGroupDrafts] = useState<Record<number, string>>({});
  const [savingScore, setSavingScore] = useState<number | null>(null);

  // Kullanici istegi: yeni bir puan grubu (birden fazla kelime, tek
  // puanla) eklenebilsin.
  const [newGroupScore, setNewGroupScore] = useState("40");
  const [newGroupWords, setNewGroupWords] = useState("");
  const [isAddingGroup, setIsAddingGroup] = useState(false);

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
      fetchUnderReview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked]);

  // Kullanici istegi: kelimeler puana gore gruplanir - her grup icin
  // taslak metni (words.join(", ")) hesaplanir.
  const groupedByScore = useMemo(() => {
    const groups = new Map<number, ToxicWord[]>();
    for (const w of words) {
      if (!groups.has(w.score)) groups.set(w.score, []);
      groups.get(w.score)!.push(w);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [words]);

  useEffect(() => {
    const drafts: Record<number, string> = {};
    for (const [score, list] of groupedByScore) {
      drafts[score] = list.map((w) => w.word).join(", ");
    }
    setGroupDrafts(drafts);
  }, [groupedByScore]);

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

  // Kullanici istegi: su an inceleme altinda olan kisileri cekme.
  async function fetchUnderReview() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/guardrail/under-review`, {
        headers: { "x-admin-secret": adminKey },
      });
      if (res.ok) setUnderReview(await res.json());
    } catch {
      // Sessizce gec.
    }
  }

  // Kullanici istegi: admin, bir kisiyi inceleme durumundan cikarir -
  // mesajlari tekrar normal (skor bazli) degerlendirilir.
  async function handleExitReview(userId: string) {
    if (!confirm("Bu kişi incelemeden çıkarılacak - mesajları tekrar normal değerlendirilecek. Emin misin?"))
      return;
    setExitingId(userId);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/guardrail/under-review/${userId}/exit`, {
        method: "POST",
        headers: { "x-admin-secret": adminKey },
      });
      if (!res.ok) throw new Error();
      setUnderReview((prev) => prev.filter((u) => u.userId !== userId));
    } catch {
      setError("İşlem başarısız oldu.");
    } finally {
      setExitingId(null);
    }
  }

  async function fetchWords() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/guardrail/words`, {
        headers: { "x-admin-secret": adminKey },
      });
      if (res.ok) setWords(await res.json());
    } catch {
      // Sessizce gec.
    }
  }

  async function handleSaveThreshold() {
    setIsSavingThreshold(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({ key: "TOXIC_MESSAGE_THRESHOLD", value: Number(thresholdInput) }),
      });
      if (!res.ok) throw new Error();
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
      const res = await fetch(`${API_BASE_URL}/admin/guardrail/messages/${messageId}/approve`, {
        method: "POST",
        headers: { "x-admin-secret": adminKey },
      });
      if (!res.ok) throw new Error();
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
      const res = await fetch(`${API_BASE_URL}/admin/guardrail/messages/${messageId}/reject`, {
        method: "POST",
        headers: { "x-admin-secret": adminKey },
      });
      if (!res.ok) throw new Error();
      setPending((prev) => prev.filter((m) => m.messageId !== messageId));
      // Kullanici istegi: "Sorun Var" onaylanan kisi inceleme altina
      // girer - listeyi tazeliyoruz.
      await fetchUnderReview();
    } catch {
      setError("İşlem başarısız oldu.");
    } finally {
      setProcessingId(null);
    }
  }

  // Kullanici istegi: bir puan grubunun metnini (virgul/satirla
  // ayrilmis kelimeler) duzenleyip "Kaydet" - yeni/degisen kelimeler
  // upsert edilir, metinden CIKARILAN kelimeler silinir.
  async function handleSaveGroup(score: number) {
    setSavingScore(score);
    setError(null);
    setSuccessMessage(null);
    try {
      const draftWords = (groupDrafts[score] ?? "")
        .split(/[,\n]/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0);

      const originalWords = groupedByScore.find(([s]) => s === score)?.[1] ?? [];
      const originalWordSet = new Set(originalWords.map((w) => w.word));
      const draftWordSet = new Set(draftWords);

      // Metinden cikarilan (artik listede olmayan) kelimeler silinir.
      const toDelete = originalWords.filter((w) => !draftWordSet.has(w.word));

      const bulkRes = await fetch(`${API_BASE_URL}/admin/guardrail/words/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({ words: draftWords, score }),
      });
      if (!bulkRes.ok) throw new Error();

      for (const w of toDelete) {
        await fetch(`${API_BASE_URL}/admin/guardrail/words/${w.id}`, {
          method: "DELETE",
          headers: { "x-admin-secret": adminKey },
        });
      }

      setSuccessMessage(`${draftWordSet.size} kelimelik ${score} puanlık grup kaydedildi.`);
      await fetchWords();
    } catch {
      setError("Grup kaydedilemedi.");
    } finally {
      setSavingScore(null);
    }
  }

  async function handleDeleteGroup(score: number) {
    const groupWords = groupedByScore.find(([s]) => s === score)?.[1] ?? [];
    if (!confirm(`${score} puanlık grubun tamamı (${groupWords.length} kelime) silinecek. Emin misin?`))
      return;
    setSavingScore(score);
    try {
      for (const w of groupWords) {
        await fetch(`${API_BASE_URL}/admin/guardrail/words/${w.id}`, {
          method: "DELETE",
          headers: { "x-admin-secret": adminKey },
        });
      }
      await fetchWords();
    } catch {
      setError("Grup silinemedi.");
    } finally {
      setSavingScore(null);
    }
  }

  // Kullanici istegi: istenildigi kadar puana gore AYRI kelime
  // grubu eklenebilsin - yeni bir puan + birden fazla kelime.
  async function handleAddGroup() {
    const wordsList = newGroupWords
      .split(/[,\n]/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    if (wordsList.length === 0) return;

    setIsAddingGroup(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/guardrail/words/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({ words: wordsList, score: Number(newGroupScore) }),
      });
      if (!res.ok) throw new Error();
      setNewGroupWords("");
      setSuccessMessage(`${wordsList.length} kelime, ${newGroupScore} puanla eklendi.`);
      await fetchWords();
    } catch {
      setError("Grup eklenemedi.");
    } finally {
      setIsAddingGroup(false);
    }
  }

  // Kullanici istegi: varsayilan kelimeler artik uygulama baslarken
  // OTOMATIK yuklenir (tablo bossa) - bu buton sadece manuel/tekrar
  // tetiklemek isteyenler icin (orn. bazi varsayilan kelimeleri
  // silip fikrini degistirenler).
  async function handleSeedDefaults() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/guardrail/words/seed-defaults`, {
        method: "POST",
        headers: { "x-admin-secret": adminKey },
      });
      if (!res.ok) throw new Error();
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
        {successMessage && (
          <p className="font-body text-sm text-meadow-hover">{successMessage}</p>
        )}

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

        {/* Puana gore gruplanmis, toplu duzenlenebilir kelime listesi */}
        <Card lifted className="space-y-4">
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
          <p className="font-body text-xs text-slate-light">
            Her kart bir PUAN grubudur - o puana sahip tüm kelimeler tek alanda, virgülle
            ayrılmış olarak düzenlenir. İstediğin kadar farklı puanlı grup ekleyebilirsin.
          </p>

          {/* Mevcut puan gruplari */}
          {groupedByScore.map(([score, list]) => (
            <div key={score} className="rounded-2xl border-2 border-slate-light/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-body text-sm font-semibold text-slate">
                  Puan: {score} <span className="text-slate-light">({list.length} kelime)</span>
                </p>
                <button
                  onClick={() => handleDeleteGroup(score)}
                  className="font-body text-xs text-coral underline underline-offset-2"
                >
                  Grubu Sil
                </button>
              </div>
              <textarea
                value={groupDrafts[score] ?? ""}
                onChange={(e) =>
                  setGroupDrafts((prev) => ({ ...prev, [score]: e.target.value }))
                }
                rows={2}
                className="w-full resize-none rounded-2xl border-2 border-sky-light bg-white px-3 py-2 font-body text-sm text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
              />
              <Button
                onClick={() => handleSaveGroup(score)}
                disabled={savingScore === score}
                variant="secondary"
              >
                {savingScore === score ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          ))}

          {/* Yeni puan grubu ekleme */}
          <div className="rounded-2xl border-2 border-dashed border-slate-light/40 p-3 space-y-2">
            <p className="font-body text-sm font-semibold text-slate">Yeni Puan Grubu Ekle</p>
            <div className="flex items-start gap-2">
              <Input
                label="Puan"
                type="number"
                value={newGroupScore}
                onChange={(e) => setNewGroupScore(e.target.value)}
                className="max-w-[90px]"
              />
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="font-display text-sm font-semibold text-slate">
                  Kelimeler (virgül veya satırla ayır)
                </label>
                <textarea
                  value={newGroupWords}
                  onChange={(e) => setNewGroupWords(e.target.value)}
                  rows={2}
                  placeholder="örn. hakaret, küfür1, küfür2"
                  className="w-full resize-none rounded-2xl border-2 border-sky-light bg-white px-3 py-2 font-body text-sm text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
                />
              </div>
            </div>
            <Button
              onClick={handleAddGroup}
              disabled={isAddingGroup || !newGroupWords.trim()}
              variant="secondary"
            >
              {isAddingGroup ? "Ekleniyor..." : "Grubu Ekle"}
            </Button>
          </div>
        </Card>

        {/* Kullanici istegi: inceleme altindaki (isUnderReview) kisiler -
            bunlarin TUM mesajlari otomatik pending'e duser. */}
        <h2 className="font-display text-lg font-bold text-slate">
          İncelemedeki Kişiler ({underReview.length})
        </h2>
        {underReview.length === 0 ? (
          <p className="font-body text-sm text-slate-light">İnceleme altında kimse yok.</p>
        ) : (
          <div className="space-y-2">
            {underReview.map((u) => (
              <Card key={u.userId} lifted className="flex items-center justify-between">
                <div>
                  <p className="font-body text-sm text-slate">
                    {u.displayName || u.phone || "—"}
                  </p>
                  <p className="font-body text-xs text-slate-light">
                    {u.phone} · İhlal sayısı: <span className="font-semibold text-coral">{u.violationCount}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleExitReview(u.userId)}
                  disabled={exitingId === u.userId}
                  className="rounded-full border-2 border-meadow px-3 py-1.5 font-body text-xs font-semibold text-meadow-hover hover:bg-meadow-light disabled:opacity-50 whitespace-nowrap"
                >
                  {exitingId === u.userId ? "..." : "İncelemeden Çıkar"}
                </button>
              </Card>
            ))}
          </div>
        )}

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
