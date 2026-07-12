"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type Visibility = "public" | "unlisted";

// Gorev 12.1 + 12.2: Havuz sorusu olusturma formu, gorunurluk secimi
// (herkese acik / gizli link) ile. Katman 1 auth gerektirir (Bolum 4, 9).
export default function HavuzOlusturPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("public");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/giris?next=/havuz/olustur");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    apiFetch<{ categories: string[] }>("/pool/categories", { skipAuth: true })
      .then((data) => {
        setCategories(data.categories);
        if (data.categories.length > 0) setCategory(data.categories[0]);
      })
      .catch(() => {
        // Kategori listesi gelmezse serbest yazima izin verilir (asagida).
      });
  }, []);

  function describeError(err: unknown): string {
    if (err instanceof ApiError && err.status === 400) {
      const message = (err.body as any)?.message;
      return Array.isArray(message) ? message[0] : message ?? "Girdiğin bilgiyi kontrol et.";
    }
    return "Soru oluşturulamadı. Lütfen tekrar dene.";
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const data = await apiFetch<{ poolEntryId: string }>("/pool/entries", {
        method: "POST",
        body: JSON.stringify({ title, question, answer, category, visibility }),
      });
      setCreatedId(data.poolEntryId);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || !isAuthenticated) {
    return <main className="min-h-screen bg-mint" />;
  }

  if (createdId) {
    return (
      <main className="min-h-screen bg-mint flex items-center justify-center px-4 py-12">
        <Card lifted className="max-w-sm text-center space-y-4">
          <div className="text-5xl">🌼</div>
          <h1 className="font-display text-2xl font-bold text-slate">Sorun havuzda</h1>
          <p className="font-body text-sm text-slate-light">
            {visibility === "public"
              ? "Herkese açık havuzda listeleniyor. Doğru cevabı bilen biri seninle anında bağlantı kurabilecek."
              : "Sadece paylaştığın linkle erişilebilir."}
          </p>
          <Button className="w-full" onClick={() => router.push("/havuz")}>
            Havuza Git
          </Button>
          <button
            type="button"
            onClick={() => {
              setCreatedId(null);
              setTitle("");
              setQuestion("");
              setAnswer("");
            }}
            className="w-full font-body text-sm text-sky underline underline-offset-2"
          >
            Başka bir soru daha bırak
          </button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate">Havuza Soru Bırak</h1>
          <p className="font-body text-sm text-slate-light mt-1">
            Numarasını bilmediğin biriyle, ortak bir bilgi üzerinden buluş.
          </p>
        </div>

        <Card lifted className="space-y-5">
          <Input
            label="Başlık"
            placeholder="Ortak Anımız"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label="Sorun"
            placeholder="İlk nerede tanıştık?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Input
            label="Doğru Cevap"
            placeholder="Kütüphanede"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />

          <div>
            <label className="font-display text-sm font-semibold text-slate">Kategori</label>
            {categories.length > 0 ? (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border-2 border-sky-light bg-white px-4 py-3 font-body text-slate
                  focus:outline-none focus:ring-4 focus:ring-sky/20 focus:border-sky"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Genel"
                className="mt-1.5"
              />
            )}
          </div>

          {/* Gorev 12.2: Gorunurluk secimi */}
          <div>
            <label className="font-display text-sm font-semibold text-slate">Görünürlük</label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`flex-1 rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors
                  ${visibility === "public" ? "bg-meadow text-white" : "bg-meadow-light text-slate"}`}
              >
                Herkese Açık
              </button>
              <button
                type="button"
                onClick={() => setVisibility("unlisted")}
                className={`flex-1 rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors
                  ${visibility === "unlisted" ? "bg-meadow text-white" : "bg-meadow-light text-slate"}`}
              >
                Sadece Link ile
              </button>
            </div>
            <p className="mt-1.5 font-body text-xs text-slate-light">
              {visibility === "public"
                ? "Havuz sayfasında herkes görebilir."
                : "Sadece paylaştığın linke sahip olanlar görebilir."}
            </p>
          </div>

          {error && <p className="font-body text-sm text-coral">{error}</p>}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || !title || !question || !answer || !category}
          >
            {isSubmitting ? "Oluşturuluyor..." : "Soruyu Yayınla"}
          </Button>
        </Card>
      </div>
    </main>
  );
}
