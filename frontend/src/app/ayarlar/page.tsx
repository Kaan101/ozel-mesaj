"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { AvatarEditor } from "@/components/ui/AvatarEditor";
import { AvatarConfig, DEFAULT_AVATAR_CONFIG, randomAvatarConfig } from "@/lib/dicebear-avatar";

interface Profile {
  id: string;
  displayName: string | null;
  status: string;
  createdAt: string;
  alwaysShowName: boolean;
  avatarConfig: AvatarConfig | null;
}

// Kullanici istegi: bir kisi mesaj alip gonderen kisiyi bloklamis
// olsa bile, o mesajlara buradan erisebilsin.
interface BlockedThread {
  threadId: string;
  createdAt: string;
  firstMessageBody: string | null;
}

// Gorev 13.4 + 13.5: Ayarlar sayfasi (profil duzenleme) + KVKK
// kapsaminda hesap/veri silme talebi (onay adimi ile - Bolum 10).
export default function AyarlarPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  // Kullanici istegi: profil ismini her zaman goster secenegi -
  // acikken, mesaj formlarindaki "anonim kal" secenegi gizlenir.
  const [alwaysShowName, setAlwaysShowName] = useState(false);
  // Kullanici istegi: zengin ozellestirilebilir avatar (DiceBear).
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => randomAvatarConfig());
  const [avatarSaveMessage, setAvatarSaveMessage] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  // Kullanici istegi: avatar duzenleme bolumu acilir-kapanir olsun -
  // varsayilan kapali, sayfa daha sade acilir.
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false);
  // Kullanici istegi: bloklanmis mesajlara erisip isterse yanit
  // verebilecegi bir bolum - acilir-kapanir.
  const [isBlockedExpanded, setIsBlockedExpanded] = useState(false);
  const [blockedThreads, setBlockedThreads] = useState<BlockedThread[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Gorev 13.5: Silme akisi iki adimli - once "Hesabımı Sil"e tıklanır,
  // sonra acikca onay istenir. Boylece yanlislikla tetiklenemez.
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "deleting">("idle");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/giris?next=/ayarlar");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiFetch<Profile>("/me").then((data) => {
      setProfile(data);
      setDisplayName(data.displayName ?? "");
      setAlwaysShowName(data.alwaysShowName);
      if (data.avatarConfig) {
        setAvatarConfig({ ...DEFAULT_AVATAR_CONFIG, ...data.avatarConfig });
      }
    });
  }, [isAuthenticated]);

  // Kullanici istegi: bolum acildiginda bloklanmis thread'leri cek.
  useEffect(() => {
    if (!isBlockedExpanded || !isAuthenticated) return;
    apiFetch<BlockedThread[]>("/safety/blocked-threads")
      .then(setBlockedThreads)
      .catch(() => {});
  }, [isBlockedExpanded, isAuthenticated]);

  async function handleSaveProfile() {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await apiFetch("/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName, alwaysShowName }),
      });
      setSaveMessage("Kaydedildi.");
    } catch {
      setSaveMessage("Kaydedilemedi. Lütfen tekrar dene.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveAvatar() {
    setIsSavingAvatar(true);
    setAvatarSaveMessage(null);
    try {
      await apiFetch("/me", {
        method: "PATCH",
        body: JSON.stringify({ avatarConfig }),
      });
      setAvatarSaveMessage("Avatar kaydedildi.");
    } catch {
      setAvatarSaveMessage("Kaydedilemedi. Lütfen tekrar dene.");
    } finally {
      setIsSavingAvatar(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteStep("deleting");
    try {
      await apiFetch("/me", { method: "DELETE" });
      logout();
      router.push("/");
    } catch {
      setDeleteStep("confirm");
    }
  }

  if (authLoading || !isAuthenticated || !profile) {
    return <main className="min-h-screen bg-mint" />;
  }

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="font-display text-2xl font-bold text-slate">Ayarlar</h1>

        {/* Kullanici istegi: zengin ozellestirilebilir avatar
            duzenleme ekrani (DiceBear tabanli) - acilir-kapanir. */}
        <Card lifted className="space-y-4">
          <button
            type="button"
            onClick={() => setIsAvatarExpanded((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="font-display text-lg font-bold text-slate">Avatarım</h2>
            <span
              className={`font-body text-slate-light transition-transform ${
                isAvatarExpanded ? "rotate-180" : ""
              }`}
            >
              ▾
            </span>
          </button>
          {isAvatarExpanded && (
            <>
              <AvatarEditor config={avatarConfig} onChange={setAvatarConfig} />
              {avatarSaveMessage && (
                <p className="font-body text-sm text-meadow-hover">{avatarSaveMessage}</p>
              )}
              <Button onClick={handleSaveAvatar} disabled={isSavingAvatar} className="w-full">
                {isSavingAvatar ? "Kaydediliyor..." : "Avatarı Kaydet"}
              </Button>
            </>
          )}
        </Card>

        {/* Kullanici istegi: bir kisi mesaj alip gonderen kisiyi
            bloklamis olsa bile, o mesajlara buradan erisebilsin -
            isterse sonradan yanit verebilsin. Yanit verince blok
            OTOMATIK kalkar (bkz. ThreadService.sendMessage). */}
        <Card lifted className="space-y-4">
          <button
            type="button"
            onClick={() => setIsBlockedExpanded((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="font-display text-lg font-bold text-slate">Bloklanmış Mesajlar</h2>
            <span
              className={`font-body text-slate-light transition-transform ${
                isBlockedExpanded ? "rotate-180" : ""
              }`}
            >
              ▾
            </span>
          </button>
          {isBlockedExpanded && (
            <div className="space-y-2">
              {blockedThreads.length === 0 ? (
                <p className="font-body text-sm text-slate-light">
                  Bloke ettiğin kimseden gelen mesaj yok.
                </p>
              ) : (
                <>
                  <p className="font-body text-xs text-slate-light">
                    Bir konuşmayı açıp yanıt verirsen, o kişiyi bloke etmiş olman otomatik
                    olarak kalkar.
                  </p>
                  {blockedThreads.map((t) => (
                    <Link
                      key={t.threadId}
                      href={`/mesaj/${t.threadId}`}
                      className="block rounded-2xl border-2 border-slate-light/30 bg-white px-4 py-3 hover:bg-mint"
                    >
                      <p className="font-body text-sm text-slate line-clamp-1">
                        {t.firstMessageBody ?? "Parola korumalı mesaj"}
                      </p>
                      <p className="mt-1 font-body text-xs text-slate-light">
                        {new Date(t.createdAt).toLocaleDateString("tr-TR")}
                      </p>
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </Card>

        <Card lifted className="space-y-4">
          <h2 className="font-display text-lg font-bold text-slate">Profil</h2>
          <Input
            label="Görünen İsim (opsiyonel)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Boş bırakırsan anonim kalabilirsin"
          />
          {/* Kullanici istegi: acikken, mesaj formlarindaki "anonim
              kal" secenegi hic gosterilmez - her zaman adinla
              gorunursun. */}
          <Toggle
            id="always-show-name-toggle"
            checked={alwaysShowName}
            onChange={setAlwaysShowName}
            label={
              alwaysShowName
                ? "Profil ismim her zaman gösterilsin"
                : "Her mesajda ayrı ayrı seçmek istiyorum"
            }
          />
          {saveMessage && (
            <p className="font-body text-sm text-meadow-hover">{saveMessage}</p>
          )}
          <Button onClick={handleSaveProfile} disabled={isSaving}>
            {isSaving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-bold text-slate">Hesap Bilgisi</h2>
          <p className="font-body text-sm text-slate-light mt-2">
            Hesap durumu: <span className="font-semibold">{profile.status}</span>
          </p>
          <p className="font-body text-sm text-slate-light">
            Katılma tarihi: {new Date(profile.createdAt).toLocaleDateString("tr-TR")}
          </p>
        </Card>

        {/* Gorev 13.5: KVKK - veri silme talebi (onay adimli) */}
        <Card className="border-2 border-coral-light">
          <h2 className="font-display text-lg font-bold text-coral">Tehlikeli Bölge</h2>
          <p className="font-body text-sm text-slate-light mt-2">
            Hesabını sildiğinde tüm mesajların, konuşmaların ve sorularının kalıcı olarak
            silinir. Bu işlem geri alınamaz.
          </p>

          {deleteStep === "idle" && (
            <Button
              variant="ghost"
              className="mt-3 text-coral"
              onClick={() => setDeleteStep("confirm")}
            >
              Hesabımı Sil
            </Button>
          )}

          {deleteStep === "confirm" && (
            <div className="mt-3 space-y-3">
              <p className="font-body text-sm font-semibold text-coral">
                Emin misin? Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-coral hover:bg-coral"
                  onClick={handleDeleteAccount}
                >
                  Evet, Kalıcı Olarak Sil
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setDeleteStep("idle")}
                >
                  Vazgeç
                </Button>
              </div>
            </div>
          )}

          {deleteStep === "deleting" && (
            <p className="font-body text-sm text-slate-light mt-3">Siliniyor...</p>
          )}
        </Card>
      </div>
    </main>
  );
}
