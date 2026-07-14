"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, CountryOption, detectCountryFromLocale, flagEmoji } from "@/lib/countries";

const STORAGE_KEY = "preferred_country_iso2";

interface PhoneInputProps {
  label?: string;
  value: string; // tam numara, orn. "+905321234567"
  onChange: (fullPhone: string) => void;
}

// Kullanici istegi: ulke kodu ayri, bayrakli/kodlu bir dropdown'dan
// secilebilsin. Mumkunse (navigator.language uzerinden) otomatik
// algilansin; algilanamazsa kullanicinin ONCEKI secimi (localStorage)
// varsayilan olarak gelsin, o da yoksa Turkiye varsayilan kalsin.
// Telefon numarasi kismi da yazarken gruplar halinde formatlanir.
export function PhoneInput({ label, value, onChange }: PhoneInputProps) {
  const [country, setCountry] = useState<CountryOption>(COUNTRIES[0]);
  const [nationalDigits, setNationalDigits] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  // Ilk yuklemede: onceki tercih -> otomatik algilama -> varsayilan (TR).
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const storedIso2 = localStorage.getItem(STORAGE_KEY);
    const stored = storedIso2 ? COUNTRIES.find((c) => c.iso2 === storedIso2) : null;
    const detected = detectCountryFromLocale();
    setCountry(stored ?? detected ?? COUNTRIES[0]);
  }, []);

  // Disariya her degisiklikte tam numarayi bildir.
  useEffect(() => {
    if (nationalDigits) {
      onChange(`+${country.dialCode}${nationalDigits}`);
    } else {
      onChange("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, nationalDigits]);

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

  function handleSelectCountry(c: CountryOption) {
    setCountry(c);
    localStorage.setItem(STORAGE_KEY, c.iso2);
    setIsDropdownOpen(false);
  }

  function handleNationalInput(raw: string) {
    const digitsOnly = raw.replace(/\D/g, "").slice(0, 12);
    setNationalDigits(digitsOnly);
  }

  // Yazarken 3'lu gruplar halinde bicimlendirme (genel amacli, tum
  // ulkeler icin tam dogru olmasa da okunabilirligi artirir).
  // Kullanici istegi: "xxx xxx xxxx" (3-3-4) formatinda goster.
  const formattedNational = formatAs3_3_4(nationalDigits);

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

        {/* Numara girisi */}
        <input
          value={formattedNational}
          onChange={(e) => handleNationalInput(e.target.value)}
          placeholder="xxx xxx xxxx"
          inputMode="tel"
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

// "xxx xxx xxxx" (3-3-4) formatinda gruplar - ilk 10 hane bu sekilde
// gruplanir, varsa fazlasi son gruba eklenir.
function formatAs3_3_4(digits: string): string {
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6);
  return [part1, part2, part3].filter(Boolean).join(" ");
}
