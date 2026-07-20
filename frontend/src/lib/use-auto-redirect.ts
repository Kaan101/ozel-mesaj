"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Kullanici istegi: "gonderildi" ekranlarinda kullanici dugmeye
// basmazsa, sistem belirli bir sure sonra otomatik olarak ilgili
// sayfaya yonlensin. Geri sayimi (saniye) da geri dondurur, boylece
// arayuzde "5 saniye icinde yonlendirileceksin" gibi bir metin
// gosterilebilir. Kullanici manuel olarak bir yere tiklarsa
// (navigateAway cagrilirsa) sayac zaten anlamsizlasir - ayrica
// durdurmaya gerek yok, sayfa zaten degisir.
export function useAutoRedirect(
  targetUrl: string,
  delaySeconds: number = 6,
  enabled: boolean = true
) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(delaySeconds);

  useEffect(() => {
    if (!enabled) return;
    if (secondsLeft <= 0) {
      router.push(targetUrl);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, enabled]);

  return secondsLeft;
}
