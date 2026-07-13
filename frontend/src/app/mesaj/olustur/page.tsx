"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";

type LockType = "password" | "question";

// Gorev 11.1 + 11.2 + 11.3 + 11.4: Mesaj olusturma formu (alici no,
// mesaj metni, kilit tipi, kimlik tercihi) ve gonderim sonrasi onay
// ekrani. Katman 1 auth gerektirir - girisi olmayan kullanici /giris'e
// yonlendirilir (Bolum 5, 9).
export default function MesajOlusturPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [recipientPhone, setRecipientPhone] = useState("");
  const [body, setBody] = useState("");
  const [lockType, setLockType] = useState<LockType>("question");
  const [lockSecret, setLockSecret] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentThreadId, setSentThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/giris");
    }
  }, [authLoading, isAuthenticated, router]);

  function describeError(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 400) {
        const message = (err.body as any)?.message;
        return Array.isArray(message) ? message[0] : message ?? "Girdiğin bilgiyi kontrol et.";
      }
      if (err.status === 403) {
        return "Bu numaraya mesaj gönderemezsin.";
      }
    }
    return "Mesaj gönderilemedi. Lütfen tekrar dene.";
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const data = await apiFetch<{ threadId: string }>("/threads", {
        method: "POST",
        body: JSON.stringify({
          recipientPhone,
          body,
          lockType,
          lockSecret,
          questionText: lockType === "question" ? questionText : undefined,
          isAnonymous,
        }),
      });
      setSentThreadId(data.threadId);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || !isAuthenticated) {
    return <main className="min-h-screen bg-mint" />;
  }

  // Gorev 11.4: Gonderim sonrasi onay ekrani.
  if (sentThreadId) {
    return (
      <main className="min-h-screen bg-mint flex items-center justify-center px-4 py-12">
        <Card lifted className="max-w-sm text-center space-y-4">
          <div className="text-5xl">🌱</div>
          <h1 className="font-display text-2xl font-bold text-slate">Mesajın gönderildi</h1>
          <p className="font-body text-sm text-slate-light">
            {recipientPhone} numarasına bir bildirim SMS&apos;i gitti. Doğru parolayı/cevabı
            bildiği için sana ulaşabilecek.
          </p>
          <Button className="w-full" onClick={() => router.push("/")}>
            Ana Sayfaya Dön
          </Button>
          <button
            type="button"
            onClick={() => {
              setSentThreadId(null);
              setRecipientPhone("");
              setBody("");
              setLockSecret("");
              setQuestionText("");
            }}
            className="w-full font-body text-sm text-sky underline underline-offset-2"
          >
            Başka birine daha mesaj bırak
          </button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate">Ona Mesaj Bırak</h1>
          <p className="font-body text-sm text-slate-light mt-1">
            Söylemek istediğin şeyi, doğru kişiye ulaştır.
          </p>
        </div>

        <Card lifted className="space-y-5">
          <Input
            label="Alıcının Telefon Numarası"
            placeholder="+90 5xx xxx xx xx"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            inputMode="tel"
          />

          <Input
            label="Mesajın"
            placeholder="Seninle tanışmak isterim, bir kahve içelim mi?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          {/* Gorev 11.2: Parola/Soru modu toggle - Soru-Cevap varsayilan
              ve solda (kullanici geri bildirimi). */}
          <div>
            <label className="font-display text-sm font-semibold text-slate">Kilit Türü</label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setLockType("question")}
                className={`flex-1 rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors
                  ${lockType === "question" ? "bg-sky text-white" : "bg-sky-light text-slate"}`}
              >
                Soru-Cevap
              </button>
              <button
                type="button"
                onClick={() => setLockType("password")}
                className={`flex-1 rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors
                  ${lockType === "password" ? "bg-sky text-white" : "bg-sky-light text-slate"}`}
              >
                Parola
              </button>
            </div>
          </div>

          {lockType === "question" && (
            <Input
              label="Sorun"
              placeholder="Nerede tanıştık?"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          )}

          <Input
            label={lockType === "password" ? "Parola" : "Doğru Cevap"}
            placeholder={lockType === "password" ? "Mavi Klasör" : "Kütüphanede"}
            value={lockSecret}
            onChange={(e) => setLockSecret(e.target.value)}
          />

          {/* Gorev 11.3: Anonim/Acik kimlik toggle */}
          <Toggle
            id="anon-toggle-create"
            checked={isAnonymous}
            onChange={setIsAnonymous}
            label={isAnonymous ? "Anonim kalacaksın" : "Kimliğin görünecek"}
          />

          {error && <p className="font-body text-sm text-coral">{error}</p>}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !recipientPhone ||
              !body ||
              !lockSecret ||
              (lockType === "question" && !questionText)
            }
          >
            {isSubmitting ? "Gönderiliyor..." : "Mesajı Gönder"}
          </Button>
        </Card>
      </div>
    </main>
  );
}
