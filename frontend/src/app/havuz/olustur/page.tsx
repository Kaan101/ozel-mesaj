"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useAutoRedirect } from "@/lib/use-auto-redirect";

type Visibility = "public" | "unlisted";
type MatchMode = "exact" | "review";

// Gorev 12.1 + 12.2: Havuz sorusu olusturma formu, gorunurluk secimi
// (herkese acik / gizli link) ile. Katman 1 auth gerektirir (Bolum 4, 9).
export default function HavuzOlusturPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  // Kullanici istegi: gorunurluk ve eslesme sekli secenekleri
  // acilir-kapanir bir bolumde - kapaliyken hicbir secenek gorunmez.
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [matchMode, setMatchMode] = useState<MatchMode>("review");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Kullanici istegi: havuz sorusu gonderildikten sonra, dugmeye
  // basilmazsa belirli bir sure sonra otomatik olarak Havuz'a yonlensin.
  const redirectSecondsLeft = useAutoRedirect("/havuz", 6, !!createdId);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/giris?next=/havuz/olustur");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    // Kullanici istegi: bu artik sadece oneri (autocomplete) listesi -
    // ilk degeri otomatik secmiyoruz, kullanici serbestce yazabilir.
    apiFetch<{ categories: string[] }>("/pool/categories", { skipAuth: true })
      .then((data) => setCategories(data.categories))
      .catch(() => {
        // Oneri listesi gelmezse sorun degil, alan zaten serbest metin.
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
        body: JSON.stringify({
          // Kullanici istegi: ayri bir "baslik" alani kaldirildi -
          // backend'in yine de bir baslik bekledigi icin, soru
          // metninden otomatik turetiliyor (kullanici bunu gormez).
          title: question.slice(0, 60),
          question,
          answer,
          category: category.trim() || undefined,
          visibility,
          matchMode,
        }),
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
          {/* Kullanici istegi: dugmeye basilmazsa otomatik yonlendirme
              sayaci gosterilir. */}
          <p className="font-body text-xs text-slate-light">
            {redirectSecondsLeft} saniye içinde Havuz&apos;a yönlendirileceksin.
          </p>
          <button
            type="button"
            onClick={() => {
              setCreatedId(null);
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
            {/* Kullanici istegi: kategori artik serbest metin - yazarken
                daha once girilmis degerler HTML datalist ile oneri
                olarak listelenir (tarayicinin dogal autocomplete'i). */}
            <input
              list="category-suggestions"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t("havuzOlustur.categoryPlaceholder")}
              className="mt-1.5 w-full rounded-2xl border-2 border-sky-light bg-white px-4 py-3 font-body text-slate
                focus:outline-none focus:ring-4 focus:ring-sky/20 focus:border-sky"
            />
            <datalist id="category-suggestions">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Kullanici istegi: gorunurluk ve eslesme sekli secenekleri
              acilir-kapanir bir bolumde - kapaliyken hicbir secenek
              gorunmez. */}
          <button
            type="button"
            onClick={() => setIsOptionsExpanded((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl border-2 border-sky-light bg-white px-4 py-3"
          >
            <span className="font-body text-sm font-semibold text-slate">Seçenekler</span>
            <span
              className={`font-body text-slate-light transition-transform ${
                isOptionsExpanded ? "rotate-180" : ""
              }`}
            >
              ▾
            </span>
          </button>

          {isOptionsExpanded && (
            <>
              {/* Gorev 12.2: Gorunurluk secimi */}
              <div>
                <label className="font-display text-sm font-semibold text-slate">
                  {t("havuzOlustur.visibilityLabel")}
                </label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility("public")}
                    className={`flex-1 rounded-full border-2 bg-white px-4 py-2 font-body text-sm font-semibold transition-colors
                      ${visibility === "public" ? "border-meadow text-meadow-hover" : "border-meadow-light text-slate"}`}
                  >
                    {t("havuzOlustur.public")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility("unlisted")}
                    className={`flex-1 rounded-full border-2 bg-white px-4 py-2 font-body text-sm font-semibold transition-colors
                      ${visibility === "unlisted" ? "border-meadow text-meadow-hover" : "border-meadow-light text-slate"}`}
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

              {/* Kullanici istegi: "Kesin Eslessin" (varsayilan) vs "Tum
                  Yanitlari Goster" (her yanit incelemek uzere sana dusar,
                  kabul/reddedersin). */}
              <div>
                <label className="font-display text-sm font-semibold text-slate">
                  Eşleşme Şekli
                </label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMatchMode("review")}
                    className={`flex-1 rounded-full border-2 bg-white px-4 py-2 font-body text-sm font-semibold transition-colors
                      ${matchMode === "review" ? "border-meadow text-meadow-hover" : "border-meadow-light text-slate"}`}
                  >
                    Tüm Yanıtları Göster
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchMode("exact")}
                    className={`flex-1 rounded-full border-2 bg-white px-4 py-2 font-body text-sm font-semibold transition-colors
                      ${matchMode === "exact" ? "border-meadow text-meadow-hover" : "border-meadow-light text-slate"}`}
                  >
                    Kesin Eşleşsin
                  </button>
                </div>
                <p className="mt-1.5 font-body text-xs text-slate-light">
                  {matchMode === "exact"
                    ? "Sadece doğru cevabı bilen kişiyle otomatik olarak mesajlaşma başlar."
                    : "Doğru/yanlış fark etmeksizin gelen her yanıt sana \"Havuz Yanıtlarım\" ekranında düşer, istersen kabul eder istersen reddedersin. Her yanıt veren kişi için ayrı bir mesaj kutusu açılır."}
                </p>
              </div>
            </>
          )}

          {error && <p className="font-body text-sm text-coral">{error}</p>}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || !question || !answer}
          >
            {isSubmitting ? t("havuzOlustur.publishing") : t("havuzOlustur.publish")}
          </Button>
        </Card>
      </div>
    </main>
  );
}
