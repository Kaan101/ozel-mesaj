"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

interface MyThread {
  id: string;
  originType: string;
  lockType: "password" | "question" | "none";
  questionText: string | null;
  firstMessageBody: string | null;
  recipientPhoneDisplay: string | null;
  counterpartAvatarId: string | null;
  createdAt: string;
  lastMessageAt: string;
  role: "initiator" | "recipient";
}

interface PendingAttempt {
  id: string;
  answerText: string;
  createdAt: string;
  attempterAvatarId: string | null;
}

interface MyPoolEntry {
  id: string;
  title: string;
  questionText: string;
  matchMode: "exact" | "review";
  attemptCount: number;
  createdAt: string;
  pendingAttempts: PendingAttempt[];
}

const SEEN_IDS_KEY = "seen_thread_ids";

function loadSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  localStorage.setItem(SEEN_IDS_KEY, JSON.stringify([...ids]));
}

// "İletişim" = bu listedeki her satır (bir konuşma ya da bir havuz
// sorusu). Bunlarin ICINE girdiginde ("Mesaj" ekraninda) gorunen
// tekil gelen/giden yazismalar ise "mesaj" olarak adlandiriliyor -
// terminoloji kullanici istegiyle netlestirildi.
type ListItem =
  | { kind: "thread"; activityDate: string; data: MyThread }
  | { kind: "pool"; activityDate: string; data: MyPoolEntry };

