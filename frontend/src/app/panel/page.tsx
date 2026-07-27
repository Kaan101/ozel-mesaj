"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { AvatarConfig } from "@/lib/dicebear-avatar";

interface Profile {
  displayName: string | null;
  showAvatar: boolean;
  avatarConfig: AvatarConfig | null;
  avatarId: string | null;
}

interface MyThread {
  id: string;
  lastMessageAt: string;
}

interface MyPoolEntry {
  id: string;
}

// Kullanici istegi: daha once mesaj atmis ya da havuza soru birakmis
// (yani "aktif") kullanicilar giris yaptiginda genel landing page
// yerine bu kisisellestirilmis panel karsilar - giris akisindaki
// yonlendirme mantigi bkz. lib/post-login-redirect.ts.
export default function PanelPage() {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [threads, setThreads] = useState<MyThread[]>([]);
  const [poolEntries, setPoolEntries] = useState<MyPoolEntry[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiFetch<Profile>("/me").then(setProfile).catch(() => {});
    apiFetch<MyThread[]>("/threads/mine").then(setThreads).catch(() => {});
    apiFetch<MyPoolEntry[]>("/pool/entries/mine").then(setPoolEntries).catch(() => {});
  }, [isAuthenticated]);

  const activeThreadCount = threads.length;
  const activePoolCount = poolEntries.length;

  return (
    <main className="min-h-screen bg-mint px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Kisisel karsilama */}
        <div className="flex items-center gap-4">
          {profile?.showAvatar ? (
            <AvatarDisplay avatarId={profile.avatarId} avatarConfig={profile.avatarConfig} size={56} />
          ) : (
            <div className="h-14 w-14 rounded-full bg-sky-light" />
          )}
          <div>
            <h1 className="font-display text-2xl font-bold text-slate">
              Tekrar hoş geldin{profile?.displayName ? `, ${profile.displayName}` : ""}!
            </h1>
            <p className="font-body text-sm text-slate-light">
              İşte hesabındaki güncel durum.
            </p>
          </div>
        </div>

        {/* Hizli istatistikler */}
        <div className="grid grid-cols-2 gap-4">
          <Card lifted className="text-center">
            <p className="font-display text-3xl font-bold text-sky">{activeThreadCount}</p>
            <p className="font-body text-sm text-slate-light">Aktif Konuşma</p>
          </Card>
          <Card lifted className="text-center">
            <p className="font-display text-3xl font-bold text-meadow-hover">{activePoolCount}</p>
            <p className="font-body text-sm text-slate-light">Havuzdaki Sorun</p>
          </Card>
        </div>

        {/* Hizli eylemler */}
        <Card lifted className="space-y-3">
          <h2 className="font-display text-lg font-bold text-slate">Ne yapmak istersin?</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link href="/mesaj/olustur">
              <Button variant="primary" className="w-full">
                Yeni Mesaj Gönder
              </Button>
            </Link>
            <Link href="/havuz/olustur">
              <Button variant="secondary" className="w-full">
                Havuza Soru Bırak
              </Button>
            </Link>
            <Link href="/mesajlarim">
              <Button variant="secondary" className="w-full">
                Mesajlarım
              </Button>
            </Link>
            <Link href="/havuz">
              <Button variant="secondary" className="w-full">
                Havuzu Keşfet
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
