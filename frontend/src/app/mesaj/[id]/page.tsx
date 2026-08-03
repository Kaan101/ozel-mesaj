"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { MessageSuggestions } from "@/components/ui/MessageSuggestions";
import { FaceImagePicker } from "@/components/ui/FaceImagePicker";
import { Toggle } from "@/components/ui/Toggle";
import { SwipeToDelete } from "@/components/ui/SwipeToDelete";
import { ReactionBar } from "@/components/ui/ReactionBar";
import { ReplySuggestionsPopup } from "@/components/ui/ReplySuggestionsPopup";
import { useLanguage } from "@/lib/language-context";
import { fetchWeatherSummary } from "@/lib/weather";

interface ThreadMeta {
  id: string;
  originType: string;
  lockType: "password" | "question";
  questionText: string | null;
  createdAt: string;
  displayTitle: string | null;
  needsReveal: boolean;
}

interface DisplayMessage {
  id: string;
  body: string;
  isAnonymous: boolean;
  isSystemMessage?: boolean;
  senderUserId?: string;
  senderAvatarId?: string | null;
  senderAvatarConfig?: Record<string, unknown> | null;
  senderDisplayName?: string | null;
  readAt: string | null;
  createdAt: string;
  reactions: { counts: Record<string, number>; myReaction: string | null };
  weatherSummary?: string | null;
  // Kullanici istegi: guardrail'e takilip "pending" durumundaki
  // kendi mesajimi kirmizi cerceveyle gorebilmek icin.
  moderationStatus?: string;
  // Kullanici istegi: sabit resim setinden gonderilen mesajlarin
  // gorseli - varsa metin yerine bu resim gosterilir.
  imageKey?: string | null;
}

type ViewState = "loading" | "unlock" | "unlocking" | "reveal-gate" | "messages" | "error";

