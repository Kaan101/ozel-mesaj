"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Kullanici istegi: uygulama genelinde secilebilen, sade/modern/cool
// grafiksel arka plan secenekleri - "Ayarlar" sayfasindan secilir,
// tarayicida (localStorage) hatirlanir. "none" (Yok) varsayilandir -
// mevcut duz arka plani korur.
export const BACKGROUND_THEMES = ["none", "aurora", "dots", "mesh", "waves"] as const;
export type BackgroundTheme = (typeof BACKGROUND_THEMES)[number];

const STORAGE_KEY = "app_background_theme";
const DEFAULT_THEME: BackgroundTheme = "none";

interface BackgroundContextValue {
  backgroundTheme: BackgroundTheme;
  setBackgroundTheme: (theme: BackgroundTheme) => void;
}

const BackgroundContext = createContext<BackgroundContextValue | null>(null);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [backgroundTheme, setBackgroundThemeState] = useState<BackgroundTheme>(DEFAULT_THEME);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (BACKGROUND_THEMES as readonly string[]).includes(stored)) {
      setBackgroundThemeState(stored as BackgroundTheme);
    }
  }, []);

  function setBackgroundTheme(theme: BackgroundTheme) {
    setBackgroundThemeState(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  return (
    <BackgroundContext.Provider value={{ backgroundTheme, setBackgroundTheme }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const ctx = useContext(BackgroundContext);
  if (!ctx) {
    throw new Error("useBackground, BackgroundProvider icinde kullanilmali.");
  }
  return ctx;
}
