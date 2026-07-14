"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { LanguageCode, languageForCountry, translate } from "./i18n";

const STORAGE_KEY = "app_language";
const NATIVE_STORAGE_KEY = "app_native_language";
const DEFAULT_LANGUAGE: LanguageCode = "tr";

interface LanguageContextValue {
  language: LanguageCode;
  // Kullanici geri bildirimi (bug duzeltmesi): EN secildiginde diger
  // secenek (orn. TR) kaybolmamali. "nativeLanguage", en son secilen/
  // algilanan Ingilizce-disi dili HER ZAMAN ayrica saklar - boylece
  // ust menudeki degistirici, "language" ne olursa olsun her zaman
  // hem yerel dili hem EN'i gosterebilir.
  nativeLanguage: LanguageCode;
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
  const [nativeLanguage, setNativeLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setLanguageState(stored);
    }
    const storedNative = localStorage.getItem(NATIVE_STORAGE_KEY);
    if (storedNative) {
      setNativeLanguageState(storedNative);
    }
  }, []);

  function setLanguage(lang: LanguageCode) {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    localStorage.setItem(STORAGE_KEY + "_manual", "1");

    // Ingilizce-disi bir dil secildiyse, bunu "yerel dil" olarak da
    // guncelle (EN'e gecince kaybolmamasi icin).
    if (lang !== "en") {
      setNativeLanguageState(lang);
      localStorage.setItem(NATIVE_STORAGE_KEY, lang);
    }
  }

  function setLanguageFromCountry(iso2: string) {
    const detected = languageForCountry(iso2);

    // Yerel dili her zaman guncelle (Ingilizce-disi ise) - boylece
    // degistiricide her zaman dogru secenek gorunur.
    if (detected !== "en") {
      setNativeLanguageState(detected);
      localStorage.setItem(NATIVE_STORAGE_KEY, detected);
    }

    // Kullanici zaten elle bir dil secmisse (localStorage'da varsa),
    // aktif dili otomatik ezmeyelim - sadece ilk/otomatik durumda oner.
    const alreadyManuallySet = localStorage.getItem(STORAGE_KEY + "_manual");
    if (alreadyManuallySet) return;
    setLanguageState(detected);
  }

  function t(key: Parameters<typeof translate>[1]): string {
    return translate(language, key);
  }

  return (
    <LanguageContext.Provider
      value={{ language, nativeLanguage, setLanguage, setLanguageFromCountry, t }}
    >
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
