"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Toggle } from "@/components/ui/Toggle";

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
  senderAvatarId?: string | null;
  readAt: string | null;
  createdAt: string;
}

type ViewState = "loading" | "unlock" | "unlocking" | "messages" | "error";

// Thread access token'i, ayni tarayici sekmesi acikken hatirlamak icin
// sessionStorage'da saklariz - boylece kullanici "Mesajlarim"dan ayni
// konusmaya tekrar girdiginde parolayi/cevabi yeniden sormayiz. Token
// zaten kendi suresi (10dk) dolunca gecersiz olur; backend 401 donerse
// asagida otomatik olarak unlock formuna geri duseriz.
function getStoredThreadToken(threadId: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(`thread_token_${threadId}`);
}

function setStoredThreadToken(threadId: string, token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`thread_token_${threadId}`, token);
}

function clearStoredThreadToken(threadId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`thread_token_${threadId}`);
}

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
  // Bu oturumda benim gonderdigim mesajlarin ID'leri - anonim mesajlarda
  // backend senderUserId'yi kimseye dondurmedigi icin (Bolum 8), "kimin
  // mesaji oldugunu" bu sekilde takip ediyoruz (Bolum 13, gorsel ayrim).
  const [myMessageIds, setMyMessageIds] = useState<Set<string>>(new Set());

  // Gorev 13.1 + 13.2: Yanit yazma + kimlik gosterme anahtari.
  const [replyBody, setReplyBody] = useState("");
  const [replyAnonymous, setReplyAnonymous] = useState(true);
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  // Gorev 13.3: Engelle/Sikayet Et.
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Katman 1 kontrolu - girisi yoksa, geri donebilmesi icin `next`
  // parametresiyle /giris'e yonlendir.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/giris?next=/mesaj/${threadId}`);
    }
  }, [authLoading, isAuthenticated, router, threadId]);

  // Kullanici geri bildirimi: mesajin icindeyken tarayici sekme
  // basligi da mesajin baslikta gorunen metniyle (soru varsa soru,
  // yoksa genel etiket) eslessin.
  useEffect(() => {
    if (view !== "messages") return;
    const title =
      meta?.lockType === "question" && meta.questionText
        ? `${meta.questionText} · YouHaveMi`
        : "Sana Bir Mesaj Var · YouHaveMi";
    document.title = title;
    return () => {
      document.title = "YouHaveMi — Ona doğru şekilde ulaş";
    };
  }, [view, meta]);

  // Thread metadata'sini cek (kilit tipi, soru metni). Ama once
  // sessionStorage'da bu thread icin gecerli bir token var mi bak -
  // varsa unlock formunu hic gostermeden dogrudan mesajlara gec.
  useEffect(() => {
    if (!isAuthenticated) return;

    const storedToken = getStoredThreadToken(threadId);
    if (storedToken) {
      apiFetch<DisplayMessage[]>(`/threads/${threadId}/messages`, {
        skipAuth: true,
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((msgs) => {
          setThreadToken(storedToken);
          setMessages(msgs);
          setView("messages");
          apiFetch<ThreadMeta>(`/threads/${threadId}`)
            .then(setMeta)
            .catch(() => {});
        })
        .catch(() => {
          clearStoredThreadToken(threadId);
          tryDirectAccess();
        });
      return;
    }

    tryDirectAccess();

    // Bu thread'i olusturan kisiysem (initiator) VEYA bu thread'i daha
    // once basariyla actiysam (ThreadUnlock kaydi varsa - Kullanici
    // geri bildirimi: bir kez dogru parolayi/cevabi giren kisi bir
    // daha sorulmamali), parolayi/cevabi tekrar girmeme gerek yok -
    // backend Katman 1 kimligimle dogrudan mesajlara erismeme izin
    // veriyor. Bu yol basarisiz olursa (ilk kez aciyorsam) normal
    // unlock akisina duseriz.
    function tryDirectAccess() {
      apiFetch<DisplayMessage[]>(`/threads/${threadId}/messages`)
        .then((msgs) => {
          setMessages(msgs);
          setView("messages");
          // Soru metnini de (varsa) baglam icin cekelim - bu yol
          // (sahip/daha once acmis kisi) normalde meta'yi hic cekmiyordu.
          apiFetch<ThreadMeta>(`/threads/${threadId}`)
            .then(setMeta)
            .catch(() => {});
        })
        .catch(fetchMeta);
    }

    function fetchMeta() {
      apiFetch<ThreadMeta>(`/threads/${threadId}`)
        .then((data) => {
          setMeta(data);
          setView("unlock");
        })
        .catch(() => {
          setError("Bu mesaj bulunamadı ya da artık mevcut değil.");
          setView("error");
        });
    }
  }, [isAuthenticated, threadId]);

  async function refreshMessages(token: string) {
    const msgs = await apiFetch<DisplayMessage[]>(`/threads/${threadId}/messages`, {
      skipAuth: true,
      headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(msgs);
  }

  // Mesaj ekranindayken 5 saniyede bir otomatik yenileme (polling) -
  // karsi taraf yanit yazdiginda sayfayi elle yenilemeye gerek kalmaz.
  // threadToken yoksa (sahip kisayolu) normal Katman 1 kimligiyle cekilir.
  useEffect(() => {
    if (view !== "messages") return;

    const interval = setInterval(() => {
      const fetchPromise = threadToken
        ? refreshMessages(threadToken)
        : apiFetch<DisplayMessage[]>(`/threads/${threadId}/messages`).then(setMessages);

      fetchPromise.catch(() => {
        // Sessizce yoksay - token suresi dolduysa bir sonraki manuel
        // islemde (orn. yanit gonderirken) zaten fark edilecek.
      });
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, threadToken, threadId]);

  async function handleReply() {
    setReplyError(null);
    setIsReplying(true);
    try {
      const sent = await apiFetch<{ id: string }>(`/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: replyBody, isAnonymous: replyAnonymous }),
        // threadToken varsa (alici yolu) X-Thread-Access-Token gonderilir.
        // Yoksa (sahip kisayolu) ThreadWriteGuard, normal Katman 1
        // access_token'la sahiplik uzerinden zaten izin verir.
        headers: threadToken ? { "X-Thread-Access-Token": threadToken } : undefined,
      });
      setMyMessageIds((prev) => new Set(prev).add(sent.id));
      setReplyBody("");
      if (threadToken) {
        await refreshMessages(threadToken);
      } else {
        const msgs = await apiFetch<DisplayMessage[]>(`/threads/${threadId}/messages`);
        setMessages(msgs);
      }
    } catch {
      setReplyError("Yanıt gönderilemedi. Lütfen tekrar dene.");
    } finally {
      setIsReplying(false);
    }
  }

  // Gorev 13.3: Numarayi/kullaniciyi engelleme. Bunun icin karsi
  // tarafin telefon numarasina degil, bu ekranda dogrudan kullanici
  // ID'sine ihtiyacimiz var - ama biz numarayi bilmiyoruz (Bolum 8,
  // "numara asla client'a sizmaz"). O yuzden backend'in block
  // endpoint'i telefon numarasi bekliyor; bu ekrandan sadece "bu
  // konusmayi sikayet et" akisini tetikleyip, engellemeyi Ayarlar'a
  // birakiyoruz (Gorev 13.4/13.5 ile birlikte netlesecek).
  async function handleReport() {
    setActionMessage(null);
    try {
      await apiFetch(`/safety/threads/${threadId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: "Kullanıcı bu konuşmayı şikayet etti." }),
      });
      setActionMessage("Şikayetin alındı. İnceleyeceğiz.");
    } catch {
      setActionMessage("Şikayet gönderilemedi. Lütfen tekrar dene.");
    }
  }

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
      setStoredThreadToken(threadId, data.thread_access_token);

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

  // Gorev 11.6 + 13.1 + 13.2 + 13.3: Mesaj gosterim ekrani + yanit
  // formu (kimlik gosterme anahtariyla) + sikayet butonu.
  if (view === "messages") {
    // Kullanici geri bildirimi: parola/cevap hash'li oldugu icin
    // gosterilemiyor - onun yerine "hangi mesajdi" bilgisini, bu
    // mesaji ilk gordugun/olusturdugun tarih-saat ile ayirt ediyoruz.
    const firstMessageDate = messages[0]?.createdAt;
    // Kullanici geri bildirimi: baslik olarak genel "Sana Bir Mesaj Var"
    // yerine, soru modundaysa dogrudan soru metni gosterilsin.
    const pageTitle =
      meta?.lockType === "question" && meta.questionText
        ? meta.questionText
        : "Sana Bir Mesaj Var";

    return (
      <main className="min-h-screen bg-mint px-4 py-12">
        <div className="mx-auto max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate">{pageTitle}</h1>
              {firstMessageDate && (
                <p className="font-body text-xs text-slate-light mt-0.5">
                  {new Date(firstMessageDate).toLocaleString("tr-TR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleReport}
              className="font-body text-xs text-coral underline underline-offset-2"
            >
              Şikayet Et
            </button>
          </div>

          {actionMessage && <p className="font-body text-sm text-meadow-hover">{actionMessage}</p>}

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
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-slate">{msg.body}</p>
                    <p className="mt-2 font-body text-xs text-slate-light">
                      {new Date(msg.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </div>
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
              id="reply-anon-toggle"
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
