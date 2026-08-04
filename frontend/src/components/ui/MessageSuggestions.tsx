"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useLanguage } from "@/lib/language-context";

// Kullanici istegi: mesaj yazarken hazir oneriler sunan bir liste
// kutusu - tiklaninca yazi alanina otomatik doldurulur. Liste artik
// veritabaninda (admin ekleyip/guncelleyip/silebilir), burada backend'den
// cekilir.
interface Suggestion {
  id: string;
  text: string;
}

export function MessageSuggestions({ onSelect }: { onSelect: (text: string) => void }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Kullanici istegi: ekranin alt kismindaysa, popup asagiya tasip
  // gorunmez olmasin diye YUKARI dogru acilsin.
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen || suggestions.length > 0) return;
    setIsLoading(true);
    apiFetch<Suggestion[]>("/message-suggestions")
      .then(setSuggestions)
      .catch(() => {
        // Sessizce gec - kullanici elle yazmaya devam edebilir.
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, suggestions.length]);

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

  const filtered = useMemo(() => {
    if (!query.trim()) return suggestions;
    const lower = query.toLocaleLowerCase("tr-TR");
    return suggestions.filter((s) => s.text.toLocaleLowerCase("tr-TR").includes(lower));
  }, [suggestions, query]);

  // Kullanici istegi: popup, ekranin alt kismindaysa (asagida yeterli
  // yer yoksa) YUKARI dogru acilir - aktif gorunum alaninin disina
  // tasmasin diye.
  function handleToggle() {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const estimatedPopupHeight = 320; // max-h-56 (liste) + arama kutusu + kenarlıklar.
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < estimatedPopupHeight);
    }
    setIsOpen((v) => !v);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1 font-body text-xs text-sky hover:text-sky/80"
      >
        {t("messageSuggestions.button")}
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 z-10 w-80 overflow-hidden rounded-2xl border-2 border-sky-light bg-white shadow-soft-lifted ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {/* Kullanici istegi: liste buyudukce aranabilir olsun diye
              bir filtreleme kutusu. */}
          <div className="border-b border-sky-light/50 p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("common.search")}
              autoFocus
              className="w-full rounded-full border border-sky-light bg-mint/40 px-3 py-1.5 font-body text-sm text-slate placeholder:text-slate-light/70 focus:outline-none focus:ring-2 focus:ring-sky/30"
            />
          </div>
          <ul role="listbox" aria-label="Mesaj önerileri" className="max-h-56 overflow-y-auto py-1.5">
            {isLoading ? (
              <li className="px-4 py-3 font-body text-sm text-slate-light">{t("common.loading")}</li>
            ) : filtered.length === 0 ? (
              <li className="px-4 py-3 font-body text-sm text-slate-light">{t("common.noResults")}</li>
            ) : (
              filtered.map((suggestion) => (
                <li key={suggestion.id} role="option" aria-selected="false">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(suggestion.text);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="w-full px-4 py-2 text-left font-body text-sm text-slate hover:bg-mint"
                  >
                    {suggestion.text}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
