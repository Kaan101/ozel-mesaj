"use client";

import { useEffect } from "react";

// Gorev 9.2: Service worker'i tarayicida kaydeder. RootLayout icinde
// (server component) kullanilamayacagi icin ayri bir client component
// olarak yazildi.
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker kaydi basarisiz:", error);
      });
    }
  }, []);

  return null;
}
