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
// de eklenir. Elle kisi ekleme/duzenleme/silme burada yapilir. Liste
// /admin/proje'deki Gorev Takibi tablosuyla AYNI stilde (Card + table).
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

  // Kullanici istegi: not, tablo icinde DOGRUDAN duzenlenebilsin -
  // her satir icin taslak (draft) metni tutulur.
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

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
      const drafts: Record<string, string> = {};
      for (const c of data) drafts[c.id] = c.note ?? "";
      setNoteDrafts(drafts);
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

  // Kullanici istegi: notu duzenleyip kaydedebilme (tablo icinde).
  async function handleSaveNote(contactId: string) {
    setSavingId(contactId);
    try {
      await apiFetch(`/contacts/${contactId}`, {
        method: "PATCH",
        body: JSON.stringify({ note: noteDrafts[contactId] ?? "" }),
      });
      await fetchContacts();
    } catch {
      setError("Kişi güncellenemedi.");
    } finally {
      setSavingId(null);
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
      <div className="mx-auto max-w-4xl space-y-6">
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

        {/* Kullanici istegi: liste, Gorev Takibi tablosuyla AYNI
            stilde (Card + border'li table). */}
        {isLoading ? (
          <p className="font-body text-slate-light">Yükleniyor...</p>
        ) : contacts.length === 0 ? (
          <Card>
            <p className="font-body text-slate-light text-center py-6">
              Rehberin henüz boş.
            </p>
          </Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full border-collapse border border-slate-light/60 text-left">
              <thead>
                <tr className="bg-mint">
                  <th className="border border-slate-light/60 px-4 py-3 font-display text-xs font-bold text-slate">
                    Kişi
                  </th>
                  <th className="border border-slate-light/60 px-4 py-3 font-display text-xs font-bold text-slate">
                    Numara
                  </th>
                  <th className="border border-slate-light/60 px-4 py-3 font-display text-xs font-bold text-slate">
                    Not
                  </th>
                  <th className="border border-slate-light/60 px-4 py-3 font-display text-xs font-bold text-slate">
                    Eklenme
                  </th>
                  <th className="border border-slate-light/60 px-4 py-3 font-display text-xs font-bold text-slate">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td className="border border-slate-light/60 px-4 py-2">
                      <div className="flex items-center gap-2">
                        {c.contactAvatarId || c.contactAvatarConfig ? (
                          <AvatarDisplay
                            avatarId={c.contactAvatarId}
                            avatarConfig={c.contactAvatarConfig}
                            size={32}
                          />
                        ) : (
                          <div className="h-8 w-8 shrink-0 rounded-full bg-sky-light" />
                        )}
                        <span className="font-body text-sm text-slate">
                          {c.contactDisplayName || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="border border-slate-light/60 px-4 py-2 font-body text-sm text-slate whitespace-nowrap">
                      {c.phoneNumber}
                    </td>
                    {/* Kullanici istegi: not, tablo icinde dogrudan
                        duzenlenebilir. */}
                    <td className="border border-slate-light/60 px-4 py-2">
                      <input
                        value={noteDrafts[c.id] ?? ""}
                        onChange={(e) =>
                          setNoteDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                        placeholder="Not ekle..."
                        className="w-full rounded-xl border border-sky-light bg-white px-2 py-1 font-body text-sm text-slate focus:outline-none focus:ring-2 focus:ring-sky/20"
                      />
                    </td>
                    <td className="border border-slate-light/60 px-4 py-2 font-body text-xs text-slate-light whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="border border-slate-light/60 px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveNote(c.id)}
                          disabled={savingId === c.id}
                          className="rounded-full border-2 border-meadow px-3 py-1 font-body text-xs font-semibold text-meadow-hover hover:bg-meadow-light disabled:opacity-50 whitespace-nowrap"
                        >
                          {savingId === c.id ? "..." : "Kaydet"}
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="rounded-full border-2 border-coral px-3 py-1 font-body text-xs font-semibold text-coral hover:bg-coral-light whitespace-nowrap"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </main>
  );
}