// Kullanicinin gonderdigi/aldigi tum iletisimleri (thread + havuz
// sorulari) TEK BIR listede, en son aktiviteye gore siralar (Bolum:
// kullanici istegi - "bana gelen"/"benim gonderdigim" ayri bolumler
// yerine, en aktif iletisim en tepede).
export default function MesajlarimPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [threads, setThreads] = useState<MyThread[]>([]);
  const [poolEntries, setPoolEntries] = useState<MyPoolEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/giris?next=/mesajlarim");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    setSeenIds(loadSeenIds());
  }, []);

  function fetchAll() {
    Promise.all([
      apiFetch<MyThread[]>("/threads/mine"),
      apiFetch<MyPoolEntry[]>("/pool/entries/mine"),
    ])
      .then(([threadData, poolData]) => {
        setThreads(threadData);
        setPoolEntries(poolData);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAll();
  }, [isAuthenticated]);

  // Liste asenkron olarak (5sn'de bir) guncellensin - yeni gelen bir
  // mesaj/iletisim talebi/havuz yaniti elle yenilemeden gorunsun.
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  function handleOpenThread(threadId: string) {
    const updated = new Set(seenIds);
    updated.add(threadId);
    setSeenIds(updated);
    saveSeenIds(updated);
  }

  async function handleDeleteThread(threadId: string) {
    // Kendi listesinden gizler - karsi tarafi etkilemez.
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    try {
      await apiFetch(`/threads/${threadId}/hide`, { method: "DELETE" });
    } catch {
      // Basarisiz olursa listeyi yeniden cekip gercek durumu yansitalim.
      fetchAll();
    }
  }

  // Kullanici istegi: havuz sorusunu istedigim zaman kaldirabilmeliyim -
  // kendi kendine kalkmiyor, sadece bilincli bir silme islemiyle
  // gizlenir (karsi taraf/attempt kayitlari etkilenmez).
  async function handleDeletePoolEntry(entryId: string) {
    setPoolEntries((prev) => prev.filter((e) => e.id !== entryId));
    try {
      await apiFetch(`/pool/entries/${entryId}`, { method: "DELETE" });
    } catch {
      fetchAll();
    }
  }

  if (authLoading || !isAuthenticated) {
    return <main className="min-h-screen bg-mint" />;
  }

  const isEmpty = threads.length === 0 && poolEntries.length === 0;

  // Kullanici istegi: ayri "bana gelenler"/"gonderdiklerim" bolumleri
  // yerine TEK bir liste - en son aktivitesi olan (mesaj/yanit gelen)
  // iletisim en tepede.
  const combined: ListItem[] = [
    ...threads.map((thread): ListItem => ({
      kind: "thread",
      activityDate: thread.lastMessageAt,
      data: thread,
    })),
    ...poolEntries.map((entry): ListItem => {
      const latestAttemptDate = entry.pendingAttempts[0]?.createdAt;
      return {
        kind: "pool",
        activityDate: latestAttemptDate ?? entry.createdAt,
        data: entry,
      };
    }),
  ].sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime());

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="font-display text-2xl font-bold text-slate">{t("mesajlarim.title")}</h1>

        {isLoading ? (
          <p className="font-body text-slate-light">{t("mesajlarim.loading")}</p>
        ) : isEmpty ? (
          <Card>
            <p className="font-body text-slate-light text-center py-6">
              {t("mesajlarim.empty")}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {combined.map((item) =>
              item.kind === "thread" ? (
                <ThreadCard
                  key={`thread-${item.data.id}`}
                  thread={item.data}
                  seenIds={seenIds}
                  onOpen={handleOpenThread}
                  onDelete={handleDeleteThread}
                  t={t}
                  language={language}
                />
              ) : (
                <PoolEntryCard
                  key={`pool-${item.data.id}`}
                  entry={item.data}
                  language={language}
                  onDelete={handleDeletePoolEntry}
                />
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}

// Kullanici istegi: yon'e gore cerceve rengi - bana gelen iletisimler
// YESIL cerceve, benim gonderdigim iletisimler GRI cerceve. Okunmamis
// (yeni) icerik iceren iletisimlerin ARKA PLANI acik yesil olur -
// cerceve rengi (yon) ile arka plan (okunma durumu) birbirinden
// bagimsiz iki sinyal.
function ThreadCard({
  thread,
  seenIds,
  onOpen,
  onDelete,
  t,
  language,
}: {
  thread: MyThread;
  seenIds: Set<string>;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  t: ReturnType<typeof useLanguage>["t"];
  language: string;
}) {
  const isNew = !seenIds.has(thread.id);
  const isReceived = thread.role === "recipient";
  const borderClass = isReceived ? "border-meadow" : "border-slate-light/50";

  return (
    <div className="relative group">
      <Link href={`/mesaj/${thread.id}`} onClick={() => onOpen(thread.id)}>
        <Card
          className={`hover:shadow-soft-lifted transition-shadow cursor-pointer pr-10 border-2 ${borderClass} ${
            isNew ? "bg-meadow-light/40" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            {thread.counterpartAvatarId && (
              <div className="shrink-0">
                <Avatar avatarId={thread.counterpartAvatarId} size={40} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3
                className={`font-display text-base text-slate ${
                  isNew ? "font-bold" : "font-normal"
                }`}
              >
                {thread.firstMessageBody
                  ? thread.firstMessageBody
                  : thread.lockType === "question" && thread.questionText
                    ? thread.questionText
                    : t("mesajlarim.passwordProtected")}
              </h3>
              <p className="mt-1 font-body text-xs text-slate-light">
                {thread.role === "initiator" && thread.recipientPhoneDisplay
                  ? `${t("mesajlarim.to")} ${thread.recipientPhoneDisplay}`
                  : thread.role === "initiator"
                    ? t("mesajlarim.youSent")
                    : t("mesajlarim.sentToYou")}
                {" · "}
                {new Date(thread.lastMessageAt).toLocaleString(
                  language === "en" ? "en-US" : "tr-TR"
                )}
              </p>
            </div>

            {/* Kullanici geri bildirimi: yeni mesaj gostergesi
                her satirin kendi ustunde, WhatsApp benzeri. */}
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span
                className={`rounded-full px-3 py-1 font-body text-xs ${
                  thread.originType === "pool"
                    ? "bg-sky-light text-sky"
                    : "bg-meadow-light text-meadow-hover"
                }`}
              >
                {thread.originType === "pool" ? t("mesajlarim.pool") : t("mesajlarim.direct")}
              </span>
              {isNew && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-meadow px-1.5 font-body text-xs font-bold text-white">
                  1
                </span>
              )}
            </div>
          </div>
        </Card>
      </Link>

      {/* Kullanici geri bildirimi: mesaj silme (kendi
          listesinden gizleme) ozelligi. Ikon kucultulup sag
          alta tasindi. */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (confirm(t("mesajlarim.deleteConfirm"))) {
            onDelete(thread.id);
          }
        }}
        className="absolute right-2 bottom-2 rounded-full p-1 text-xs text-slate-light hover:bg-coral-light hover:text-coral"
        aria-label={t("mesajlarim.delete")}
      >
        🗑️
      </button>
    </div>
  );
}

// Kullanici istegi: havuza biraktigim soru, "Havuz Sorusu" etiketiyle
// mesajlarim listesinde gorunur - ben olusturdugum icin GRI cerceve
// (gonderdigim/benim yon'um). "Tum Yanitlari Goster" modundaysa,
// bekleyen yanitlar KART ICINDE listelenir (ve varsa acik yesil arka
// plan ile vurgulanir) - her biri icin ayri Kabul Et/Reddet aksiyonu.
// Kabul etmek, o yanit veren kisiyle AYRI bir mesaj kutusu acar;
// sadece cevabi bilmek yeterli degil.
// Kullanici istegi (revize): kart artik sadece bir ozet - tiklayinca
// /havuz/[id]'deki zengin yonetim ekranina gider (soru+cevap en
// tepede, gelen her yanit ayri bir "iletisim" satiri, kabul/reddet/
// mesaja git aksiyonlariyla). Silme ikonu da burada, dogrudan
// kaldirilabilsin diye.
function PoolEntryCard({
  entry,
  language,
  onDelete,
}: {
  entry: MyPoolEntry;
  language: string;
  onDelete: (entryId: string) => void;
}) {
  const hasPending = entry.pendingAttempts.length > 0;

  return (
    <div className="relative group">
      <Link href={`/havuz/${entry.id}`}>
        <Card
          className={`hover:shadow-soft-lifted transition-shadow cursor-pointer pr-10 border-2 border-slate-light/50 ${
            hasPending ? "bg-meadow-light/40" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3
                className={`font-display text-base text-slate ${
                  hasPending ? "font-bold" : "font-normal"
                }`}
              >
                {entry.title}
              </h3>
              <p className="mt-0.5 font-body text-xs text-slate-light">{entry.questionText}</p>
              <p className="mt-1 font-body text-xs text-slate-light">
                {new Date(entry.createdAt).toLocaleString(language === "en" ? "en-US" : "tr-TR")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="rounded-full bg-sun/30 px-3 py-1 font-body text-xs text-slate">
                Havuz Sorusu
              </span>
              {hasPending && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-meadow px-1.5 font-body text-xs font-bold text-white">
                  {entry.pendingAttempts.length}
                </span>
              )}
            </div>
          </div>
        </Card>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (confirm("Bu soruyu kaldırmak istediğine emin misin? Bir daha görünmeyecek.")) {
            onDelete(entry.id);
          }
        }}
        className="absolute right-2 bottom-2 rounded-full p-1 text-xs text-slate-light hover:bg-coral-light hover:text-coral"
        aria-label="Sil"
      >
        🗑️
      </button>
    </div>
  );
}
