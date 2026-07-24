"use client";

import { useState } from "react";

// Kullanici istegi: mesaj yazarken hazir oneriler sunan bir liste
// kutusu - tiklaninca yazi alanina otomatik doldurulur.
const SUGGESTIONS = [
  "Merhaba, nasılsın?",
  "Selam! Seni buradan görünce mesaj atmak istedim.",
  "Merhaba, tanışabilir miyiz?",
  "Selam, bugün nasıl geçiyor?",
  "Merhaba, iyi günler dilerim.",
  "Selam, uzun zamandır yazmak istiyordum.",
  "Merhaba, seninle sohbet etmek isterim.",
  "Selam, naber?",
];

export function MessageSuggestions({ onSelect }: { onSelect: (text: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1 font-body text-xs text-sky hover:text-sky/80"
      >
        💡 Mesaj Önerileri
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Mesaj önerileri"
          className="absolute left-0 top-full z-10 mt-1 max-h-56 w-72 overflow-y-auto rounded-2xl border-2 border-sky-light bg-white py-1.5 shadow-soft-lifted"
        >
          {SUGGESTIONS.map((suggestion) => (
            <li key={suggestion} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => {
                  onSelect(suggestion);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left font-body text-sm text-slate hover:bg-mint"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
