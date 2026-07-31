"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { AvatarDisplay } from "./AvatarDisplay";

interface Contact {
  id: string;
  phoneNumber: string;
  note: string | null;
  contactAvatarId: string | null;
  contactAvatarConfig: Record<string, unknown> | null;
  contactDisplayName: string | null;
}

// Kullanici istegi: mesaj gonderirken numarayi elle yazmak yerine
// rehberden bir kisi secilebilsin - not gorunur, filtrelenebilir.
export function ContactPicker({ onSelect }: { onSelect: (phoneNumber: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");

  async function handleOpen() {
    setIsOpen((v) => !v);
    if (!isOpen && contacts.length === 0) {
      setIsLoading(true);
      try {
        const data = await apiFetch<Contact[]>("/contacts");
        setContacts(data);
      } catch {
        // Sessizce gec - kullanici numarayi elle yazmaya devam edebilir.
      } finally {
        setIsLoading(false);
      }
    }
  }

  // Kullanici istegi: isim, numara ya da not icinde arama yapabilme.
  const filtered = useMemo(() => {
    if (!query.trim()) return contacts;
    const lower = query.toLocaleLowerCase("tr-TR");
    return contacts.filter(
      (c) =>
        c.phoneNumber.toLocaleLowerCase("tr-TR").includes(lower) ||
        (c.contactDisplayName ?? "").toLocaleLowerCase("tr-TR").includes(lower) ||
        (c.note ?? "").toLocaleLowerCase("tr-TR").includes(lower)
    );
  }, [contacts, query]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="font-body text-xs text-sky hover:text-sky/80"
      >
        📇 Rehberden Seç
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 w-80 overflow-hidden rounded-2xl border-2 border-sky-light bg-white shadow-soft-lifted">
          {/* Kullanici istegi: liste buyudukce aranabilir olsun. */}
          <div className="border-b border-sky-light/50 p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="İsim, numara veya nota göre ara..."
              autoFocus
              className="w-full rounded-full border border-sky-light bg-mint/40 px-3 py-1.5 font-body text-sm text-slate placeholder:text-slate-light/70 focus:outline-none focus:ring-2 focus:ring-sky/30"
            />
          </div>
          {isLoading ? (
            <p className="px-4 py-3 font-body text-sm text-slate-light">Yükleniyor...</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-3 font-body text-sm text-slate-light">
              {contacts.length === 0
                ? "Rehberin boş. Mesaj gönderdiğin numaralar otomatik eklenir."
                : "Sonuç bulunamadı."}
            </p>
          ) : (
            <ul role="listbox" aria-label="Rehber" className="max-h-64 overflow-y-auto py-1.5">
              {filtered.map((c) => (
                <li key={c.id} role="option" aria-selected="false">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(c.phoneNumber);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-start gap-2 px-4 py-2 text-left hover:bg-mint"
                  >
                    {c.contactAvatarId || c.contactAvatarConfig ? (
                      <AvatarDisplay
                        avatarId={c.contactAvatarId}
                        avatarConfig={c.contactAvatarConfig}
                        size={28}
                      />
                    ) : (
                      <div className="h-7 w-7 shrink-0 rounded-full bg-sky-light" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm text-slate">
                        {c.contactDisplayName || c.phoneNumber}
                      </p>
                      {c.contactDisplayName && (
                        <p className="truncate font-body text-xs text-slate-light">
                          {c.phoneNumber}
                        </p>
                      )}
                      {/* Kullanici istegi: popup listesinde not da gorunsun. */}
                      {c.note && (
                        <p className="truncate font-body text-xs italic text-slate-light">
                          {c.note}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
