"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Toggle } from "@/components/ui/Toggle";

interface PoolEntryDetail {
  id: string;
  title: string;
  questionText: string;
  category: string | null;
  visibility: string;
  createdAt: string;
}

interface DisplayMessage {
  id: string;
  body: string;
  isAnonymous: boolean;
  senderAvatarId?: string | null;
  createdAt: string;
}

type ViewState = "loading" | "question" | "attempting" | "matched" | "not-found";

// Gorev 12.4: Havuz sorusu detayi + cevap deneme ekrani. Dogru cevap
// verilirse anlik olarak soru sahibiyle mesajlasma penceresi acilir
// (unlock adimina gerek kalmadan - attempt endpoint'i zaten
// thread_access_token dondurur, Bolum 4, Adim 3).
export default function HavuzDetayClient({ entryId }: { entryId: string }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [view, setView] = useState<ViewState>("loading");
  const [entry, setEntry] = useState<PoolEntryDetail | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [matchedThreadId, setMatchedThreadId] = useState<string | null>(null);
  const [matchedThreadToken, setMatchedThreadToken] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyAnonymous, setReplyAnonymous] = useState(true);
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [myMessageIds, setMyMessageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiFetch<PoolEntryDetail>(`/pool/entries/${entryId}`, { skipAuth: true })
      .then((data) => {
        setEntry(data);
        setView("question");
      })
      .catch(() => setView("not-found"));
  }, [entryId]);

  // Eslesme sonrasi 5 saniyede bir otomatik yenileme - karsi taraf
  // yanit yazdiginda elle yenilemeye gerek kalmaz (mesaj ekraniyla
  // tutarlilik icin, Kategori 13).
  useEffect(() => {
    if (view !== "matched" || !matchedThreadToken || !matchedThreadId) return;

    const interval = setInterval(() => {
      apiFetch<DisplayMessage[]>(`/threads/${matchedThreadId}/messages`, {
        skipAuth: true,
        headers: { Authorization: `Bearer ${matchedThreadToken}` },
      })
        .then(setMessages)
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [view, matchedThreadToken, matchedThreadId]);

  function describeError(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 429) {
        return "Bu soruya çok fazla deneme yapıldı. Lütfen bir dakika sonra tekrar dene.";
      }
    }
    return "Bir şeyler ters gitti. Lütfen tekrar dene.";
  }

  async function handleAttempt() {
    if (!isAuthenticated) {
      router.push(`/giris?next=/havuz/${entryId}`);
      return;
    }

    setError(null);
    setView("attempting");
    try {
      const data = await apiFetch<{
        success: boolean;
        threadId?: string;
        threadAccessToken?: string;
      }>(`/pool/entries/${entryId}/attempt`, {
        method: "POST",
        body: JSON.stringify({ answer }),
      });

      if (!data.success) {
        setError("Bu sefer olmadı, tekrar dene.");
        setView("question");
        return;
      }

      const msgs = await apiFetch<DisplayMessage[]>(`/threads/${data.threadId}/messages`, {
        skipAuth: true,
        headers: { Authorization: `Bearer ${data.threadAccessToken}` },
      });
      setMessages(msgs);
      setMatchedThreadId(data.threadId ?? null);
      setMatchedThreadToken(data.threadAccessToken ?? null);
      setView("matched");
    } catch (err) {
      setError(describeError(err));
      setView("question");
    }
  }

  // Gorev 13.1 + 13.2: Havuzda eslesen konusmada da yanit yazabilmek
  // (Kategori 11'deki thread konusma ekraniyla tutarli olsun diye).
  async function handleReply() {
    if (!matchedThreadToken || !matchedThreadId) return;
    setReplyError(null);
    setIsReplying(true);
    try {
      const sent = await apiFetch<{ id: string }>(`/threads/${matchedThreadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: replyBody, isAnonymous: replyAnonymous }),
        headers: { "X-Thread-Access-Token": matchedThreadToken },
      });
      setMyMessageIds((prev) => new Set(prev).add(sent.id));
      setReplyBody("");
      const msgs = await apiFetch<DisplayMessage[]>(`/threads/${matchedThreadId}/messages`, {
        skipAuth: true,
        headers: { Authorization: `Bearer ${matchedThreadToken}` },
      });
      setMessages(msgs);
    } catch {
      setReplyError("Yanıt gönderilemedi. Lütfen tekrar dene.");
    } finally {
      setIsReplying(false);
    }
  }

  if (authLoading || view === "loading") {
    return <main className="min-h-screen bg-mint" />;
  }

  if (view === "not-found") {
    return (
      <main className="min-h-screen bg-mint flex items-center justify-center px-4">
        <Card className="max-w-sm text-center">
          <p className="font-body text-coral">Bu soru bulunamadı.</p>
        </Card>
      </main>
    );
  }

  if (view === "matched") {
    return (
      <main className="min-h-screen bg-mint px-4 py-12">
        <div className="mx-auto max-w-md space-y-4">
          <div className="text-center">
            <div className="text-5xl">🌸</div>
            <h1 className="font-display text-2xl font-bold text-slate mt-2">Eşleştin!</h1>
            <p className="font-body text-sm text-slate-light mt-1">
              Doğru cevabı bildin, artık sohbet edebilirsiniz.
            </p>
          </div>
          {messages.map((msg) => {
            const isFromCounterpart = !myMessageIds.has(msg.id);
            return (
              <Card
                key={msg.id}
                className={isFromCounterpart ? "border-2 border-meadow" : ""}
              >
                <div className="flex items-start gap-3">
                  {msg.senderAvatarId && (
                    <div className="shrink-0">
                      <Avatar avatarId={msg.senderAvatarId} size={36} />
                    </div>
                  )}
                  <p className="font-body text-slate min-w-0 flex-1">{msg.body}</p>
                </div>
              </Card>
            );
          })}

          {/* Gorev 13.1 + 13.2: Yanit formu + kimlik gosterme anahtari */}
          <Card lifted className="space-y-3">
            <Input
              label="Yanıtın"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Merhaba, ben de..."
            />
            <Toggle
              id="havuz-reply-anon-toggle"
              checked={replyAnonymous}
              onChange={setReplyAnonymous}
              label={replyAnonymous ? "Anonim kalacaksın" : "Kimliğin görünecek"}
            />
            {replyError && <p className="font-body text-sm text-coral">{replyError}</p>}
            <Button className="w-full" onClick={handleReply} disabled={isReplying || !replyBody}>
              {isReplying ? "Gönderiliyor..." : "Yanıtla"}
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mint flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-slate">{entry?.title}</h1>
          {entry?.category && (
            <span className="inline-block mt-2 rounded-full bg-meadow-light px-3 py-1 font-body text-xs text-meadow-hover">
              {entry.category}
            </span>
          )}
        </div>

        <Card lifted className="space-y-4">
          <p className="font-display text-lg font-semibold text-slate text-center">
            {entry?.questionText}
          </p>
          <Input
            label="Cevabın"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            autoFocus
          />
          {error && <p className="font-body text-sm text-coral">{error}</p>}
          <Button
            className="w-full"
            onClick={handleAttempt}
            disabled={view === ("attempting" as ViewState) || !answer}
          >
            {view === "attempting" ? "Kontrol ediliyor..." : "Cevabı Gönder"}
          </Button>
        </Card>
      </div>
    </main>
  );
}
