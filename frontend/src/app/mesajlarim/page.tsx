"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/Card";

interface MyThread {
  id: string;
  originType: string;
  lockType: "password" | "question" | "none";
  questionText: string | null;
  firstMessageBody: string | null;
  recipientPhoneDisplay: string | null;
  createdAt: string;
  role: "initiator" | "recipient";
}

// Kullanicinin gonderdigi/aldigi tum mesajlari (thread'leri) listeler.
// Boylece bir mesaj gonderdikten sonra linki kaybetse bile geri
// donup bulabilir (Kategori 13'u tamamlayan pratik bir eklenti).
export default function MesajlarimPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [threads, setThreads] = useState<MyThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/giris?next=/mesajlarim");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiFetch<MyThread[]>("/threads/mine")
      .then(setThreads)
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  if (authLoading || !isAuthenticated) {
    return <main className="min-h-screen bg-mint" />;
  }

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-md space-y-4">
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
          threads.map((thread) => (
            <Link key={thread.id} href={`/mesaj/${thread.id}`}>
              <Card className="hover:shadow-soft-lifted transition-shadow cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-base font-bold text-slate">
                    {thread.firstMessageBody
                      ? thread.firstMessageBody
                      : thread.lockType === "question" && thread.questionText
                        ? thread.questionText
                        : "Parola korumalı mesaj"}
                  </h2>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 font-body text-xs ${
                      thread.originType === "pool"
                        ? "bg-sky-light text-sky"
                        : "bg-meadow-light text-meadow-hover"
                    }`}
                  >
                    {thread.originType === "pool" ? "Havuz" : "Doğrudan"}
                  </span>
                </div>
                <p className="mt-1 font-body text-xs text-slate-light">
                  {thread.role === "initiator" && thread.recipientPhoneDisplay
                    ? `Kime: ${thread.recipientPhoneDisplay}`
                    : thread.role === "initiator"
                      ? "Sen gönderdin"
                      : "Sana gönderildi"}
                  {" · "}
                  {new Date(thread.createdAt).toLocaleString("tr-TR")}
                </p>
              </Card>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
