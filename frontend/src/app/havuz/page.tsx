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
}

// Gorev 12.3 (revize): Herkese acik havuz listesi. Kullanici istegi:
// kategori filtre butonlari kaldirildi, yerine baslik/soru/kategori
// uzerinde arama yapan bir arama kutusu eklendi (client-side filtre -
// tum sorular bir kerede cekilip, yazarken anlik filtreleniyor).
// Auth gerektirmez - herkes goz atabilir (Bolum 4, 9).
export default function HavuzPage() {
  const { t, language } = useLanguage();
  const [entries, setEntries] = useState<PoolEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setIsLoading(true);
    apiFetch<{ items: PoolEntry[] }>("/pool/entries", { skipAuth: true })
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
        ) : filteredEntries.length === 0 ? (
          <Card>
            <p className="font-body text-slate-light text-center py-6">
              {searchQuery ? t("havuz.noResults") : t("havuz.empty")}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredEntries.map((entry) => (
              <Link key={entry.id} href={`/havuz/${entry.id}`}>
                <Card className="h-full hover:shadow-soft-lifted transition-shadow cursor-pointer">
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
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
