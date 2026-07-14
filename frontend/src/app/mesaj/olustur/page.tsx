"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { PhoneInput } from "@/components/ui/PhoneInput";

// Gorev 11.1 + 11.2 + 11.3 + 11.4: Mesaj olusturma formu (alici no,
// mesaj metni, opsiyonel soru, kimlik tercihi) ve gonderim sonrasi
// onay ekrani. Katman 1 auth gerektirir - girisi olmayan kullanici
// /giris'e yonlendirilir (Bolum 5, 9).
//
// Kullanici geri bildirimi: "Ona Mesaj Gonder" akisinda alici zaten
// bilinen bir kisi oldugu icin parola secenegi tamamen kaldirildi.
// Soru-cevap eklemek istege bagli (varsayilan kapali) - acilirsa
// "Sorun" ve "Cevap" alanlari cikar. Kapaliyken mesaj hicbir kilit
// olmadan (lockType: "none") gonderilir.
export default function MesajOlusturPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [recipientPhone, setRecipientPhone] = useState("");
  const [body, setBody] = useState("");
  const [addQuestion, setAddQuestion] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [lockSecret, setLockSecret] = useState("");
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
          lockType: addQuestion ? "question" : "none",
          lockSecret: addQuestion ? lockSecret : undefined,
          questionText: addQuestion ? questionText : undefined,
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
            {recipientPhone} numarasına bir bildirim SMS&apos;i gitti.
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
              setAddQuestion(false);
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
          <PhoneInput
            label="Alıcının Telefon Numarası"
            value={recipientPhone}
            onChange={setRecipientPhone}
          />

          <Input
            label="Mesajın"
            placeholder="Seninle tanışmak isterim, bir kahve içelim mi?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          {/* Kullanici geri bildirimi: soru-cevap eklemek istege bagli */}
          <Toggle
            id="add-question-toggle"
            checked={addQuestion}
            onChange={setAddQuestion}
            label="Bir soru-cevap ile korumak ister misin?"
          />

          {addQuestion && (
            <div className="space-y-3 rounded-2xl bg-sky-light/40 p-3">
              <Input
                label="Sorun"
                placeholder="Nerede tanıştık?"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
              <Input
                label="Doğru Cevap"
                placeholder="Kütüphanede"
                value={lockSecret}
                onChange={(e) => setLockSecret(e.target.value)}
              />
            </div>
          )}

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
              (addQuestion && (!questionText || !lockSecret))
            }
          >
            {isSubmitting ? "Gönderiliyor..." : "Mesajı Gönder"}
          </Button>
        </Card>
      </div>
    </main>
  );
}
