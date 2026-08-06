"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
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
  showAvatar: boolean;
  blockAllMessages: boolean;
  alwaysAddWeather: boolean;
  avatarConfig: AvatarConfig | null;
}

// Kullanici istegi: bir kisi mesaj alip gonderen kisiyi bloklamis
// olsa bile, o mesajlara buradan erisebilsin.
interface BlockedThread {
  threadId: string;
  createdAt: string;
  firstMessageBody: string | null;
  wasNeverRevealed: boolean;
}

// Gorev 13.4 + 13.5: Ayarlar sayfasi (profil duzenleme) + KVKK
// kapsaminda hesap/veri silme talebi (onay adimi ile - Bolum 10).
export default function AyarlarPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { t, language, setLanguage, multiLanguageEnabled } = useLanguage();
  const dateLocale = language === "en" ? "en-US" : "tr-TR";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  // Kullanici istegi: profil ismini her zaman goster secenegi -
  // acikken, mesaj formlarindaki "anonim kal" secenegi gizlenir.
  const [showAvatar, setShowAvatar] = useState(false);
  // Kullanici istegi: genel blok - acikken hic kimse mesaj gonderemez.
  const [blockAllMessages, setBlockAllMessages] = useState(false);
  const [isDeletingMessages, setIsDeletingMessages] = useState(false);
  const [deleteMessagesResult, setDeleteMessagesResult] = useState<string | null>(null);
  // Kullanici istegi: acikken, her mesaj/yanit gonderiminde hava
  // durumu otomatik eklenir.
  const [alwaysAddWeather, setAlwaysAddWeather] = useState(false);
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
  // Kullanici istegi: /ayarlar > Bloklanmis Mesajlar'dan dogrudan
  // blogu kaldirma islemi surerken buton devre disi kalsin.
  const [removingBlockId, setRemovingBlockId] = useState<string | null>(null);
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
      setShowAvatar(data.showAvatar);
      setBlockAllMessages(data.blockAllMessages);
      setAlwaysAddWeather(data.alwaysAddWeather);
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

  // Kullanici istegi: konusmaya girmeden, dogrudan blogu kaldirabilme.
  async function handleRemoveBlock(threadId: string) {
    if (!confirm(t("settings.confirmRemoveBlock"))) return;
    setRemovingBlockId(threadId);
    try {
      await apiFetch(`/safety/threads/${threadId}/block`, { method: "DELETE" });
      setBlockedThreads((prev) => prev.filter((t) => t.threadId !== threadId));
    } catch {
      alert(t("settings.blockRemoveFailed"));
    } finally {
      setRemovingBlockId(null);
    }
  }

  async function handleSaveProfile() {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await apiFetch("/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName, showAvatar, blockAllMessages, alwaysAddWeather }),
      });
      setSaveMessage(t("common.saved"));
    } catch {
      setSaveMessage(t("common.saveFailed"));
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
      setAvatarSaveMessage(t("settings.avatarSaved"));
    } catch {
      setAvatarSaveMessage(t("common.saveFailed"));
    } finally {
      setIsSavingAvatar(false);
    }
  }

  // Kullanici istegi: /ayarlar'dan tek tikla, kendi gonderdigi tum
  // mesajlari silebilme.
  async function handleDeleteAllMessages() {
    if (!confirm(t("settings.confirmDeleteAllMessages"))) {
      return;
    }
    setIsDeletingMessages(true);
    setDeleteMessagesResult(null);
    try {
      const result = await apiFetch<{ count: number }>("/me/messages", { method: "DELETE" });
      setDeleteMessagesResult(`${result.count} ${t("settings.messagesDeletedSuffix")}`);
    } catch {
      setDeleteMessagesResult(t("common.deleteFailed"));
    } finally {
      setIsDeletingMessages(false);
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
        <h1 className="font-display text-2xl font-bold text-slate">{t("settings.title")}</h1>

        {/* Kullanici istegi: TR/EN dil secenegi ust menuden buraya
            (Ayarlar) tasindi - coklu dil kapaliysa hic gosterilmez. */}
        {multiLanguageEnabled && (
          <Card lifted className="space-y-2">
            <h2 className="font-display text-lg font-bold text-slate">
              {language === "tr" ? "Dil" : "Language"}
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLanguage("tr")}
                className={`flex-1 rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors ${
                  language === "tr"
                    ? "bg-sky text-white"
                    : "border-2 border-sky-light text-slate hover:bg-mint"
                }`}
              >
                Türkçe
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`flex-1 rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors ${
                  language === "en"
                    ? "bg-sky text-white"
                    : "border-2 border-sky-light text-slate hover:bg-mint"
                }`}
              >
                English
              </button>
            </div>
          </Card>
        )}

        {/* Kullanici istegi: zengin ozellestirilebilir avatar
            duzenleme ekrani (DiceBear tabanli) - acilir-kapanir. */}
        <Card lifted className="space-y-4">
          <button
            type="button"
            onClick={() => setIsAvatarExpanded((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="font-display text-lg font-bold text-slate">
              {t("settings.avatarTitle")}
            </h2>
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
                {isSavingAvatar ? t("common.saving") : t("settings.saveAvatar")}
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
            <h2 className="font-display text-lg font-bold text-slate">
              {t("settings.blockedMessagesTitle")}
            </h2>
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
                  {t("settings.noBlockedMessages")}
                </p>
              ) : (
                <>
                  <p className="font-body text-xs text-slate-light">
                    {t("settings.blockAutoLift")}
                  </p>
                  {blockedThreads.map((thread) => (
                    <div key={thread.threadId} className="relative">
                      <Link
                        href={`/mesaj/${thread.threadId}`}
                        className="block rounded-2xl border-2 border-slate-light/30 bg-white px-4 py-3 pr-28 hover:bg-mint"
                      >
                        <p className="font-body text-sm text-slate line-clamp-1">
                          {thread.wasNeverRevealed
                            ? t("settings.blockedWithoutSeeing")
                            : (thread.firstMessageBody ?? t("settings.passwordProtectedMessage"))}
                        </p>
                        <p className="mt-1 font-body text-xs text-slate-light">
                          {new Date(thread.createdAt).toLocaleDateString(dateLocale)}
                        </p>
                      </Link>
                      {/* Kullanici istegi: konusmaya girmeden, dogrudan
                          blogu kaldirabilme. */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveBlock(thread.threadId);
                        }}
                        disabled={removingBlockId === thread.threadId}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border-2 border-meadow px-3 py-1.5 font-body text-xs font-semibold text-meadow-hover hover:bg-meadow-light disabled:opacity-50"
                      >
                        {t("common.remove")}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </Card>

        <Card lifted className="space-y-4">
          <h2 className="font-display text-lg font-bold text-slate">
            {t("settings.profileTitle")}
          </h2>
          <Input
            label={t("settings.displayNameLabel")}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("settings.displayNamePlaceholder")}
          />
          {/* Kullanici istegi: avatar ve nickname gorunurlugu AYRI AYRI
              kontrol edilir - mesaj bazinda secim yok, sadece bu ayar
              gecerli. Nickname icin ayri parametre yok - avatar
              acikken "Görünen İsim" alaninda yazi varsa otomatik
              gorunur, avatar kapaliyken ikisi de gizlenir. */}
          <Toggle
            id="show-avatar-toggle"
            checked={showAvatar}
            onChange={setShowAvatar}
            label={t("settings.showAvatarLabel")}
          />
          {/* Kullanici istegi: acikken, her mesaj/yanit gonderiminde
              (izin verirse) hava durumu otomatik eklenir. */}
          <Toggle
            id="always-add-weather-toggle"
            checked={alwaysAddWeather}
            onChange={setAlwaysAddWeather}
            label={alwaysAddWeather ? t("settings.weatherAuto") : t("settings.weatherManual")}
          />
          {/* Kullanici istegi: genel blok - acikken hic kimse (yeni
              ya da mevcut konusma fark etmeksizin) mesaj gonderemez. */}
          <Toggle
            id="block-all-messages-toggle"
            checked={blockAllMessages}
            onChange={setBlockAllMessages}
            label={blockAllMessages ? t("settings.blockAllOn") : t("settings.blockAllOff")}
          />
          {saveMessage && (
            <p className="font-body text-sm text-meadow-hover">{saveMessage}</p>
          )}
          {/* Kullanici istegi: kaydet butonu ustteki secenekle
              cakismasin diye belirgin bir bosluk birakildi. */}
          <div className="pt-2">
            <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full">
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-bold text-slate">
            {t("settings.accountInfoTitle")}
          </h2>
          <p className="font-body text-sm text-slate-light mt-2">
            {t("settings.accountStatus")}: <span className="font-semibold">{profile.status}</span>
          </p>
          <p className="font-body text-sm text-slate-light">
            {t("settings.joinDate")}: {new Date(profile.createdAt).toLocaleDateString(dateLocale)}
          </p>
        </Card>

        {/* Gorev 13.5: KVKK - veri silme talebi (onay adimli) */}
        <Card className="border-2 border-coral-light">
          <h2 className="font-display text-lg font-bold text-coral">
            {t("settings.dangerZoneTitle")}
          </h2>

          {/* Kullanici istegi: hesabi silmeden, sadece gonderdigi tum
              mesajlari silebilme secenegi. */}
          <p className="font-body text-sm text-slate-light mt-2">
            {t("settings.deleteMessagesDesc")}
          </p>
          <Button
            variant="ghost"
            className="mt-2 text-coral"
            onClick={handleDeleteAllMessages}
            disabled={isDeletingMessages}
          >
            {isDeletingMessages ? t("common.deleting") : t("settings.deleteAllMessages")}
          </Button>
          {deleteMessagesResult && (
            <p className="font-body text-xs text-slate-light mt-1">{deleteMessagesResult}</p>
          )}

          <hr className="my-4 border-coral-light" />

          <p className="font-body text-sm text-slate-light mt-2">
            {t("settings.deleteAccountDesc")}
          </p>

          {deleteStep === "idle" && (
            <Button
              variant="ghost"
              className="mt-3 text-coral"
              onClick={() => setDeleteStep("confirm")}
            >
              {t("settings.deleteAccount")}
            </Button>
          )}

          {deleteStep === "confirm" && (
            <div className="mt-3 space-y-3">
              <p className="font-body text-sm font-semibold text-coral">
                {t("settings.deleteAccountConfirm")}
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-coral hover:bg-coral"
                  onClick={handleDeleteAccount}
                >
                  {t("settings.confirmDelete")}
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setDeleteStep("idle")}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          )}

          {deleteStep === "deleting" && (
            <p className="font-body text-sm text-slate-light mt-3">{t("common.deleting")}</p>
          )}
        </Card>
      </div>
    </main>
  );
}
