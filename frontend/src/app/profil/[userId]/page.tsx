"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { Card } from "@/components/ui/Card";

interface PublicProfile {
  displayName: string | null;
  avatarId: string | null;
  avatarConfig: Record<string, unknown> | null;
  fields: { id: string; label: string; value: string }[];
}

// Kullanici istegi: mesajlastigin kisinin avatarina tiklayinca acilan
// kisisellestirilmis profil sayfasi - SADECE o kisinin "herkese acik"
// olarak isaretledigi bilgileri gorursun. Erisim, backend tarafinda
// SADECE onunla bir konusman varsa saglanir.
export default function ProfilPage() {
  const params = useParams();
  const userId = params.userId as string;
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/giris?next=/profil/${userId}`);
    }
  }, [authLoading, isAuthenticated, router, userId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    apiFetch<PublicProfile>(`/profile/${userId}`)
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setError("Bu profili görüntüleyebilmek için bu kişiyle bir konuşman olması gerekiyor.");
        } else {
          setError("Profil yüklenemedi.");
        }
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, userId]);

  if (authLoading || !isAuthenticated) {
    return <main className="min-h-screen bg-mint" />;
  }

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        {isLoading && <p className="font-body text-sm text-slate-light">Yükleniyor...</p>}
        {error && (
          <Card lifted>
            <p className="font-body text-sm text-coral">{error}</p>
          </Card>
        )}

        {profile && (
          <>
            <Card lifted className="flex flex-col items-center gap-2 text-center">
              {profile.avatarId || profile.avatarConfig ? (
                <AvatarDisplay
                  avatarId={profile.avatarId}
                  avatarConfig={profile.avatarConfig}
                  size={72}
                />
              ) : (
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-mint-dark text-3xl">
                  👤
                </div>
              )}
              <h1 className="font-display text-xl font-bold text-slate">
                {profile.displayName ?? "Anonim Kullanıcı"}
              </h1>
            </Card>

            {profile.fields.length === 0 ? (
              <p className="text-center font-body text-sm text-slate-light">
                Bu kişi henüz herkese açık bir bilgi eklememiş.
              </p>
            ) : (
              <div className="space-y-3">
                {profile.fields.map((f) => (
                  <Card key={f.id}>
                    <h2 className="font-display text-sm font-bold text-slate">{f.label}</h2>
                    <p className="mt-1 font-body text-sm text-slate-light whitespace-pre-wrap">
                      {f.value}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        <Link
          href="/mesajlarim"
          className="block text-center font-body text-sm text-sky underline underline-offset-2"
        >
          ← Mesajlarıma Dön
        </Link>
      </div>
    </main>
  );
}
