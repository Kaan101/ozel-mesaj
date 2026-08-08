"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useLanguage } from "@/lib/language-context";
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
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  // Kullanici istegi: ekranin alt kismindaysa, popup asagiya tasip
  // gorunmez olmasin diye YUKARI dogru acilsin (Resim Gonder/Mesaj
  // Onerileri popup'lariyla AYNI davranis).
  const [openUpward, setOpenUpward] = useState(false);
  // Kullanici istegi (mobil duzeltmesi): popup, ekranin SAG kenarini
  // asip sayfanin yatay genislemesine (responsive bozulmasina) neden
  // olmasin diye, gerekirse SAGA hizali (right-0) acilir.
  const [alignRight, setAlignRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Kullanici istegi: popup acikken, uygulamanin BASKA BIR YERINE
  // tiklaninca (butonun/popup'in DISINDA) otomatik kapansin.
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function handleOpen() {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const estimatedPopupHeight = 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < estimatedPopupHeight);

      const estimatedPopupWidth = 288;
      const spaceRight = window.innerWidth - rect.left;
      setAlignRight(spaceRight < estimatedPopupWidth);
    }
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
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="font-body text-xs text-sky hover:text-sky/80"
      >
        {t("contactPicker.button")}
      </button>

      {isOpen && (
        <div
          className={`absolute z-10 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border-2 border-sky-light bg-white shadow-soft-lifted ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          } ${alignRight ? "right-0" : "left-0"}`}
        >
          {/* Kullanici istegi: liste buyudukce aranabilir olsun. */}
          <div className="border-b border-sky-light/50 p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("contactPicker.searchPlaceholder")}
              autoFocus
              className="w-full rounded-full border border-sky-light bg-mint/40 px-3 py-1.5 font-body text-sm text-slate placeholder:text-slate-light/70 focus:outline-none focus:ring-2 focus:ring-sky/30"
            />
          </div>
          {isLoading ? (
            <p className="px-4 py-3 font-body text-sm text-slate-light">{t("common.loading")}</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-3 font-body text-sm text-slate-light">
              {contacts.length === 0 ? t("contactPicker.empty") : t("common.noResults")}
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
