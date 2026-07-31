"use client";

import { useState } from "react";
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
// rehberden bir kisi secilebilsin.
export function ContactPicker({ onSelect }: { onSelect: (phoneNumber: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
        <div className="absolute left-0 top-full z-10 mt-1 w-72 overflow-hidden rounded-2xl border-2 border-sky-light bg-white shadow-soft-lifted">
          {isLoading ? (
            <p className="px-4 py-3 font-body text-sm text-slate-light">Yükleniyor...</p>
          ) : contacts.length === 0 ? (
            <p className="px-4 py-3 font-body text-sm text-slate-light">
              Rehberin boş. Mesaj gönderdiğin numaralar otomatik eklenir.
            </p>
          ) : (
            <ul role="listbox" aria-label="Rehber" className="max-h-56 overflow-y-auto py-1.5">
              {contacts.map((c) => (
                <li key={c.id} role="option" aria-selected="false">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(c.phoneNumber);
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-mint"
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
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm text-slate">
                        {c.contactDisplayName || c.phoneNumber}
                      </p>
                      {c.contactDisplayName && (
                        <p className="truncate font-body text-xs text-slate-light">
                          {c.phoneNumber}
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
