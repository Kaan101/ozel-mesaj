"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface ProfileField {
  id: string;
  label: string;
  value: string;
  visibility: "public" | "private";
}

// Kullanici istegi: mesajlastigin kisinin avatarina tiklayinca acilan
// kisisellestirilmis profil sayfasi - burada KENDI bilgi kalemlerini
// (etiket+deger) ekler/duzenler/silersin, her birini AYRI AYRI
// herkese acik (mesajlastigin kisiler) ya da sadece sana ozel
// yapabilirsin.
export default function ProfilimPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { label: string; value: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newVisibility, setNewVisibility] = useState<"public" | "private">("private");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/giris?next=/profilim");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) fetchFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  async function fetchFields() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ProfileField[]>("/profile/me");
      setFields(data);
      const nextDrafts: Record<string, { label: string; value: string }> = {};
      for (const f of data) nextDrafts[f.id] = { label: f.label, value: f.value };
      setDrafts(nextDrafts);
    } catch {
      setError("Profil bilgileri yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdd() {
    if (!newLabel.trim() || !newValue.trim()) return;
    setIsAdding(true);
    setError(null);
    try {
      await apiFetch("/profile/me", {
        method: "POST",
        body: JSON.stringify({ label: newLabel, value: newValue, visibility: newVisibility }),
      });
      setNewLabel("");
      setNewValue("");
      setNewVisibility("private");
      await fetchFields();
    } catch {
      setError("Eklenemedi. Lütfen tekrar dene.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleSave(id: string) {
    setSavingId(id);
    setError(null);
    try {
      await apiFetch(`/profile/me/${id}`, {
        method: "PATCH",
        body: JSON.stringify(drafts[id]),
      });
      await fetchFields();
    } catch {
      setError("Güncellenemedi. Lütfen tekrar dene.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleVisibility(field: ProfileField) {
    setSavingId(field.id);
    try {
      await apiFetch(`/profile/me/${field.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          visibility: field.visibility === "public" ? "private" : "public",
        }),
      });
      await fetchFields();
    } catch {
      setError("Görünürlük değiştirilemedi.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu bilgiyi silmek istediğine emin misin?")) return;
    try {
      await apiFetch(`/profile/me/${id}`, { method: "DELETE" });
      setFields((prev) => prev.filter((f) => f.id !== id));
    } catch {
      setError("Silinemedi.");
    }
  }

  if (authLoading || !isAuthenticated) {
    return <main className="min-h-screen bg-mint" />;
  }

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="font-display text-2xl font-bold text-slate">Profilim</h1>
        <p className="font-body text-sm text-slate-light">
          Mesajlaştığın kişiler, avatarına tıklayınca burada eklediğin{" "}
          <span className="font-semibold text-meadow-hover">herkese açık</span> bilgileri
          görebilir. <span className="font-semibold text-slate">Sadece bana özel</span> olarak
          işaretlediklerin ise yalnızca sende kalır.
        </p>

        {error && <p className="font-body text-sm text-coral">{error}</p>}
        {isLoading && <p className="font-body text-sm text-slate-light">Yükleniyor...</p>}

        {/* Yeni bilgi ekleme */}
        <Card lifted className="space-y-3">
          <h2 className="font-display text-lg font-bold text-slate">Yeni Bilgi Ekle</h2>
          <Input
            label="Başlık (örn. Şehir, Hobiler, Hakkımda)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <Input
            label="İçerik"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNewVisibility("private")}
              className={`flex-1 rounded-full px-3 py-2 font-body text-xs font-semibold transition-colors ${
                newVisibility === "private"
                  ? "bg-slate text-white"
                  : "border-2 border-slate-light/40 text-slate-light"
              }`}
            >
              🔒 Sadece Bana Özel
            </button>
            <button
              type="button"
              onClick={() => setNewVisibility("public")}
              className={`flex-1 rounded-full px-3 py-2 font-body text-xs font-semibold transition-colors ${
                newVisibility === "public"
                  ? "bg-meadow text-white"
                  : "border-2 border-meadow/40 text-meadow-hover"
              }`}
            >
              🌍 Herkese Açık
            </button>
          </div>
          <Button
            onClick={handleAdd}
            disabled={isAdding || !newLabel.trim() || !newValue.trim()}
            className="w-full"
          >
            {isAdding ? "Ekleniyor..." : "Ekle"}
          </Button>
        </Card>

        {/* Mevcut bilgiler */}
        {fields.length > 0 && (
          <>
            <h2 className="font-display text-lg font-bold text-slate">
              Bilgilerim ({fields.length})
            </h2>
            <div className="space-y-3">
              {fields.map((f) => (
                <Card key={f.id} lifted className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      value={drafts[f.id]?.label ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [f.id]: { ...prev[f.id], label: e.target.value },
                        }))
                      }
                      className="flex-1 rounded-2xl border-2 border-sky-light bg-white px-3 py-1.5 font-body text-sm font-semibold text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(f)}
                      disabled={savingId === f.id}
                      className={`shrink-0 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold whitespace-nowrap disabled:opacity-50 ${
                        f.visibility === "public"
                          ? "bg-meadow-light text-meadow-hover"
                          : "bg-slate-light/20 text-slate-light"
                      }`}
                    >
                      {f.visibility === "public" ? "🌍 Herkese Açık" : "🔒 Bana Özel"}
                    </button>
                  </div>
                  <textarea
                    value={drafts[f.id]?.value ?? ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [f.id]: { ...prev[f.id], value: e.target.value },
                      }))
                    }
                    rows={2}
                    className="w-full resize-none rounded-2xl border-2 border-sky-light bg-white px-3 py-2 font-body text-sm text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(f.id)}
                      disabled={savingId === f.id}
                      className="flex-1 rounded-full border-2 border-meadow px-3 py-1.5 font-body text-xs font-semibold text-meadow-hover hover:bg-meadow-light disabled:opacity-50"
                    >
                      {savingId === f.id ? "..." : "Kaydet"}
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="rounded-full border-2 border-coral px-3 py-1.5 font-body text-xs font-semibold text-coral hover:bg-coral-light"
                    >
                      Sil
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        <Link
          href="/ayarlar"
          className="block text-center font-body text-sm text-sky underline underline-offset-2"
        >
          ← Ayarlara Dön
        </Link>
      </div>
    </main>
  );
}
