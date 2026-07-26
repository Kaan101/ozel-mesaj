"use client";

import { useState } from "react";
import { getContextualReplies } from "@/lib/contextual-replies";

// Kullanici istegi: karsi taraftan gelen bir mesajin yaninda
// "Yanıtla" butonu - tiklaninca mesaj ICERIGINE gore pratik yanit
// onerileri iceren bir popup acilir. Bir oneriye tiklamak, yanit
// alanini o metinle doldurur.
export function ReplySuggestionsPopup({
  incomingText,
  onSelect,
}: {
  incomingText: string;
  onSelect: (text: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const suggestions = getContextualReplies(incomingText);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="font-body text-xs font-semibold text-sky hover:text-sky/80"
      >
        Yanıtla
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Yanıt önerileri"
          className="absolute left-0 top-full z-10 mt-1 w-64 overflow-hidden rounded-2xl border-2 border-sky-light bg-white py-1.5 shadow-soft-lifted"
        >
          {suggestions.map((suggestion) => (
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
