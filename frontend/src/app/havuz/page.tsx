"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/language-context";

interface PoolEntry {
  id: string;
  title: string;
  questionText: string;
  category: string | null;
  createdAt: string;
  isOwner: boolean;
}

const DISMISSED_KEY = "dismissed_pool_entries";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

// Gorev 12.3 (revize): Herkese acik havuz listesi. Kullanici istegi:
// kategori filtre butonlari kaldirildi, yerine baslik/soru/kategori
// uzerinde arama yapan bir arama kutusu eklendi. Ayrica liste artik
// iki gruba ayrilir: BENIM sorularim (en tepede, gercekten
// silinebilir) ve DIGER kisilerin sorulari (altta, sadece kendi
// GORUNUMUMDEN gizlenebilir - baskasinin sorusunu fiilen silmiyorum).
export default function HavuzPage() {
  const { t, language } = useLanguage();
  const [entries, setEntries] = useState<PoolEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setDismissedIds(loadDismissed());
  }, []);

  useEffect(() => {
    setIsLoading(true);
    // Kullanici istegi: skipAuth KALDIRILDI - giris yapmis kullanicinin
    // token'i varsa gonderilir, boylece backend hangi sorularin "benim"
    // oldugunu (isOwner) dogru sekilde isaretleyebilir.
    apiFetch<{ items: PoolEntry[] }>("/pool/entries")
      .then((data) => setEntries(data.items))
      .catch(() => setEntries([]))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(q) ||
        entry.questionText.toLowerCase().includes(q) ||
        (entry.category ?? "").toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const myEntries = filteredEntries.filter((e) => e.isOwner);
  const otherEntries = filteredEntries.filter(
    (e) => !e.isOwner && !dismissedIds.has(e.id)
  );

  // Kullanici istegi: benim sorularim gercekten silinebilir (sunucudan
  // kaldirilir, geri gelmez).
  async function handleDeleteMine(entryId: string) {
    if (!confirm("Bu soruyu kaldırmak istediğine emin misin?")) return;
    setDeletingId(entryId);
    try {
      await apiFetch(`/pool/entries/${entryId}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } finally {
      setDeletingId(null);
    }
  }

  // Kullanici istegi: baskasinin sorusu fiilen silinmez - sadece BENIM
  // gorunumumden (bu tarayicida) kaldirilir, localStorage'da tutulur.
  function handleHideOther(entryId: string) {
    const updated = new Set(dismissedIds);
    updated.add(entryId);
    setDismissedIds(updated);
    saveDismissed(updated);
  }

  const isEmpty = myEntries.length === 0 && otherEntries.length === 0;

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate">{t("havuz.title")}</h1>
            <p className="font-body text-sm text-slate-light mt-1">{t("havuz.subtitle")}</p>
          </div>
          <Link href="/havuz/olustur">
            <Button variant="secondary">{t("havuz.leaveQuestion")}</Button>
          </Link>
        </div>

        {/* Kullanici istegi: kategori filtre butonlari yerine arama kutusu */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("havuz.searchPlaceholder")}
          className="w-full rounded-2xl border-2 border-sky-light bg-white px-4 py-3 font-body text-slate focus:outline-none focus:border-sky"
        />

        {isLoading ? (
          <p className="font-body text-slate-light">{t("havuz.loading")}</p>
        ) : isEmpty ? (
          <Card>
            <p className="font-body text-slate-light text-center py-6">
              {searchQuery ? t("havuz.noResults") : t("havuz.empty")}
            </p>
          </Card>
        ) : (
          <>
            {/* Kullanici istegi: benim sorularim en tepede, ayri bir grup. */}
            {myEntries.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display text-sm font-bold text-slate-light uppercase tracking-wide">
                  Benim Sorularım
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {myEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      language={language}
                      onRemove={() => handleDeleteMine(entry.id)}
                      isProcessing={deletingId === entry.id}
                      removeLabel="Soruyu Sil"
                    />
                  ))}
                </div>
              </div>
            )}

            {otherEntries.length > 0 && (
              <div className="space-y-3">
                {myEntries.length > 0 && (
                  <h2 className="font-display text-sm font-bold text-slate-light uppercase tracking-wide">
                    Diğer Sorular
                  </h2>
                )}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {otherEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      language={language}
                      onRemove={() => handleHideOther(entry.id)}
                      isProcessing={false}
                      removeLabel="Görünümden Kaldır"
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// Kullanici istegi: her karta sag altta bir kaldirma ikonu - benim
// sorularim icin gercek silme, baskasinin sorulari icin sadece
// gorunumden gizleme. Ikon, genel talep dogrultusunda kucultuldu.
function EntryCard({
  entry,
  language,
  onRemove,
  isProcessing,
  removeLabel,
}: {
  entry: PoolEntry;
  language: string;
  onRemove: () => void;
  isProcessing: boolean;
  removeLabel: string;
}) {
  return (
    <div className="relative group">
      <Link href={`/havuz/${entry.id}`}>
        <Card className="h-full pr-8 hover:shadow-soft-lifted transition-shadow cursor-pointer">
          <h2 className="font-display text-lg font-bold text-slate">{entry.title}</h2>
          <p className="font-body text-sm text-slate-light mt-1">{entry.questionText}</p>
          <div className="mt-3 flex items-center justify-between">
            {entry.category && (
              <span className="rounded-full bg-meadow-light px-3 py-1 font-body text-xs text-meadow-hover">
                {entry.category}
              </span>
            )}
            <span className="font-body text-xs text-slate-light">
              {new Date(entry.createdAt).toLocaleDateString(
                language === "en" ? "en-US" : "tr-TR"
              )}
            </span>
          </div>
        </Card>
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        disabled={isProcessing}
        className="absolute right-1.5 bottom-1.5 rounded-full p-0.5 text-[10px] text-slate-light hover:bg-coral-light hover:text-coral disabled:opacity-50"
        aria-label={removeLabel}
      >
        🗑️
      </button>
    </div>
  );
}
