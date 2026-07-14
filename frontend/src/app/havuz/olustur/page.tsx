"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type Visibility = "public" | "unlisted";

// Gorev 12.1 + 12.2: Havuz sorusu olusturma formu, gorunurluk secimi
// (herkese acik / gizli link) ile. Katman 1 auth gerektirir (Bolum 4, 9).
export default function HavuzOlusturPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();

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
          <h1 className="font-display text-2xl font-bold text-slate">
            {t("havuzOlustur.sentTitle")}
          </h1>
          <p className="font-body text-sm text-slate-light">
            {visibility === "public"
              ? t("havuzOlustur.sentPublicDesc")
              : t("havuzOlustur.sentUnlistedDesc")}
          </p>
          <Button className="w-full" onClick={() => router.push("/havuz")}>
            {t("havuzOlustur.goToPool")}
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
            {t("havuzOlustur.leaveAnother")}
          </button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate">
            {t("havuzOlustur.title")}
          </h1>
          <p className="font-body text-sm text-slate-light mt-1">
            {t("havuzOlustur.subtitle")}
          </p>
        </div>

        <Card lifted className="space-y-5">
          <Input
            label={t("havuzOlustur.titleLabel")}
            placeholder={t("havuzOlustur.titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label={t("havuzOlustur.questionLabel")}
            placeholder={t("havuzOlustur.questionPlaceholder")}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Input
            label={t("havuzOlustur.answerLabel")}
            placeholder={t("havuzOlustur.answerPlaceholder")}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />

          <div>
            <label className="font-display text-sm font-semibold text-slate">
              {t("havuzOlustur.categoryLabel")}
            </label>
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
                placeholder={t("havuzOlustur.categoryPlaceholder")}
                className="mt-1.5"
              />
            )}
          </div>

          {/* Gorev 12.2: Gorunurluk secimi */}
          <div>
            <label className="font-display text-sm font-semibold text-slate">
              {t("havuzOlustur.visibilityLabel")}
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`flex-1 rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors
                  ${visibility === "public" ? "bg-meadow text-white" : "bg-meadow-light text-slate"}`}
              >
                {t("havuzOlustur.public")}
              </button>
              <button
                type="button"
                onClick={() => setVisibility("unlisted")}
                className={`flex-1 rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors
                  ${visibility === "unlisted" ? "bg-meadow text-white" : "bg-meadow-light text-slate"}`}
              >
                {t("havuzOlustur.unlisted")}
              </button>
            </div>
            <p className="mt-1.5 font-body text-xs text-slate-light">
              {visibility === "public"
                ? t("havuzOlustur.publicDesc")
                : t("havuzOlustur.unlistedDesc")}
            </p>
          </div>

          {error && <p className="font-body text-sm text-coral">{error}</p>}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || !title || !question || !answer || !category}
          >
            {isSubmitting ? t("havuzOlustur.publishing") : t("havuzOlustur.publish")}
          </Button>
        </Card>
      </div>
    </main>
  );
}
