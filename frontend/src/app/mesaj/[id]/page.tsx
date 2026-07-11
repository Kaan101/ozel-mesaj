"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface ThreadMeta {
  id: string;
  originType: string;
  lockType: "password" | "question";
  questionText: string | null;
  createdAt: string;
}

interface DisplayMessage {
  id: string;
  body: string;
  isAnonymous: boolean;
  senderUserId?: string;
  readAt: string | null;
  createdAt: string;
}

type ViewState = "loading" | "unlock" | "unlocking" | "messages" | "error";

// Gorev 11.5 + 11.6: Alici tarafi. Sirasiyla: (1) Katman 1 auth kontrolu
// (girisi yoksa /giris'e, donus adresiyle birlikte yonlendirilir),
// (2) thread metadata'sini (kilit tipi/soru) ceker, (3) parola/cevap
// formunu gosterir, (4) dogru girilirse mesajlari listeler (Bolum 3, Adim 3).
export default function MesajGosterPage() {
  const params = useParams();
  const threadId = params.id as string;
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [view, setView] = useState<ViewState>("loading");
  const [meta, setMeta] = useState<ThreadMeta | null>(null);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [threadToken, setThreadToken] = useState<string | null>(null);

  // Katman 1 kontrolu - girisi yoksa, geri donebilmesi icin `next`
  // parametresiyle /giris'e yonlendir.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/giris?next=/mesaj/${threadId}`);
    }
  }, [authLoading, isAuthenticated, router, threadId]);

  // Thread metadata'sini cek (kilit tipi, soru metni).
  useEffect(() => {
    if (!isAuthenticated) return;

    apiFetch<ThreadMeta>(`/threads/${threadId}`)
      .then((data) => {
        setMeta(data);
        setView("unlock");
      })
      .catch(() => {
        setError("Bu mesaj bulunamadı ya da artık mevcut değil.");
        setView("error");
      });
  }, [isAuthenticated, threadId]);

  function describeError(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 401) return "Parola/cevap hatalı. Tekrar dene.";
      if (err.status === 423)
        return "Çok fazla yanlış deneme yaptın. Lütfen 15 dakika sonra tekrar dene.";
      if (err.status === 404) return "Bu mesaj bulunamadı.";
    }
    return "Bir şeyler ters gitti. Lütfen tekrar dene.";
  }

  async function handleUnlock() {
    setError(null);
    setView("unlocking");
    try {
      const data = await apiFetch<{ thread_access_token: string }>(
        `/threads/${threadId}/unlock`,
        {
          method: "POST",
          body: JSON.stringify({ secret }),
        }
      );
      setThreadToken(data.thread_access_token);

      const msgs = await apiFetch<DisplayMessage[]>(`/threads/${threadId}/messages`, {
        skipAuth: true,
        headers: { Authorization: `Bearer ${data.thread_access_token}` },
      });
      setMessages(msgs);
      setView("messages");
    } catch (err) {
      setError(describeError(err));
      setView("unlock");
    }
  }

  if (authLoading || !isAuthenticated || view === "loading") {
    return <main className="min-h-screen bg-mint" />;
  }

  if (view === "error") {
    return (
      <main className="min-h-screen bg-mint flex items-center justify-center px-4">
        <Card className="max-w-sm text-center">
          <p className="font-body text-coral">{error}</p>
        </Card>
      </main>
    );
  }

  // Gorev 11.6: Mesaj gosterim ekrani.
  if (view === "messages") {
    return (
      <main className="min-h-screen bg-mint px-4 py-12">
        <div className="mx-auto max-w-md space-y-4">
          <h1 className="font-display text-2xl font-bold text-slate">Sana Bir Mesaj Var</h1>
          {messages.map((msg) => (
            <Card key={msg.id}>
              <p className="font-body text-slate">{msg.body}</p>
              <p className="mt-2 font-body text-xs text-slate-light">
                {msg.isAnonymous ? "Gönderen kimliğini gizledi" : "Gönderen kimliğini gösterdi"}
                {" · "}
                {new Date(msg.createdAt).toLocaleString("tr-TR")}
              </p>
            </Card>
          ))}
        </div>
      </main>
    );
  }

  // Gorev 11.5: Parola/cevap giris formu.
  return (
    <main className="min-h-screen bg-mint flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-slate">Sana Özel Bir Mesaj Var</h1>
          <p className="font-body text-sm text-slate-light mt-1">
            {meta?.lockType === "question"
              ? meta.questionText
              : "Göndericinin belirlediği parolayı gir."}
          </p>
        </div>

        <Card lifted className="space-y-4">
          <Input
            label={meta?.lockType === "question" ? "Cevabın" : "Parola"}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            autoFocus
          />
          {error && <p className="font-body text-sm text-coral">{error}</p>}
          <Button
            className="w-full"
            onClick={handleUnlock}
            disabled={view === ("unlocking" as ViewState) || !secret}
          >
            {view === "unlocking" ? "Kontrol ediliyor..." : "Mesajı Aç"}
          </Button>
        </Card>
      </div>
    </main>
  );
}
