"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { LanguageCode, translate } from "./i18n";

const STORAGE_KEY = "app_language";
// Kullanici istegi: sayfa ilk acildiginda (henuz ulke secilmeden/
// localStorage'da kayitli bir tercih yokken) varsayilan dil Ingilizce
// olsun - Turkce'ye sadece girişte Turkiye secilirse geciliyor.
const DEFAULT_LANGUAGE: LanguageCode = "en";

interface LanguageContextValue {
  language: LanguageCode;
  // Kullanici istegi (revize): manuel bir dil degistirici artik yok -
  // dil tamamen otomatik belirlenir. Girişte secilen telefon ulke kodu
  // "TR" ise sistem dili Turkce, digger TUM ulkeler icin Ingilizce olur.
  setLanguageFromCountry: (iso2: string) => void;
  t: (key: Parameters<typeof translate>[1]) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Kullanici istegi (revize): coklu dil destegi sadelestirildi - manuel
// TR/EN degistirici kaldirildi. Dil tamamen otomatik: girişte secilen
// telefon ulke kodu "TR" ise Turkce, HERHANGI baska bir ulke secilirse
// Ingilizce olur.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setLanguageState(stored);
    }
  }, []);

  function setLanguageFromCountry(iso2: string) {
    const detected: LanguageCode = iso2 === "TR" ? "tr" : "en";
    setLanguageState(detected);
    localStorage.setItem(STORAGE_KEY, detected);
  }

  function t(key: Parameters<typeof translate>[1]): string {
    return translate(language, key);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguageFromCountry, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage, LanguageProvider icinde kullanilmali.");
  }
  return ctx;
}
