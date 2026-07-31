"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { PhoneInput } from "@/components/ui/PhoneInput";

interface Contact {
  id: string;
  phoneNumber: string;
  note: string | null;
  contactAvatarId: string | null;
  contactAvatarConfig: Record<string, unknown> | null;
  contactDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
}

// Kullanici istegi: Rehber ekrani - gonderdigin her numara otomatik
// kaydedilir, karsi taraf yanit verirse (biliniyorsa) avatar/nickname'i
// de eklenir. Elle kisi ekleme/duzenleme/silme burada yapilir.
export default function RehberPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Yeni kisi ekleme
  const [newPhone, setNewPhone] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Duzenleme (not) - hangi kisinin duzenlendigini tutar.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/giris?next=/rehber");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchContacts();
  }, [isAuthenticated]);

  async function fetchContacts() {
    setIsLoading(true);
    try {
      const data = await apiFetch<Contact[]>("/contacts");
      setContacts(data);
    } catch {
      setError("Rehber yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddContact() {
    if (!newPhone) return;
    setIsAdding(true);
    setError(null);
    try {
      await apiFetch("/contacts", {
        method: "POST",
        body: JSON.stringify({ phoneNumber: newPhone, note: newNote || undefined }),
      });
      setNewPhone("");
      setNewNote("");
      await fetchContacts();
    } catch {
      setError("Kişi eklenemedi.");
    } finally {
      setIsAdding(false);
    }
  }

  function startEdit(contact: Contact) {
    setEditingId(contact.id);
    setEditNote(contact.note ?? "");
  }

  async function handleSaveEdit(contactId: string) {
    try {
      await apiFetch(`/contacts/${contactId}`, {
        method: "PATCH",
        body: JSON.stringify({ note: editNote }),
      });
      setEditingId(null);
      await fetchContacts();
    } catch {
      setError("Kişi güncellenemedi.");
    }
  }

  async function handleDelete(contactId: string) {
    if (!confirm("Bu kişiyi rehberden silmek istediğine emin misin?")) return;
    try {
      await apiFetch(`/contacts/${contactId}`, { method: "DELETE" });
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch {
      setError("Kişi silinemedi.");
    }
  }

  if (authLoading || !isAuthenticated) {
    return <main className="min-h-screen bg-mint" />;
  }

  return (
    <main className="min-h-screen bg-mint px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-2xl font-bold text-slate">Rehberim</h1>
        <p className="font-body text-sm text-slate-light">
          Mesaj gönderdiğin her numara otomatik olarak buraya kaydedilir. Karşı taraf yanıt
          verirse (anonim değilse) avatarı ve ismi de eklenir.
        </p>

        {error && <p className="font-body text-sm text-coral">{error}</p>}

        {/* Yeni kisi ekleme */}
        <Card lifted className="space-y-3">
          <h2 className="font-display text-lg font-bold text-slate">Yeni Kişi Ekle</h2>
          <PhoneInput value={newPhone} onChange={setNewPhone} />
          <Input
            label="Not (opsiyonel)"
            placeholder="örn. İş arkadaşı"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <Button onClick={handleAddContact} disabled={isAdding || !newPhone} className="w-full">
            {isAdding ? "Ekleniyor..." : "Ekle"}
          </Button>
        </Card>

        {/* Kisi listesi */}
        {isLoading ? (
          <p className="font-body text-sm text-slate-light">Yükleniyor...</p>
        ) : contacts.length === 0 ? (
          <p className="font-body text-sm text-slate-light">Rehberin henüz boş.</p>
        ) : (
          <div className="space-y-3">
            {contacts.map((c) => (
              <Card key={c.id} lifted className="space-y-2">
                <div className="flex items-center gap-3">
                  {c.contactAvatarId || c.contactAvatarConfig ? (
                    <AvatarDisplay
                      avatarId={c.contactAvatarId}
                      avatarConfig={c.contactAvatarConfig}
                      size={40}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-sky-light" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-sm font-semibold text-slate">
                      {c.contactDisplayName || c.phoneNumber}
                    </p>
                    {c.contactDisplayName && (
                      <p className="font-body text-xs text-slate-light">{c.phoneNumber}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="font-body text-xs text-coral underline underline-offset-2"
                  >
                    Sil
                  </button>
                </div>

                {editingId === c.id ? (
                  <div className="flex items-end gap-2">
                    <Input
                      label="Not"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                    />
                    <Button onClick={() => handleSaveEdit(c.id)}>Kaydet</Button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(c)}
                    className="w-full rounded-2xl border-2 border-slate-light/30 bg-white px-3 py-2 text-left font-body text-sm text-slate-light hover:bg-mint"
                  >
                    {c.note || "Not eklemek için tıkla..."}
                  </button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