// Kullanici istegi: mesajlar arasinda tarih ayiricisi - hafta icindeyse
// gun adi (orn. "Salı"), bugunse "Bugün", daha eskiyse tam tarih
// (orn. "8 Haziran 2026").
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (diffDays === 0) return "Bugün";
  if (diffDays > 0 && diffDays < 7) {
    const dayName = date.toLocaleDateString("tr-TR", { weekday: "long" });
    return dayName.charAt(0).toUpperCase() + dayName.slice(1);
  }
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

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
  const { t } = useLanguage();

  const [view, setView] = useState<ViewState>("loading");
  const [meta, setMeta] = useState<ThreadMeta | null>(null);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);

  // Kullanici istegi: konusma HANGI yoldan acilirsa acilsin (Mesajlarim
  // listesinden, dogrudan link/bildirimden vb.), mesajlar yuklenir
  // yuklenmez menudeki yesil nokta ANINDA kaybolsun - Mesajlarim
  // sayfasindaki AYNI localStorage anahtarina yazar.
  useEffect(() => {
    if (messages.length === 0) return;
    const latestMessageAt = messages.reduce(
      (max, m) => (m.createdAt > max ? m.createdAt : max),
      messages[0].createdAt
    );
    try {
      const raw = localStorage.getItem("seen_thread_last_message_at");
      const seenMap = raw ? JSON.parse(raw) : {};
      seenMap[threadId] = latestMessageAt;
      localStorage.setItem("seen_thread_last_message_at", JSON.stringify(seenMap));
      // Ayni sekmede acik olan SiteHeader'in ANINDA (sayfa degismeden)
      // haberdar olmasi icin custom event yayinlanir.
      window.dispatchEvent(new Event("thread-seen-updated"));
    } catch {
      // localStorage erisilemezse (gizli sekme vb.) sessizce gec.
    }
  }, [messages, threadId]);
  const [threadToken, setThreadToken] = useState<string | null>(null);
  // Bu oturumda benim gonderdigim mesajlarin ID'leri - anonim mesajlarda
  // backend senderUserId'yi kimseye dondurmedigi icin (Bolum 8), "kimin
  // mesaji oldugunu" bu sekilde takip ediyoruz (Bolum 13, gorsel ayrim).
  const [myMessageIds, setMyMessageIds] = useState<Set<string>>(new Set());
  // Kullanici istegi (bug duzeltmesi): kendi mesajimi guvenilir sekilde
  // tanimak icin kendi kullanici ID'mi de tutuyoruz - anonim OLMAYAN
  // mesajlarda backend senderUserId'yi dondurur, bununla karsilastirip
  // "silme" butonunun HER ZAMAN (anonim olsun olmasin) dogru gorunmesini
  // sagliyoruz.
  const [myUserId, setMyUserId] = useState<string | null>(null);

  // Gorev 13.1 + 13.2: Yanit yazma.
  const [replyBody, setReplyBody] = useState("");
  // Kullanici istegi: yanit formundaki tum secenekler acilir-kapanir
  // bir bolumde - kapaliyken hicbir secenek gorunmez.
  const [isReplyOptionsExpanded, setIsReplyOptionsExpanded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiFetch<{ id: string; alwaysAddWeather: boolean }>("/me")
      .then((data) => {
        setMyUserId(data.id);
        // Kullanici istegi: /ayarlar'da acikken, hava durumu her
        // yanitta otomatik eklensin.
        if (data.alwaysAddWeather) setReplyAddWeather(true);
      })
      .catch(() => {});
  }, [isAuthenticated]);
  // Kullanici istegi: her yanit icin ayri ayri "okunduktan sonra
  // silinsin" secilebilsin.
  const [replyDestroyAfterRead, setReplyDestroyAfterRead] = useState(false);
  // Kullanici istegi: mesaj yazarken anlik hava durumunu mesajla
  // birlikte gonderebilme (izin verirse).
  const [replyAddWeather, setReplyAddWeather] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  // Gorev 13.3: Engelle/Sikayet Et.
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  // Kullanici istegi: sikayet ederken bir sebep aciklamasi girilebilsin.
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

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
    const title = meta?.displayTitle
      ? `${meta.displayTitle} · YouHaveMi`
      : meta?.lockType === "question" && meta.questionText
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
          apiFetch<ThreadMeta>(`/threads/${threadId}`)
            .then((data) => {
              setMeta(data);
              // Kullanici istegi: alici bu iletisimi HENUZ ILK KEZ
              // "gostermeyi" onaylamadiysa, mesajlar yerine once
              // kapı ekranini gosteriyoruz.
              setView(data.needsReveal ? "reveal-gate" : "messages");
            })
            .catch(() => setView("messages"));
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
          // Soru metnini de (varsa) baglam icin cekelim - bu yol
          // (sahip/daha once acmis kisi) normalde meta'yi hic cekmiyordu.
          apiFetch<ThreadMeta>(`/threads/${threadId}`)
            .then((data) => {
              setMeta(data);
              setView(data.needsReveal ? "reveal-gate" : "messages");
            })
            .catch(() => setView("messages"));
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

  // Kullanici istegi: gonderdigim bir mesaji konusmadan silebilirim -
  // arsiv/log kaydi (MessageAudit) etkilenmez, sadece konusma
  // gorunumunden kalkar.
  async function handleDeleteMessage(messageId: string) {
    if (!confirm("Bu mesajı silmek istediğine emin misin?")) return;
    try {
      await apiFetch(`/threads/${threadId}/messages/${messageId}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      alert("Mesaj silinemedi. Lütfen tekrar dene.");
    }
  }

  // Kullanici istegi: gelen mesaja begen/begenme ya da emoji tepkisi.
  async function handleReactToMessage(messageId: string, emoji: string) {
    try {
      const result = await apiFetch<{ removed: boolean }>(
        `/threads/${threadId}/messages/${messageId}/react`,
        { method: "POST", body: JSON.stringify({ emoji }) }
      );
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const counts = { ...m.reactions.counts };
          if (m.reactions.myReaction) {
            counts[m.reactions.myReaction] = Math.max(0, (counts[m.reactions.myReaction] ?? 1) - 1);
          }
          const myReaction = result.removed ? null : emoji;
          if (myReaction) counts[myReaction] = (counts[myReaction] ?? 0) + 1;
          return { ...m, reactions: { counts, myReaction } };
        })
      );
    } catch {
      // Sessizce gec - tepki vermek kritik bir islem degil.
    }
  }

  async function handleReply() {
    setReplyError(null);
    setIsReplying(true);
    try {
      const weatherSummary = replyAddWeather ? await fetchWeatherSummary() : undefined;

      const sent = await apiFetch<{ id: string }>(`/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body: replyBody,
          // Kullanici istegi: anonimlik artik mesaj bazinda secilmiyor -
          // backend, /ayarlar'daki tercihimden otomatik turetir.
          destroyAfterRead: replyDestroyAfterRead,
          weatherSummary: weatherSummary ?? undefined,
        }),
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
    } catch (err) {
      // Kullanici istegi: bir kisi bloke oldugunda (ya da baska bir
      // guardrail/blok nedeniyle) mesaj gonderilemezse, backend'in
      // GERCEK (spesifik) hata mesaji gosterilir - genel bir mesaj
      // yerine "Mesaj göndermeniz engellendi" gibi net bir bilgi verir.
      setReplyError(
        err instanceof ApiError && err.message
          ? err.message
          : "Mesaj göndermeniz engellendi. Lütfen tekrar dene."
      );
    } finally {
      setIsReplying(false);
    }
  }

  // Kullanici istegi: sabit resim setinden secilen bir resim, METIN
  // YAZILMADAN, DOGRUDAN mesaj olarak gonderilir.
  async function handleSendReplyImage(imageKey: string) {
    setReplyError(null);
    setIsReplying(true);
    try {
      const sent = await apiFetch<{ id: string }>(`/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body: t("faceImages.sentLabel"),
          destroyAfterRead: replyDestroyAfterRead,
          imageKey,
        }),
        headers: threadToken ? { "X-Thread-Access-Token": threadToken } : undefined,
      });
      setMyMessageIds((prev) => new Set(prev).add(sent.id));
      if (threadToken) {
        await refreshMessages(threadToken);
      } else {
        const msgs = await apiFetch<DisplayMessage[]>(`/threads/${threadId}/messages`);
        setMessages(msgs);
      }
    } catch (err) {
      setReplyError(
        err instanceof ApiError && err.message
          ? err.message
          : "Mesaj göndermeniz engellendi. Lütfen tekrar dene."
      );
    } finally {
      setIsReplying(false);
    }
  }

  // Kullanici istegi: mesaj ekranindan dogrudan "bu kisiyi engelle"
  // ozelligi eklendi - artik telefon numarasina gerek kalmadan,
  // threadId uzerinden backend karsi tarafi cozup engelliyor (Bolum 8
  // gizlilik modeliyle tutarli, bkz. yeni /safety/threads/:id/block).
  // Kullanici istegi: alici "Mesaji Goster"e basinca cagrilir - bu
  // iletisim icin bir daha bu kapı gosterilmez.
  async function handleRevealMessage() {
    try {
      await apiFetch(`/threads/${threadId}/reveal`, { method: "POST" });
      const msgs = threadToken
        ? await apiFetch<DisplayMessage[]>(`/threads/${threadId}/messages`, {
            skipAuth: true,
            headers: { Authorization: `Bearer ${threadToken}` },
          })
        : await apiFetch<DisplayMessage[]>(`/threads/${threadId}/messages`);
      setMessages(msgs);
      setView("messages");
    } catch {
      setError("Bir şeyler ters gitti. Lütfen tekrar dene.");
    }
  }

  // Kullanici istegi: kapı ekranindan (mesaji hic gormeden) engelle/
  // sikayet edilebilsin. Islem sonrasi Mesajlarim'a donulur - zaten
  // gorecek bir sey kalmadi.
  async function handleBlockFromGate() {
    if (
      !confirm("Bu kişiyi engellemek istediğine emin misin? Bir daha sana mesaj gönderemeyecek.")
    ) {
      return;
    }
    try {
      await apiFetch(`/safety/threads/${threadId}/block`, { method: "POST" });
      router.push("/mesajlarim");
    } catch {
      setError("Engelleme işlemi başarısız oldu. Lütfen tekrar dene.");
    }
  }

  async function handleReportFromGate() {
    try {
      await apiFetch(`/safety/threads/${threadId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: "Kullanıcı mesajı görmeden şikayet etti." }),
      });
      router.push("/mesajlarim");
    } catch {
      setError("Şikayet gönderilemedi. Lütfen tekrar dene.");
    }
  }

  async function handleBlock() {
    if (!confirm("Bu kişiyi engellemek istediğine emin misin? Bir daha sana mesaj gönderemeyecek.")) {
      return;
    }
    setActionMessage(null);
    try {
      await apiFetch(`/safety/threads/${threadId}/block`, { method: "POST" });
      setActionMessage("Kullanıcı engellendi.");
    } catch {
      setActionMessage("Engelleme işlemi başarısız oldu. Lütfen tekrar dene.");
    }
  }

  // Gorev 13.3: Sikayet etme.
  async function handleReport() {
    setActionMessage(null);
    try {
      await apiFetch(`/safety/threads/${threadId}/report`, {
        method: "POST",
        body: JSON.stringify({
          reason: reportReason.trim() || "Kullanıcı bu konuşmayı şikayet etti.",
        }),
      });
      setActionMessage("Şikayetin alındı. İnceleyeceğiz.");
      setIsReportFormOpen(false);
      setReportReason("");
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

      // Kullanici istegi: unlock basarili olsa bile, alici bu
      // iletisimi HENUZ ILK KEZ "gostermeyi" onaylamadiysa once
      // kapı ekranini gosteriyoruz. Bu cagri normal giris token'iyla
      // yapilir (getThreadMeta thread_access_token kabul etmez).
      try {
        const metaData = await apiFetch<ThreadMeta>(`/threads/${threadId}`);
        setMeta(metaData);
        setView(metaData.needsReveal ? "reveal-gate" : "messages");
      } catch {
        setView("messages");
      }
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

  // Kullanici istegi: alici bu iletisimi ILK KEZ aciyorsa, mesaj
  // dogrudan gosterilmez - once "Mesaji Goster" ya da mesaji hic
  // gormeden "Engelle"/"Sikayet Et" secenegi sunulur. Bir kez
  // onaylandiktan sonra bir daha bu ekran gorunmez.
  if (view === "reveal-gate") {
    return (
      <main className="min-h-screen bg-mint flex items-center justify-center px-4 py-12">
        <Card lifted className="max-w-sm text-center space-y-4">
          <div className="text-5xl">✉️</div>
          <h1 className="font-display text-2xl font-bold text-slate">Sana bir mesaj var</h1>
          <p className="font-body text-sm text-slate-light">
            Bu, bu kişiden aldığın ilk iletişim. İstersen mesajı görmeden de bu kişiyi
            engelleyebilir ya da şikayet edebilirsin.
          </p>
          {error && <p className="font-body text-sm text-coral">{error}</p>}
          <Button className="w-full" onClick={handleRevealMessage}>
            Mesajı Göster
          </Button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBlockFromGate}
              className="flex-1 rounded-full border-2 border-slate-light/40 bg-white px-4 py-2 font-body text-sm text-slate hover:bg-mint"
            >
              Engelle
            </button>
            <button
              type="button"
              onClick={handleReportFromGate}
              className="flex-1 rounded-full border-2 border-slate-light/40 bg-white px-4 py-2 font-body text-sm text-coral hover:bg-coral-light"
            >
              Şikayet Et
            </button>
          </div>
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
    // Kullanici istegi: detay sayfasindaki baslik, Mesajlarim
    // listesindeki AYNI zengin baslikla (tarih dahil) eslesir -
    // backend'den gelen displayTitle kullanilir.
    const pageTitle =
      meta?.displayTitle ??
      (meta?.lockType === "question" && meta.questionText
        ? meta.questionText
        : "Sana Bir Mesaj Var");

    return (
      <main className="min-h-screen bg-mint px-4 pt-8 pb-12">
        <div className="mx-auto max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate">{pageTitle}</h1>
              {firstMessageDate && (
                <div className="mt-0.5 flex items-center gap-3">
                  <p className="font-body text-xs text-slate-light">
                    {new Date(firstMessageDate).toLocaleString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {/* Kullanici istegi: mesaja hava durumu eklenmisse,
                      tarih-saat bilgisinin yaninda (biraz bosluklu)
                      gosterilir. */}
                  {messages[0]?.weatherSummary && (
                    <p className="font-body text-xs text-slate-light whitespace-nowrap">
                      {messages[0].weatherSummary}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBlock}
                className="font-body text-xs font-bold text-slate-light"
              >
                Engelle
              </button>
              <button
                type="button"
                onClick={() => setIsReportFormOpen((v) => !v)}
                className="font-body text-xs font-bold text-coral"
              >
                Bildir
              </button>
            </div>
          </div>

          {isReportFormOpen && (
            <div className="space-y-2 rounded-2xl bg-coral-light/40 p-3">
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Şikayet sebebini yazar mısın? (opsiyonel)"
                rows={2}
                className="w-full rounded-xl border-2 border-coral/30 bg-white px-3 py-2 font-body text-sm text-slate focus:outline-none focus:border-coral"
              />
              <button
                type="button"
                onClick={handleReport}
                className="rounded-full bg-coral px-4 py-1.5 font-body text-sm font-semibold text-white hover:bg-coral/90"
              >
                Şikayeti Gönder
              </button>
            </div>
          )}

          {actionMessage && <p className="font-body text-sm text-meadow-hover">{actionMessage}</p>}

          {messages.map((msg, index) => {
            // Kullanici istegi: mesajlar arasinda tarih ayiricisi -
            // her mesajdan once, bir onceki mesajla AYNI GUN degilse
            // (ya da bu ILK mesajsa) gosterilir.
            const prevMsg = messages[index - 1];
            const showDateDivider =
              !prevMsg || !isSameDay(new Date(msg.createdAt), new Date(prevMsg.createdAt));
            const dateDivider = showDateDivider ? (
              <div className="flex items-center justify-center py-2">
                <span className="rounded-full bg-white px-3 py-1 font-body text-xs text-slate-light shadow-soft">
                  {formatDateDivider(msg.createdAt)}
                </span>
              </div>
            ) : null;

            if (msg.isSystemMessage) {
              return (
                <div key={msg.id}>
                  {dateDivider}
                  <Card className="bg-sky-light/50 border-2 border-sky/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded-full bg-sky px-2 py-0.5 font-body text-[10px] font-bold text-white">
                      YouHaveMi
                    </span>
                  </div>
                  <p className="font-body text-slate">{msg.body}</p>
                  <p className="mt-2 font-body text-xs text-slate-light">
                    {new Date(msg.createdAt).toLocaleString("tr-TR")}
                  </p>
                  </Card>
                </div>
              );
            }

            // Kullanici istegi (bug duzeltmesi): kendi mesajim mi
            // kontrolu artik SADECE bu oturumda gonderilenlerle sinirli
            // degil - anonim OLMAYAN mesajlarda backend'in dondurdugu
            // senderUserId, kendi ID'mle karsilastirilir. Anonim
            // mesajlarda senderUserId gelmedigi icin (Bolum 8),
            // myMessageIds (bu oturumda gonderdiklerim) hala gerekli.
            const isMine =
              (!!msg.senderUserId && msg.senderUserId === myUserId) || myMessageIds.has(msg.id);
            const isFromCounterpart = !isMine;
            // Kullanici istegi: guardrail'e takilip inceleme bekleyen
            // (pending) KENDI mesajim kirmizi cerceveyle gorunur -
            // "incelemede" oldugunu anlayabilmem icin.
            const isPendingReview = msg.moderationStatus === "pending";
            const messageCard = (
              <Card
                className={`relative ${
                  isPendingReview
                    ? "border-2 border-coral"
                    : isFromCounterpart
                      ? "border-2 border-meadow"
                      : ""
                } ${!isFromCounterpart ? "pr-9" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {msg.senderAvatarId && (
                    <div className="shrink-0 text-center">
                      <AvatarDisplay
                        avatarId={msg.senderAvatarId}
                        avatarConfig={msg.senderAvatarConfig}
                        size={36}
                      />
                      {/* Kullanici istegi: anonim olmayan mesajlarda,
                          gonderenin /ayarlar'da girdigi gorunen ad
                          avatarin altinda gosterilir. */}
                      {msg.senderDisplayName && (
                        <p className="mt-1 max-w-[48px] truncate font-body text-[10px] text-slate-light">
                          {msg.senderDisplayName}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {/* Kullanici istegi: sabit resim setinden gonderilen
                        mesajlarda, metin yerine gercek resim gosterilir. */}
                    {msg.imageKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/images/face/${msg.imageKey}`}
                        alt={t("faceImages.sentLabel")}
                        className="max-h-48 max-w-[200px] rounded-2xl object-cover"
                      />
                    ) : (
                      <p className="font-body text-slate">{msg.body}</p>
                    )}
                    <p className="mt-2 font-body text-xs text-slate-light">
                      {new Date(msg.createdAt).toLocaleString("tr-TR")}
                      {/* Kullanici istegi: bu mesaj gonderilirken hava
                          durumu secilmisse, zaman damgasinin yaninda,
                          AYNI FONTTA gosterilir - hem ilk mesaj hem
                          sonraki her yanit icin gecerli. */}
                      {msg.weatherSummary && <> · {msg.weatherSummary}</>}
                      {isPendingReview && (
                        <span className="ml-1 font-semibold text-coral">· İnceleniyor</span>
                      )}
                    </p>
                    <div className="flex items-center gap-3">
                      <ReactionBar
                        reactions={msg.reactions}
                        onReact={(emoji) => handleReactToMessage(msg.id, emoji)}
                      />
                      {/* Kullanici istegi: karsi taraftan gelen mesajin
                          icerigine gore pratik yanit onerileri sunan
                          bir popup - "Yanıtla" ile acilir. */}
                      {isFromCounterpart && (
                        <ReplySuggestionsPopup
                          incomingText={msg.body}
                          onSelect={(text) => setReplyBody(text)}
                        />
                      )}
                    </div>
                  </div>
                </div>
                {/* Kullanici geri bildirimi: masaustu (fare) icin
                    kucuk sil ikonu - sadece KENDI mesajimda gorunur. */}
                {!isFromCounterpart && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="absolute right-2 bottom-2 rounded-full p-0.5 text-[10px] text-slate-light hover:bg-coral-light hover:text-coral"
                    aria-label="Mesajı Sil"
                  >
                    🗑️
                  </button>
                )}
              </Card>
            );

            // Kullanici istegi: mobilde kaydirarak (swipe) da silinebilsin -
            // ama SADECE kendi mesajimda (karsi tarafin mesaji swipe
            // edilince silme secenegi cikmamali).
            return (
              <div key={msg.id}>
                {dateDivider}
                {isFromCounterpart ? (
                  messageCard
                ) : (
                  <SwipeToDelete deleteLabel="Sil" onDelete={() => handleDeleteMessage(msg.id)}>
                    {messageCard}
                  </SwipeToDelete>
                )}
              </div>
            );
          })}

          {/* Gorev 13.1 + 13.2: Yanit formu */}
          <Card lifted className="space-y-3">
            {/* Kullanici istegi: avatar/nickname onizlemesi ve secenegi
                yanit formundan tamamen kaldirildi - sadece /ayarlar'daki
                tercihe gore calisir, burada gosterilmez. */}
            <Textarea
              label="Yanıtın"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Merhaba, ben de..."
            />
            {/* Kullanici istegi: mesaj onerileri ve resim gonderme
                butonlari AYNI satirda, aralarinda bosluk birakilarak
                gosterilir. */}
            <div className="flex items-center gap-4">
              <MessageSuggestions onSelect={setReplyBody} />
              <FaceImagePicker onSelect={handleSendReplyImage} disabled={isReplying} />
            </div>

            {/* Kullanici istegi: tum secenekler acilir-kapanir bir
                bolumde - kapaliyken hicbir secenek gorunmez. */}
            <button
              type="button"
              onClick={() => setIsReplyOptionsExpanded((v) => !v)}
              className="flex w-full items-center justify-between py-1"
            >
              <span className="font-body text-sm font-semibold text-slate">
                {t("common.options")}
              </span>
              <span
                className={`font-body text-slate-light transition-transform ${
                  isReplyOptionsExpanded ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>

            {isReplyOptionsExpanded && (
              <>
                {/* Kullanici istegi: anonimlik artik mesaj bazinda
                    secilmiyor - /ayarlar'daki tercihten turetiliyor,
                    burada secenek gosterilmez. */}
                <Toggle
                  id="reply-destroy-after-read-toggle"
                  checked={replyDestroyAfterRead}
                  onChange={setReplyDestroyAfterRead}
                  label={t("mesajOlustur.destroyAfterRead")}
                  labelClassName="text-slate-light"
                />
                {/* Kullanici istegi: mesaj yazarken anlik hava durumunu
                    (izin verirse) mesajla birlikte gonderebilme.
                    Kullanici istegi: "Okununca Sil" secenegiyle arasina
                    belirgin bir bosluk birakildi, metin dile bagli. */}
                <div className="pt-4">
                  <Toggle
                    id="reply-add-weather-toggle"
                    checked={replyAddWeather}
                    onChange={setReplyAddWeather}
                    label={t("mesajOlustur.addWeather")}
                  />
                </div>
              </>
            )}

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
