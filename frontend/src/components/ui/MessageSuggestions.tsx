"use client";

import { useMemo, useState } from "react";

// Kullanici istegi: mesaj yazarken hazir oneriler sunan bir liste
// kutusu - tiklaninca yazi alanina otomatik doldurulur. 50 maddelik
// genisletilmis liste + filtreleme kutusu (kullanici istegi: liste
// buyudukce aranabilir olsun).
const SUGGESTIONS = [
  "Merhaba, nasılsın?",
  "Selam, müsaitsen biraz konuşabilir miyiz?",
  "Merhaba, tanışmak ister misin?",
  "Selam, günün nasıl geçiyor?",
  "Merhaba, sana bir şey sormak istiyorum.",
  "Selam, biraz sohbet edelim mi?",
  "Merhaba, umarım rahatsız etmiyorumdur.",
  "Selam, bugün keyfin nasıl?",
  "Merhaba, uzun zamandır seninle konuşmak istiyordum.",
  "Selam, seni tanıyan biri olarak merhaba demek istedim.",
  "Merhaba, belki güzel bir sohbetimiz olur diye düşündüm.",
  "Selam, seni biraz daha yakından tanımak isterim.",
  "Merhaba, şu an yabancı gibi görünsem de aslında seni tanıyorum.",
  "Selam, anonim olmam seni rahatsız etmezse biraz konuşabilir miyiz?",
  "Merhaba, kim olduğumu hemen söylemeden önce biraz sohbet etmek istedim.",
  "Merhaba, beni tanıyor olabilirsin ama kim olduğumu henüz bilmiyorsun.",
  "Selam, sana tanıdık gelen anonim birinden mesaj var.",
  "Merhaba, kim olduğumu tahmin etmek ister misin?",
  "Selam, küçük bir ipucuyla başlayalım mı?",
  "Merhaba, geçmişte bir yerde karşılaşmış olabiliriz.",
  "Selam, beni tanıyorsun ama muhtemelen şu an tahmin edemeyeceksin.",
  "Merhaba, sence sana kim mesaj atıyor olabilir?",
  "Merhaba, anonimlik perdesinin arkasından selamlar.",
  "Selam, kim olduğumu tahmin etme oyunu oynamaya hazır mısın?",
  "Merhaba, korkma; gizli hayran değilim. Şimdilik sadece anonimim.",
  "Selam, bu mesajın sahibi sandığından daha tanıdık olabilir.",
  "Merhaba, ilk ipucu: Daha önce beni gördün.",
  "Selam, anonim başladık ama umarım yabancı kalmayız.",
  "Merhaba, seni tanıyorum fakat anonim olarak yazmam seni rahatsız etmezse biraz sohbet etmek isterim.",
  "Selam, bir süredir sana yazıp yazmamak konusunda kararsızdım.",
  "Merhaba, belki beklemediğin birinden gelen küçük bir selamdır bu.",
  "Selam, sana söylemek istediğim birkaç şey var ama önce tanışalım istedim.",
  "Merhaba, beni tanımadan önce mesajımı tanımak ister misin?",
  "Selam, kim olduğumu bilmeden benimle sohbet eder misin?",
  "Merhaba, sohbet etmek için doğru kişiye yazdığımı düşünüyorum.",
  "Selam, bugün sana anonim bir merhaba bırakmak istedim.",
  "Merhaba, biraz gizemli başladım ama niyetim sadece sohbet etmek.",
  "Selam, belki sesimi duysan hemen tanırdın.",
  "Merhaba, kimliğimi söylemeden önce seni biraz dinlemek istiyorum.",
  "Selam, sana yabancı değilim ama şimdilik ismim gizli.",
  "Merhaba, daha önce konuşmuş olabiliriz. Hatırlayabilecek misin bakalım?",
  "Selam, anonim birinden gelen sıradan olmayan bir merhaba.",
  "Merhaba, güzel bir sohbetin nasıl başlayacağını merak ettim ve sana yazdım.",
  "Selam, sana yazmam biraz cesaret istedi ama sonunda yazdım.",
  "Merhaba, beni tahmin etmeye çalışmadan önce biraz konuşalım mı?",
  "Selam, bugün birine içten bir merhaba demek istedim. O kişi sen oldun.",
  "Merhaba, kim olduğumu bilmeden bana bir soru sormak ister misin?",
  "Selam, anonim olmam dışında aslında oldukça normal biriyim.",
  "Merhaba, belki bu mesaj seni şaşırtır ama kötü bir niyetim yok.",
  "Selam, şimdilik adımı söylemeyeyim ama tanışmak istediğimi söyleyebilirim.",
];

export function MessageSuggestions({ onSelect }: { onSelect: (text: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return SUGGESTIONS;
    const lower = query.toLocaleLowerCase("tr-TR");
    return SUGGESTIONS.filter((s) => s.toLocaleLowerCase("tr-TR").includes(lower));
  }, [query]);

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
        <div className="absolute left-0 top-full z-10 mt-1 w-80 overflow-hidden rounded-2xl border-2 border-sky-light bg-white shadow-soft-lifted">
          {/* Kullanici istegi: liste 50 maddeye cikinca aranabilir
              olsun diye bir filtreleme kutusu. */}
          <div className="border-b border-sky-light/50 p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ara..."
              autoFocus
              className="w-full rounded-full border border-sky-light bg-mint/40 px-3 py-1.5 font-body text-sm text-slate placeholder:text-slate-light/70 focus:outline-none focus:ring-2 focus:ring-sky/30"
            />
          </div>
          <ul role="listbox" aria-label="Mesaj önerileri" className="max-h-56 overflow-y-auto py-1.5">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 font-body text-sm text-slate-light">Sonuç bulunamadı.</li>
            ) : (
              filtered.map((suggestion) => (
                <li key={suggestion} role="option" aria-selected="false">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(suggestion);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="w-full px-4 py-2 text-left font-body text-sm text-slate hover:bg-mint"
                  >
                    {suggestion}
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
