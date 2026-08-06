"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface Suggestion {
  id: string;
  text: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Kullanici istegi: mesaj onerileri artik veritabaninda - bu ekrandan
// admin ekleyebilir/guncelleyebilir/silebilir.
export default function AdminMesajOnerileriPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Kullanici istegi: oneriler artik DILE (tr/en) gore ayriliyor -
  // admin, hangi dilin listesini gorup duzenleyecegini secer.
  const [language, setLanguage] = useState<"tr" | "en">("tr");

  // Toplu ekleme - bir alanda birden fazla satir.
  const [bulkText, setBulkText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_secret");
    if (stored) {
      setAdminKey(stored);
      setIsUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, language]);

  async function fetchSuggestions() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/message-suggestions?language=${language}`);
      if (!res.ok) throw new Error();
      const data: Suggestion[] = await res.json();
      setSuggestions(data);
      const nextDrafts: Record<string, string> = {};
      for (const s of data) nextDrafts[s.id] = s.text;
      setDrafts(nextDrafts);
    } catch {
      setError("Öneriler yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddBulk() {
    const texts = bulkText.split("\n").map((t) => t.trim()).filter(Boolean);
    if (texts.length === 0) return;
    setIsAdding(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/message-suggestions/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({ texts, language }),
      });
      if (!res.ok) throw new Error();
      setBulkText("");
      await fetchSuggestions();
    } catch {
      setError("Öneriler eklenemedi.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleSave(id: string) {
    setSavingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/message-suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({ text: drafts[id] ?? "" }),
      });
      if (!res.ok) throw new Error();
      await fetchSuggestions();
    } catch {
      setError("Öneri güncellenemedi.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu öneriyi silmek istediğine emin misin?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/message-suggestions/${id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": adminKey },
      });
      if (!res.ok) throw new Error();
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError("Öneri silinemedi.");
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
        <h1 className="font-display text-2xl font-bold text-slate">Mesaj Önerileri</h1>
        <p className="font-body text-sm text-slate-light">
          Kullanıcıların mesaj yazarken görebileceği hazır öneri listesi. Buradan
          ekleyebilir, düzenleyebilir ve silebilirsin.
        </p>

        {/* Kullanici istegi: oneriler artik DILE gore ayrilabiliyor. */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLanguage("tr")}
            className={`rounded-full px-4 py-1.5 font-body text-sm font-semibold ${
              language === "tr" ? "bg-sky text-white" : "border-2 border-sky-light text-slate"
            }`}
          >
            🇹🇷 Türkçe
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`rounded-full px-4 py-1.5 font-body text-sm font-semibold ${
              language === "en" ? "bg-sky text-white" : "border-2 border-sky-light text-slate"
            }`}
          >
            🇬🇧 English
          </button>
        </div>

        {isLoading && <p className="font-body text-sm text-slate-light">Yükleniyor...</p>}
        {error && <p className="font-body text-sm text-coral">{error}</p>}

        {/* Toplu ekleme */}
        <Card lifted className="space-y-3">
          <h2 className="font-display text-lg font-bold text-slate">Yeni Öneri(ler) Ekle</h2>
          <p className="font-body text-xs text-slate-light">
            Her satıra bir öneri yaz - birden fazla satır tek seferde eklenir.
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={4}
            placeholder={"Merhaba, nasılsın?\nSelam, müsaitsen konuşabilir miyiz?"}
            className="w-full resize-none rounded-2xl border-2 border-sky-light bg-white px-3 py-2 font-body text-sm text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
          />
          <Button onClick={handleAddBulk} disabled={isAdding || !bulkText.trim()} className="w-full">
            {isAdding ? "Ekleniyor..." : "Ekle"}
          </Button>
        </Card>

        {/* Mevcut oneriler - duzenlenebilir liste */}
        <h2 className="font-display text-lg font-bold text-slate">
          Mevcut Öneriler ({suggestions.length})
        </h2>
        {suggestions.length === 0 ? (
          <p className="font-body text-sm text-slate-light">Henüz öneri yok.</p>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s) => (
              <Card key={s.id} lifted className="flex items-center gap-2">
                <input
                  value={drafts[s.id] ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))
                  }
                  className="flex-1 rounded-2xl border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
                />
                <button
                  onClick={() => handleSave(s.id)}
                  disabled={savingId === s.id}
                  className="rounded-full border-2 border-meadow px-3 py-1.5 font-body text-xs font-semibold text-meadow-hover hover:bg-meadow-light disabled:opacity-50 whitespace-nowrap"
                >
                  {savingId === s.id ? "..." : "Kaydet"}
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="rounded-full border-2 border-coral px-3 py-1.5 font-body text-xs font-semibold text-coral hover:bg-coral-light whitespace-nowrap"
                >
                  Sil
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
