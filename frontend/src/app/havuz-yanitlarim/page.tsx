"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

interface PendingAttempt {
  id: string;
  answerText: string;
  createdAt: string;
  attempterAvatarId: string | null;
  poolEntryId: string;
  poolEntryTitle: string;
  poolEntryQuestion: string;
}

// Kullanici istegi: "Tum Yanitlari Goster" modundaki sorularima gelen,
// henuz kabul/reddedilmemis yanitlari gorup tek tek karar verebilecegim
// ekran. Her yanit veren kisi icin AYRI bir kayit - kabul edilirse her
// biriyle ayri bir mesaj kutusu acilir (birbirine karismaz).
export default function HavuzYanitlarimPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [attempts, setAttempts] = useState<PendingAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/giris?next=/havuz-yanitlarim");
    }
  }, [authLoading, isAuthenticated, router]);

  function fetchAttempts() {
    apiFetch<PendingAttempt[]>("/pool/attempts/pending")
      .then(setAttempts)
      .catch(() => setError("Yanıtlar yüklenemedi."))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (isAuthenticated) fetchAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  async function handleAccept(attemptId: string) {
    setProcessingId(attemptId);
    setError(null);
    try {
      await apiFetch(`/pool/attempts/${attemptId}/accept`, { method: "POST" });
      setAttempts((prev) => prev.filter((a) => a.id !== attemptId));
    } catch {
      setError("İşlem başarısız oldu. Lütfen tekrar dene.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(attemptId: string) {
    setProcessingId(attemptId);
    setError(null);
    try {
      await apiFetch(`/pool/attempts/${attemptId}/reject`, { method: "POST" });
      setAttempts((prev) => prev.filter((a) => a.id !== attemptId));
    } catch {
      setError("İşlem başarısız oldu. Lütfen tekrar dene.");
    } finally {
      setProcessingId(null);
    }
  }

  if (authLoading || !isAuthenticated) {
    return <main className="min-h-screen bg-mint" />;
  }

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate">Havuz Yanıtlarım</h1>
          <p className="font-body text-sm text-slate-light mt-1">
            &quot;Tüm Yanıtları Göster&quot; seçtiğin sorularına gelen yanıtlar burada.
            Kabul edersen ayrı bir mesaj kutusu açılır.
          </p>
        </div>

        {error && <p className="font-body text-sm text-coral">{error}</p>}

        {isLoading ? (
          <p className="font-body text-slate-light">Yükleniyor...</p>
        ) : attempts.length === 0 ? (
          <Card>
            <p className="font-body text-slate-light text-center py-6">
              Bekleyen bir yanıt yok.
            </p>
          </Card>
        ) : (
          attempts.map((attempt) => (
            <Card key={attempt.id} className="space-y-3">
              <div>
                <p className="font-body text-xs text-slate-light">
                  {attempt.poolEntryTitle} · {attempt.poolEntryQuestion}
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-mint p-3">
                {attempt.attempterAvatarId && (
                  <Avatar avatarId={attempt.attempterAvatarId} size={36} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-body text-slate">{attempt.answerText}</p>
                  <p className="mt-1 font-body text-xs text-slate-light">
                    {new Date(attempt.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handleAccept(attempt.id)}
                  disabled={processingId === attempt.id}
                >
                  Kabul Et
                </Button>
                <button
                  onClick={() => handleReject(attempt.id)}
                  disabled={processingId === attempt.id}
                  className="flex-1 rounded-full border-2 border-slate-light/40 bg-white px-4 py-2 font-body text-sm text-slate hover:bg-mint disabled:opacity-50"
                >
                  Reddet
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
