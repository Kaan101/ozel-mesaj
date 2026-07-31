"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, CountryOption, detectCountryFromLocale, flagEmoji } from "@/lib/countries";

const STORAGE_KEY = "preferred_country_iso2";

interface PhoneInputProps {
  label?: string;
  value: string; // tam numara, orn. "+905321234567"
  onChange: (fullPhone: string) => void;
  // Kullanici istegi: girisin bir parcasi olarak, secilen ulke koduna
  // gore dil otomatik onerilsin diye - sadece /giris sayfasinda
  // kullanilir, alici numarasi formlarinda gerekmez.
  onCountryChange?: (iso2: string) => void;
}

// "+90532..." gibi bir numarayi ulke+ulusal-hane olarak ayirir.
function parsePhone(value: string): { country: CountryOption; nationalDigits: string } | null {
  if (!value) return null;
  const matched = [...COUNTRIES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((c) => value.startsWith(`+${c.dialCode}`));
  if (!matched) return null;
  return {
    country: matched,
    nationalDigits: value.slice(1 + matched.dialCode.length).replace(/\D/g, ""),
  };
}

// "xxx xxx xxxx" (3-3-4) formatinda gruplar - ilk 10 hane bu sekilde
// gruplanir, varsa fazlasi son gruba eklenir.
function formatAs3_3_4(digits: string): string {
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6);
  return [part1, part2, part3].filter(Boolean).join(" ");
}

// Kullanici istegi: ulke kodu ayri, bayrakli/kodlu bir dropdown'dan
// secilebilsin. Mumkunse (navigator.language uzerinden) otomatik
// algilansin; algilanamazsa kullanicinin ONCEKI secimi (localStorage)
// varsayilan olarak gelsin, o da yoksa Turkiye varsayilan kalsin.
//
// Kullanici istegi (KOKTEN bug duzeltmesi - mobil): numara alani
// artik TAMAMEN "uncontrolled" (React'in "value" ile surekli kontrol
// ETMEDIGI, sadece "defaultValue" ile baslattigi, sonrasinda DOM'un
// kendi haline birakildigi) bir input. Onceki "controlled" (value=...)
// yaklasim, React'in HER render'da input'un gorunen degerini KENDI
// STATE'INE gore ZORLA sifirlamasina neden oluyordu - mobil
// tarayicinin "hatirlanan numarayi" otomatik doldurmasi/onerisi ile
// bu ZORLA SIFIRLAMA CATISIYOR, ekranin "sapitmasina"/titremesine yol
// aciyordu. Artik input'a HICBIR ZAMAN programatik olarak value
// YAZILMIYOR (disaridan "Rehberden Sec" gibi bir durumda parent,
// "key" prop'unu degistirerek bu componenti YENIDEN MOUNT EDER - bu,
// input'u SIFIRDAN, dogal/native sekilde yeni bir defaultValue ile
// baslatir, "canli" bir DOM manipulasyonu yapmadan).
export function PhoneInput({ label, value, onChange, onCountryChange }: PhoneInputProps) {
  const initialParsed = parsePhone(value);
  // TESHIS (gecici): ulke kodu yansimama sorununu arastirmak icin -
  // "value" prop'unun mount aninda GERCEKTE ne oldugunu ve parse
  // sonucunu goruyoruz.
  if (typeof window !== "undefined") {
    console.log("[TESHIS PhoneInput] mount value=", JSON.stringify(value), "parsed=", initialParsed);
  }
  const [country, setCountry] = useState<CountryOption>(initialParsed?.country ?? COUNTRIES[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const didInit = useRef(false);

  // Ilk yuklemede (SADECE BIR KERE, mount aninda): eger disaridan
  // gelen bir "value" yoksa, ulke tercihini onceki secim -> otomatik
  // algilama -> varsayilan (TR) sirasiyla belirle.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    if (initialParsed) {
      onCountryChange?.(initialParsed.country.iso2);
      return;
    }

    const storedIso2 = localStorage.getItem(STORAGE_KEY);
    const stored = storedIso2 ? COUNTRIES.find((c) => c.iso2 === storedIso2) : null;
    const detected = detectCountryFromLocale();
    const initial = stored ?? detected ?? COUNTRIES[0];
    setCountry(initial);
    onCountryChange?.(initial.iso2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Disariya tiklaninca dropdown'i kapat.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function notifyChange(nationalDigits: string, activeCountry: CountryOption) {
    onChange(nationalDigits ? `+${activeCountry.dialCode}${nationalDigits}` : "");
  }

  function handleSelectCountry(c: CountryOption) {
    setCountry(c);
    localStorage.setItem(STORAGE_KEY, c.iso2);
    setIsDropdownOpen(false);
    onCountryChange?.(c.iso2);
    // Ulke degisince, input'ta halihazirda yazili olan haneleri KORUYUP
    // sadece YENI ulke koduyla disariya bildiriyoruz (input'un DOM
    // degerine DOKUNMUYORUZ - sadece OKUYORUZ).
    const currentDigits = (inputRef.current?.value ?? "").replace(/\D/g, "");
    notifyChange(currentDigits, c);
  }

  // Kullanici istegi: yazarken/degisirken (autofill dahil) DOGAL DOM
  // event'i - biz sadece OKUYORUZ, input'un gosterdigi degere
  // MUDAHALE ETMIYORUZ (bu, controlled-input/autofill catismasinin
  // KOKUNU ortadan kaldirir).
  function handleInput(e: React.FormEvent<HTMLInputElement>) {
    const digitsOnly = e.currentTarget.value.replace(/\D/g, "").slice(0, 12);
    notifyChange(digitsOnly, country);
  }

  return (
    <div>
      {label && (
        <label className="font-display text-sm font-semibold text-slate">{label}</label>
      )}
      <div ref={containerRef} className="relative mt-1.5 flex gap-2">
        {/* Ulke kodu secici */}
        <button
          type="button"
          onClick={() => setIsDropdownOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-2xl border-2 border-sky-light bg-white px-3 py-3 font-body text-sm text-slate hover:border-sky"
        >
          <span className="text-lg leading-none">{flagEmoji(country.iso2)}</span>
          <span>+{country.dialCode}</span>
          <span className="text-slate-light text-xs">▾</span>
        </button>

        {/* Numara girisi - KASITLI OLARAK "value" prop'u YOK
            (uncontrolled). Sadece ilk yuklemedeki haneler
            "defaultValue" ile verilir, sonrasi DOM'a birakilir. */}
        <input
          ref={inputRef}
          defaultValue={formatAs3_3_4(initialParsed?.nationalDigits ?? "")}
          onInput={handleInput}
          placeholder="xxx xxx xxxx"
          inputMode="tel"
          autoComplete="off"
          name="national-phone-digits"
          className="flex-1 rounded-2xl border-2 border-sky-light bg-white px-4 py-3 font-body text-slate focus:outline-none focus:border-sky min-w-0"
        />

        {isDropdownOpen && (
          <div className="absolute top-full left-0 z-20 mt-1 max-h-64 w-72 overflow-y-auto rounded-2xl border-2 border-sky-light bg-white shadow-soft-lifted">
            {COUNTRIES.map((c) => (
              <button
                key={c.iso2}
                type="button"
                onClick={() => handleSelectCountry(c)}
                className="flex w-full items-center gap-2 px-4 py-2 text-left font-body text-sm text-slate hover:bg-mint"
              >
                <span className="text-lg leading-none">{flagEmoji(c.iso2)}</span>
                <span className="flex-1">{c.name}</span>
                <span className="text-slate-light">+{c.dialCode}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
