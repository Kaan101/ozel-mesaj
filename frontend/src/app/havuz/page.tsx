"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface PoolEntry {
  id: string;
  title: string;
  questionText: string;
  category: string | null;
  createdAt: string;
}

// Gorev 12.3: Herkese acik havuz listesi, kategori filtresiyle.
// Auth gerektirmez - herkes goz atabilir (Bolum 4, 9).
export default function HavuzPage() {
  const [entries, setEntries] = useState<PoolEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ categories: string[] }>("/pool/categories", { skipAuth: true })
      .then((data) => setCategories(data.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const query = selectedCategory ? `?category=${encodeURIComponent(selectedCategory)}` : "";
    apiFetch<{ items: PoolEntry[] }>(`/pool/entries${query}`, { skipAuth: true })
      .then((data) => setEntries(data.items))
      .catch(() => setEntries([]))
      .finally(() => setIsLoading(false));
  }, [selectedCategory]);

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate">Havuz</h1>
            <p className="font-body text-sm text-slate-light mt-1">
              Ortak bir bilgiyi paylaştığın biriyle karşılaş.
            </p>
          </div>
          <Link href="/havuz/olustur">
            <Button variant="secondary">Soru Bırak</Button>
          </Link>
        </div>

        {/* Gorev 12.3: Kategori filtresi */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-full px-4 py-1.5 font-body text-sm font-medium transition-colors
              ${!selectedCategory ? "bg-sky text-white" : "bg-white text-slate-light"}`}
          >
            Tümü
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-1.5 font-body text-sm font-medium transition-colors
                ${selectedCategory === cat ? "bg-sky text-white" : "bg-white text-slate-light"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="font-body text-slate-light">Yükleniyor...</p>
        ) : entries.length === 0 ? (
          <Card>
            <p className="font-body text-slate-light text-center py-6">
              Bu kategoride henüz bir soru yok.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {entries.map((entry) => (
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
                      {new Date(entry.createdAt).toLocaleDateString("tr-TR")}
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
