"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface Profile {
  id: string;
  displayName: string | null;
  status: string;
  createdAt: string;
}

// Gorev 13.4 + 13.5: Ayarlar sayfasi (profil duzenleme) + KVKK
// kapsaminda hesap/veri silme talebi (onay adimi ile - Bolum 10).
export default function AyarlarPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
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
    });
  }, [isAuthenticated]);

  async function handleSaveProfile() {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await apiFetch("/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName }),
      });
      setSaveMessage("Kaydedildi.");
    } catch {
      setSaveMessage("Kaydedilemedi. Lütfen tekrar dene.");
    } finally {
      setIsSaving(false);
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
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-slate">Ayarlar</h1>
          <Button
            variant="ghost"
            onClick={() => {
              logout();
              router.push("/");
            }}
          >
            Çıkış Yap
          </Button>
        </div>

        <Card lifted className="space-y-4">
          <h2 className="font-display text-lg font-bold text-slate">Profil</h2>
          <Input
            label="Görünen İsim (opsiyonel)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Boş bırakırsan anonim kalabilirsin"
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
