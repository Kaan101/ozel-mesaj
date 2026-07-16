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
  matchMode: string;
  createdAt: string;
  isOwner: boolean;
}

interface DisplayMessage {
  id: string;
  body: string;
  isAnonymous: boolean;
  isSystemMessage?: boolean;
  senderAvatarId?: string | null;
  createdAt: string;
}

// Kullanici istegi: kendi sorumun sayfasina girdigimde, gelen HER
// yanit (bekleyen/kabul edilmis/reddedilmis) ayri bir "iletisim"
// olarak listelensin.
interface OwnerAttempt {
  id: string;
  answerText: string;
  status: "pending" | "accepted" | "rejected";
  threadId: string | null;
  createdAt: string;
  attempterAvatarId: string | null;
}

type ViewState = "loading" | "question" | "attempting" | "matched" | "pending" | "own-question" | "not-found";

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
  // Kullanici istegi: sahip yonetim gorunumu icin - tum yanitlar
  // (durumu ne olursa olsun) + silme/kabul/reddet islemleri.
  const [ownerAttempts, setOwnerAttempts] = useState<OwnerAttempt[]>([]);
  const [processingAttemptId, setProcessingAttemptId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Kullanici istegi (bug duzeltmesi): skipAuth KALDIRILDI - giris
    // yapmis kullanicinin token'i varsa backend'e gonderilir, boylece
    // "bu senin sorun mu" (isOwner) bilgisi dogru gelir. Giris yapmamis
    // ziyaretciler icin de sorunsuz calisir (token yoksa header hic
    // eklenmez).
    apiFetch<PoolEntryDetail>(`/pool/entries/${entryId}`)
      .then((data) => {
        setEntry(data);
        // Kullanici istegi: soru sahibi kendi sorusuna girdiginde ona
        // cevap formu gosterilmemeli - kendi belirledigi cevabi zaten
        // biliyor, bu sacma olurdu. Bunun yerine soru+cevap en tepede,
        // gelen her yanit ayri bir "iletisim" olarak listelendigi bir
        // yonetim ekrani gorur.
        if (data.isOwner) {
          setView("own-question");
          fetchOwnerAttempts();
        } else {
          setView("question");
        }
      })
      .catch(() => setView("not-found"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  function fetchOwnerAttempts() {
    apiFetch<OwnerAttempt[]>(`/pool/entries/${entryId}/attempts`)
      .then(setOwnerAttempts)
      .catch(() => {});
  }

  // Kullanici istegi: sahip yonetim ekrani da 5sn'de bir yenilensin -
  // yeni gelen yanitlar elle yenilemeden gorunsun.
  useEffect(() => {
    if (view !== "own-question") return;
    const interval = setInterval(fetchOwnerAttempts, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  async function handleOwnerAccept(attemptId: string) {
    setProcessingAttemptId(attemptId);
    try {
      await apiFetch(`/pool/attempts/${attemptId}/accept`, { method: "POST" });
      fetchOwnerAttempts();
    } finally {
      setProcessingAttemptId(null);
    }
  }

  async function handleOwnerReject(attemptId: string) {
    setProcessingAttemptId(attemptId);
    try {
      await apiFetch(`/pool/attempts/${attemptId}/reject`, { method: "POST" });
      fetchOwnerAttempts();
    } finally {
      setProcessingAttemptId(null);
    }
  }

  // Kullanici istegi: soruyu istedigim zaman kaldirabilmeliyim - kendi
  // kendine kalkmiyor, sadece bilincli bir silme islemiyle gizlenir.
  async function handleDeleteEntry() {
    if (!confirm("Bu soruyu kaldırmak istediğine emin misin? Bir daha görünmeyecek.")) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/pool/entries/${entryId}`, { method: "DELETE" });
      router.push("/mesajlarim");
    } catch {
      setIsDeleting(false);
    }
  }

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
        success: boolean | null;
        pending?: boolean;
        threadId?: string;
        threadAccessToken?: string;
      }>(`/pool/entries/${entryId}/attempt`, {
        method: "POST",
        body: JSON.stringify({ answer }),
      });

      // Kullanici istegi: "Tum Yanitlari Goster" modunda her yanit
      // (dogru/yanlis fark etmeksizin) inceleme icin soru sahibine
      // dusuyor - burada anlik bir esleseme/thread OLUSMAZ.
      if (data.pending) {
        setView("pending");
        return;
      }

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

  // Kullanici istegi (bug duzeltmesi): bu soruyu SEN olusturdun -
  // kendi belirledigin cevabi zaten biliyorsun, bu yuzden sana cevap
  // formu gostermek yerine Mesajlarim'a yonlendiriyoruz (gelen
  // yanitlari orada kabul/reddedebilirsin).
  // Kullanici istegi (bug duzeltmesi): bu soruyu SEN olusturdun -
  // kendi belirledigin cevabi zaten biliyorsun, bu yuzden sana cevap
  // formu yerine bir yonetim ekrani gosteriyoruz: soru+cevap en
  // tepede, gelen HER yanit (bekleyen/kabul/reddedilmis) ayri bir
  // "iletisim" satiri olarak listelenir. Devam edip etmemeye SEN
  // karar verirsin.
  if (view === "own-question") {
    return (
      <main className="min-h-screen bg-mint px-4 py-12">
        <div className="mx-auto max-w-md space-y-4">
          <Card lifted className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="font-display text-xl font-bold text-slate">{entry?.title}</h1>
                <p className="mt-1 font-body text-slate-light">{entry?.questionText}</p>
              </div>
              <button
                type="button"
                onClick={handleDeleteEntry}
                disabled={isDeleting}
                className="shrink-0 rounded-full p-1.5 text-slate-light hover:bg-coral-light hover:text-coral"
                aria-label="Soruyu Sil"
              >
                🗑️
              </button>
            </div>
          </Card>

          <h2 className="font-display text-sm font-bold text-slate-light uppercase tracking-wide">
            Gelen Yanıtlar
          </h2>

          {ownerAttempts.length === 0 ? (
            <Card>
              <p className="font-body text-slate-light text-center py-6">
                Henüz bir yanıt yok.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {ownerAttempts.map((attempt) => (
                <Card
                  key={attempt.id}
                  className={`space-y-2 ${
                    attempt.status === "pending" ? "border-2 border-meadow bg-meadow-light/40" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {attempt.attempterAvatarId && (
                      <Avatar avatarId={attempt.attempterAvatarId} size={32} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm text-slate">{attempt.answerText}</p>
                      <p className="mt-0.5 font-body text-xs text-slate-light">
                        {new Date(attempt.createdAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 font-body text-xs ${
                        attempt.status === "accepted"
                          ? "bg-meadow-light text-meadow-hover"
                          : attempt.status === "rejected"
                            ? "bg-coral-light text-coral"
                            : "bg-sun/30 text-slate"
                      }`}
                    >
                      {attempt.status === "accepted"
                        ? "Kabul Edildi"
                        : attempt.status === "rejected"
                          ? "Reddedildi"
                          : "Bekliyor"}
                    </span>
                  </div>

                  {/* Kullanici istegi: iletisim devam ettirilip
                      ettirilmeyecegine ben karar veririm. */}
                  {attempt.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleOwnerAccept(attempt.id)}
                        disabled={processingAttemptId === attempt.id}
                      >
                        Kabul Et
                      </Button>
                      <button
                        onClick={() => handleOwnerReject(attempt.id)}
                        disabled={processingAttemptId === attempt.id}
                        className="flex-1 rounded-full border-2 border-slate-light/40 bg-white px-4 py-2 font-body text-sm text-slate hover:bg-mint disabled:opacity-50"
                      >
                        Reddet
                      </button>
                    </div>
                  )}
                  {attempt.status === "accepted" && attempt.threadId && (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => router.push(`/mesaj/${attempt.threadId}`)}
                    >
                      Mesaja Git
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  // Kullanici istegi: "Tum Yanitlari Goster" modunda yanit gonderildikten
  // sonra anlik esleseme olmuyor - soru sahibinin incelemesi bekleniyor.
  if (view === "pending") {
    return (
      <main className="min-h-screen bg-mint flex items-center justify-center px-4 py-12">
        <Card lifted className="max-w-sm text-center space-y-3">
          <div className="text-5xl">📨</div>
          <h1 className="font-display text-2xl font-bold text-slate">Yanıtın iletildi</h1>
          <p className="font-body text-sm text-slate-light">
            Soru sahibi yanıtını inceleyecek. Kabul ederse, seninle bir mesajlaşma
            penceresi açılacak — bunu &quot;Mesajlarım&quot; ekranından takip edebilirsin.
          </p>
          <Button className="w-full" onClick={() => router.push("/mesajlarim")}>
            Mesajlarıma Git
          </Button>
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
            if (msg.isSystemMessage) {
              return (
                <Card key={msg.id} className="bg-sky-light/50 border-2 border-sky/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded-full bg-sky px-2 py-0.5 font-body text-[10px] font-bold text-white">
                      YouHaveMi
                    </span>
                  </div>
                  <p className="font-body text-slate">{msg.body}</p>
                </Card>
              );
            }

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
          {entry?.matchMode === "review" && (
            <p className="font-body text-xs text-slate-light text-center bg-sky-light/40 rounded-xl px-3 py-2">
              Bu soruda yanıtlar soru sahibi tarafından tek tek incelenir — otomatik
              eşleşme yok, gönderdiğin yanıt sahibinin onayına sunulur.
            </p>
          )}
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
