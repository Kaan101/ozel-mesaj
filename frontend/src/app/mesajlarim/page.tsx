"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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

// Kullanicinin gonderdigi/aldigi tum mesajlari (thread'leri) listeler.
// Boylece bir mesaj gonderdikten sonra linki kaybetse bile geri
// donup bulabilir (Kategori 13'u tamamlayan pratik bir eklenti).
//
// Kullanici istegi (revize): havuza biraktigim sorular ARTIK ayri bir
// menude degil, dogrudan burada ("Gonderdiklerim" altinda) "Havuz
// Sorusu" etiketiyle gorunur. "Tum Yanitlari Goster" modundaki
// sorularima gelen bekleyen yanitlar da AYNI kartin icinde,
// kabul/reddet aksiyonuyla birlikte gosterilir - ayri bir sayfaya
// gitmeye gerek yok.
export default function MesajlarimPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [threads, setThreads] = useState<MyThread[]>([]);
  const [poolEntries, setPoolEntries] = useState<MyPoolEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [processingAttemptId, setProcessingAttemptId] = useState<string | null>(null);

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

  // Kullanici istegi: havuz sorusuna gelen bir yaniti sadece bilmek
  // yeterli degil - soru sahibinin (ben) bilerek kabul etmesi gerekiyor.
  // Kabul edilirse ayri bir mesaj kutusu (thread) acilir.
  async function handleAcceptAttempt(attemptId: string) {
    setProcessingAttemptId(attemptId);
    try {
      await apiFetch(`/pool/attempts/${attemptId}/accept`, { method: "POST" });
      fetchAll();
    } finally {
      setProcessingAttemptId(null);
    }
  }

  async function handleRejectAttempt(attemptId: string) {
    setProcessingAttemptId(attemptId);
    try {
      await apiFetch(`/pool/attempts/${attemptId}/reject`, { method: "POST" });
      fetchAll();
    } finally {
      setProcessingAttemptId(null);
    }
  }

  if (authLoading || !isAuthenticated) {
    return <main className="min-h-screen bg-mint" />;
  }

  const sentThreads = threads.filter((t) => t.role === "initiator");
  const receivedThreads = threads.filter((t) => t.role === "recipient");
  const isEmpty = threads.length === 0 && poolEntries.length === 0;

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
          <>
            <ThreadSection
              title={t("mesajlarim.received")}
              threads={receivedThreads}
              seenIds={seenIds}
              onOpen={handleOpenThread}
              onDelete={handleDeleteThread}
              t={t}
              language={language}
            />

            {/* Kullanici istegi: gonderdiklerim bolumu artik hem
                dogrudan mesajlari hem havuza biraktigim sorulari
                (Havuz Sorusu etiketiyle) birlikte gosterir. */}
            {(sentThreads.length > 0 || poolEntries.length > 0) && (
              <div className="space-y-3">
                <h2 className="font-display text-sm font-bold text-slate-light uppercase tracking-wide">
                  {t("mesajlarim.sent")}
                </h2>
                <div className="space-y-3">
                  {sentThreads.map((thread) => (
                    <ThreadCard
                      key={thread.id}
                      thread={thread}
                      seenIds={seenIds}
                      onOpen={handleOpenThread}
                      onDelete={handleDeleteThread}
                      t={t}
                      language={language}
                    />
                  ))}
                  {poolEntries.map((entry) => (
                    <PoolEntryCard
                      key={entry.id}
                      entry={entry}
                      language={language}
                      processingAttemptId={processingAttemptId}
                      onAccept={handleAcceptAttempt}
                      onReject={handleRejectAttempt}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ThreadSection({
  title,
  threads,
  seenIds,
  onOpen,
  onDelete,
  t,
  language,
}: {
  title: string;
  threads: MyThread[];
  seenIds: Set<string>;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  t: ReturnType<typeof useLanguage>["t"];
  language: string;
}) {
  if (threads.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-sm font-bold text-slate-light uppercase tracking-wide">
        {title}
      </h2>
      <div className="space-y-3">
        {threads.map((thread) => (
          <ThreadCard
            key={thread.id}
            thread={thread}
            seenIds={seenIds}
            onOpen={onOpen}
            onDelete={onDelete}
            t={t}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}

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
  return (
    <div className="relative group">
      <Link href={`/mesaj/${thread.id}`} onClick={() => onOpen(thread.id)}>
        <Card
          className={`hover:shadow-soft-lifted transition-shadow cursor-pointer pr-10 ${
            isNew ? "border-2 border-meadow" : ""
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
// mesajlarim listesinde gorunur. "Tum Yanitlari Goster" modundaysa,
// bekleyen yanitlar KART ICINDE listelenir - her biri icin ayri
// Kabul Et/Reddet aksiyonu. Kabul etmek, o yanit veren kisiyle AYRI
// bir mesaj kutusu (thread) acar; sadece cevabi bilmek yeterli degil.
function PoolEntryCard({
  entry,
  language,
  processingAttemptId,
  onAccept,
  onReject,
}: {
  entry: MyPoolEntry;
  language: string;
  processingAttemptId: string | null;
  onAccept: (attemptId: string) => void;
  onReject: (attemptId: string) => void;
}) {
  const hasPending = entry.pendingAttempts.length > 0;

  return (
    <Card className={hasPending ? "border-2 border-meadow space-y-3" : "space-y-3"}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold text-slate">{entry.title}</h3>
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

      {hasPending && (
        <div className="space-y-2">
          {entry.pendingAttempts.map((attempt) => (
            <div key={attempt.id} className="rounded-2xl bg-mint p-3 space-y-2">
              <div className="flex items-start gap-2">
                {attempt.attempterAvatarId && (
                  <Avatar avatarId={attempt.attempterAvatarId} size={32} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm text-slate">{attempt.answerText}</p>
                  <p className="mt-0.5 font-body text-xs text-slate-light">
                    {new Date(attempt.createdAt).toLocaleString(
                      language === "en" ? "en-US" : "tr-TR"
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => onAccept(attempt.id)}
                  disabled={processingAttemptId === attempt.id}
                >
                  Kabul Et
                </Button>
                <button
                  onClick={() => onReject(attempt.id)}
                  disabled={processingAttemptId === attempt.id}
                  className="flex-1 rounded-full border-2 border-slate-light/40 bg-white px-4 py-2 font-body text-sm text-slate hover:bg-mint disabled:opacity-50"
                >
                  Reddet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
