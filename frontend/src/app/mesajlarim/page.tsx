"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
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
// Kullanici geri bildirimi: gonderilen ve alinan mesajlar birbirinden
// ayri iki bolumde gosteriliyor. Ayrica, henuz TIKLANMAMIS (goruntu-
// lenmemis) mesajlar "Yeni" rozetiyle vurgulanir. Bug duzeltmesi:
// liste artik EN SON mesaja gore guncelleniyor (onceden hep ILK
// mesaj gosteriliyordu, yeni yanitlar yansimiyordu). Ayrica her
// konusma kendi listesinden silinebilir (karsi tarafi etkilemez).
export default function MesajlarimPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [threads, setThreads] = useState<MyThread[]>([]);
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

  function fetchThreads() {
    apiFetch<MyThread[]>("/threads/mine")
      .then((data) => {
        setThreads(data);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchThreads();
  }, [isAuthenticated]);

  // Liste asenkron olarak (5sn'de bir) guncellensin - yeni gelen bir
  // mesaj/iletisim talebi elle yenilemeden gorunsun.
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(fetchThreads, 5000);
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
      fetchThreads();
    }
  }

  if (authLoading || !isAuthenticated) {
    return <main className="min-h-screen bg-mint" />;
  }

  const sentThreads = threads.filter((t) => t.role === "initiator");
  const receivedThreads = threads.filter((t) => t.role === "recipient");

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="font-display text-2xl font-bold text-slate">Mesajlarım</h1>

        {isLoading ? (
          <p className="font-body text-slate-light">Yükleniyor...</p>
        ) : threads.length === 0 ? (
          <Card>
            <p className="font-body text-slate-light text-center py-6">
              Henüz bir mesajın yok.
            </p>
          </Card>
        ) : (
          <>
            <ThreadSection
              title="📥 Bana Gelenler"
              threads={receivedThreads}
              seenIds={seenIds}
              onOpen={handleOpenThread}
              onDelete={handleDeleteThread}
            />
            <ThreadSection
              title="📤 Gönderdiklerim"
              threads={sentThreads}
              seenIds={seenIds}
              onOpen={handleOpenThread}
              onDelete={handleDeleteThread}
            />
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
}: {
  title: string;
  threads: MyThread[];
  seenIds: Set<string>;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (threads.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-sm font-bold text-slate-light uppercase tracking-wide">
        {title}
      </h2>
      <div className="space-y-3">
        {threads.map((thread) => {
          const isNew = !seenIds.has(thread.id);
          return (
            <div key={thread.id} className="relative group">
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
                            : "Parola korumalı mesaj"}
                      </h3>
                      <p className="mt-1 font-body text-xs text-slate-light">
                        {thread.role === "initiator" && thread.recipientPhoneDisplay
                          ? `Kime: ${thread.recipientPhoneDisplay}`
                          : thread.role === "initiator"
                            ? "Sen gönderdin"
                            : "Sana gönderildi"}
                        {" · "}
                        {new Date(thread.lastMessageAt).toLocaleString("tr-TR")}
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
                        {thread.originType === "pool" ? "Havuz" : "Doğrudan"}
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
                  listesinden gizleme) ozelligi. */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirm("Bu konuşmayı listenden kaldırmak istiyor musun?")) {
                    onDelete(thread.id);
                  }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-light hover:bg-coral-light hover:text-coral"
                aria-label="Sil"
              >
                🗑️
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
