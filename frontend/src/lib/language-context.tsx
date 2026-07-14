"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { LanguageCode, languageForCountry, translate } from "./i18n";

const STORAGE_KEY = "app_language";
const DEFAULT_LANGUAGE: LanguageCode = "tr";

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  // Girişte secilen telefon ulkesine gore dili otomatik ayarlar.
  setLanguageFromCountry: (iso2: string) => void;
  t: (key: Parameters<typeof translate>[1]) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Kullanici istegi: coklu dil destegi. Su an TR/EN gercekten cevrili,
// sistem genisletilebilir sekilde kuruldu (bkz. lib/i18n.ts). Girişte
// secilen telefon ulke koduna gore dil otomatik oneriliyor, kullanici
// ustteki degistiriciden istedigi zaman EN'e (ya da geri) gecebilir.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setLanguageState(stored);
    }
  }, []);

  function setLanguage(lang: LanguageCode) {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    localStorage.setItem(STORAGE_KEY + "_manual", "1");
  }

  function setLanguageFromCountry(iso2: string) {
    // Kullanici zaten elle bir dil secmisse (localStorage'da varsa),
    // ulke secimiyle otomatik ezmeyelim - sadece ilk/otomatik durumda
    // oner.
    const alreadyManuallySet = localStorage.getItem(STORAGE_KEY + "_manual");
    if (alreadyManuallySet) return;
    setLanguageState(languageForCountry(iso2));
  }

  function t(key: Parameters<typeof translate>[1]): string {
    return translate(language, key);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, setLanguageFromCountry, t }}>
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
