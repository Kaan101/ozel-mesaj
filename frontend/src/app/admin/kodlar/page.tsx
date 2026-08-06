"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface SystemCodeRecord {
  id: string;
  category: string;
  code: string;
  description: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Kullanici istegi: sistem genelinde kullanilan (blok nedeni gibi)
// KOD tanimlarini TABLO olarak yonetme ekrani - eklenebilir ve
// guncellenebilir, kodlar sayisal da olabilir (serbest metin, sayi
// kisitlamasi yok - "1", "2" gibi degerler dogrudan yazilabilir).
// "category" secilerek farkli kod listeleri arasinda gecis yapilir.
const KNOWN_CATEGORIES = [{ value: "block_reason", label: "Blok Nedenleri" }];

export default function AdminKodlarPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [category, setCategory] = useState(KNOWN_CATEGORIES[0].value);
  const [customCategory, setCustomCategory] = useState("");
  const [codes, setCodes] = useState<SystemCodeRecord[]>([]);
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [descriptionDrafts, setDescriptionDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_secret");
    if (stored) {
      setAdminKey(stored);
      setIsUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) fetchCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked, category]);

  async function fetchCodes() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/system-codes?category=${encodeURIComponent(category)}`,
        { headers: { "x-admin-secret": adminKey } }
      );
      if (!res.ok) throw new Error();
      const data: SystemCodeRecord[] = await res.json();
      setCodes(data);
      const nextCodeDrafts: Record<string, string> = {};
      const nextDescriptionDrafts: Record<string, string> = {};
      for (const c of data) {
        nextCodeDrafts[c.id] = c.code;
        nextDescriptionDrafts[c.id] = c.description;
      }
      setCodeDrafts(nextCodeDrafts);
      setDescriptionDrafts(nextDescriptionDrafts);
    } catch {
      setError("Kodlar yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdd() {
    if (!newCode.trim() || !newDescription.trim()) return;
    setIsAdding(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/system-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({ category, code: newCode, description: newDescription }),
      });
      if (!res.ok) throw new Error();
      setNewCode("");
      setNewDescription("");
      await fetchCodes();
    } catch {
      setError("Kod eklenemedi (ayni kategori icinde bu kod zaten olabilir).");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleSave(id: string) {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/system-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminKey },
        body: JSON.stringify({
          code: codeDrafts[id] ?? "",
          description: descriptionDrafts[id] ?? "",
        }),
      });
      if (!res.ok) throw new Error();
      await fetchCodes();
    } catch {
      setError("Kod güncellenemedi (aynı kategori içinde bu kod zaten olabilir).");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu kodu silmek istediğine emin misin?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/system-codes/${id}`, {
        method: "DELETE",
        headers: { "x-admin-secret": adminKey },
      });
      if (!res.ok) throw new Error();
      setCodes((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError("Kod silinemedi.");
    }
  }

  function handleUnlock() {
    sessionStorage.setItem("admin_secret", adminKey);
    setIsUnlocked(true);
  }

  const activeCategory = customCategory.trim() || category;

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
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/admin" className="font-body text-sm text-sky underline underline-offset-2">
          ← Yönetim Paneli
        </Link>
        <h1 className="font-display text-2xl font-bold text-slate">Kod Tanımları</h1>
        <p className="font-body text-sm text-slate-light">
          Sistem genelinde kullanılan kod listeleri (örn. blok nedenleri). Kodlar sayısal da
          olabilir (örn. 1, 2, 3). Yeni bir kod kategorisi eklemek istersen, aşağıya serbest bir
          isim yazabilirsin.
        </p>

        <Card lifted className="space-y-3">
          <label className="block font-body text-sm font-semibold text-slate">Kategori</label>
          <select
            value={KNOWN_CATEGORIES.some((c) => c.value === category) ? category : "__custom__"}
            onChange={(e) => {
              if (e.target.value === "__custom__") {
                setCustomCategory(category);
              } else {
                setCustomCategory("");
                setCategory(e.target.value);
              }
            }}
            className="w-full rounded-2xl border-2 border-sky-light bg-white px-3 py-2 font-body text-sm text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
          >
            {KNOWN_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label} ({c.value})
              </option>
            ))}
            <option value="__custom__">Diğer / yeni kategori...</option>
          </select>
          {(customCategory || !KNOWN_CATEGORIES.some((c) => c.value === category)) && (
            <Input
              label="Kategori adı (örn. rapor_nedeni)"
              value={customCategory}
              onChange={(e) => {
                setCustomCategory(e.target.value);
                setCategory(e.target.value);
              }}
            />
          )}
        </Card>

        {isLoading && <p className="font-body text-sm text-slate-light">Yükleniyor...</p>}
        {error && <p className="font-body text-sm text-coral">{error}</p>}

        <Card lifted className="space-y-3">
          <h2 className="font-display text-lg font-bold text-slate">
            &quot;{activeCategory}&quot; kategorisine yeni kod ekle
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
            <Input
              label="Kod (örn. 1)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
            <Input
              label="Açıklama"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={isAdding || !newCode.trim() || !newDescription.trim()}
            className="w-full"
          >
            {isAdding ? "Ekleniyor..." : "Ekle"}
          </Button>
        </Card>

        <h2 className="font-display text-lg font-bold text-slate">
          &quot;{activeCategory}&quot; Kodları ({codes.length})
        </h2>
        {codes.length === 0 ? (
          <p className="font-body text-sm text-slate-light">Bu kategoride henüz kod yok.</p>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full border-collapse border border-slate-light/60 text-left">
              <thead>
                <tr className="bg-mint">
                  <th className="border border-slate-light/60 px-4 py-3 font-display text-xs font-bold text-slate w-32">
                    Kod
                  </th>
                  <th className="border border-slate-light/60 px-4 py-3 font-display text-xs font-bold text-slate">
                    Açıklama
                  </th>
                  <th className="border border-slate-light/60 px-4 py-3 font-display text-xs font-bold text-slate w-40">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id}>
                    <td className="border border-slate-light/60 px-2 py-2">
                      <input
                        value={codeDrafts[c.id] ?? ""}
                        onChange={(e) =>
                          setCodeDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                        className="w-full rounded-2xl border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm font-semibold text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
                      />
                    </td>
                    <td className="border border-slate-light/60 px-2 py-2">
                      <input
                        value={descriptionDrafts[c.id] ?? ""}
                        onChange={(e) =>
                          setDescriptionDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                        className="w-full rounded-2xl border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
                      />
                    </td>
                    <td className="border border-slate-light/60 px-2 py-2">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleSave(c.id)}
                          disabled={savingId === c.id}
                          className="rounded-full border-2 border-meadow px-3 py-1.5 font-body text-xs font-semibold text-meadow-hover hover:bg-meadow-light disabled:opacity-50 whitespace-nowrap"
                        >
                          {savingId === c.id ? "..." : "Kaydet"}
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="rounded-full border-2 border-coral px-3 py-1.5 font-body text-xs font-semibold text-coral hover:bg-coral-light whitespace-nowrap"
                        >
                          Sil
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
    </main>
  );
}
