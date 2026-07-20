"use client";

import { useState } from "react";

const AVAILABLE_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👎"];

export interface ReactionSummary {
  counts: Record<string, number>;
  myReaction: string | null;
}

// Kullanici istegi: gelen mesaja/soruya begen-begenme ya da emoji
// tepkisi verme ozelligi. Sabit bir emoji seti sunulur - secilen
// emoji ile ayni ise tekrar tiklamak tepkiyi kaldirir (toggle),
// farkli bir emoji secmek onceki tepkiyi degistirir (bir kullanicinin
// bir hedefe SADECE bir tepkisi olabilir).
export function ReactionBar({
  reactions,
  onReact,
}: {
  reactions: ReactionSummary;
  onReact: (emoji: string) => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const activeEmojis = Object.entries(reactions.counts).filter(([, count]) => count > 0);

  return (
    <div className="relative mt-2 flex flex-wrap items-center gap-1.5">
      {activeEmojis.map(([emoji, count]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact(emoji)}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-body text-xs transition-colors ${
            reactions.myReaction === emoji
              ? "border-sky bg-sky-light text-sky"
              : "border-slate-light/40 bg-white text-slate-light hover:bg-mint"
          }`}
        >
          <span>{emoji}</span>
          <span>{count}</span>
        </button>
      ))}

      <button
        type="button"
        onClick={() => setIsPickerOpen((v) => !v)}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-light/40 bg-white text-xs text-slate-light hover:bg-mint"
        aria-label="Tepki Ekle"
      >
        +
      </button>

      {isPickerOpen && (
        <div className="absolute bottom-full left-0 mb-1 flex gap-1 rounded-full border-2 border-sky-light bg-white px-2 py-1.5 shadow-soft-lifted z-10">
          {AVAILABLE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onReact(emoji);
                setIsPickerOpen(false);
              }}
              className="text-lg hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
