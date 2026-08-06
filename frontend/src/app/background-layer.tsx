"use client";

import { useBackground, BackgroundTheme } from "@/lib/background-context";

// Kullanici istegi: sade, modern ve "cool" grafiksel arka plan
// secenekleri - yeni resim dosyasi eklemeden, sadece CSS/SVG ile
// olusturulur. Sabit (fixed) bir katman olarak TUM sayfanin ARKASINA
// yerlestirilir, z-index ile icerigin gerisinde kalir.
export const THEME_STYLES: Record<BackgroundTheme, React.CSSProperties> = {
  none: {},
  aurora: {
    backgroundImage: `
      radial-gradient(circle at 15% 20%, rgba(62,142,222,0.16), transparent 45%),
      radial-gradient(circle at 85% 15%, rgba(69,183,140,0.18), transparent 45%),
      radial-gradient(circle at 50% 85%, rgba(224,185,60,0.10), transparent 50%)
    `,
  },
  dots: {
    backgroundImage: `radial-gradient(rgba(34,48,63,0.08) 1px, transparent 1px)`,
    backgroundSize: "22px 22px",
  },
  mesh: {
    backgroundImage: `
      linear-gradient(135deg, rgba(62,142,222,0.10) 0%, transparent 40%),
      linear-gradient(315deg, rgba(69,183,140,0.12) 0%, transparent 45%)
    `,
  },
  waves: {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 200' preserveAspectRatio='none'%3E%3Cpath d='M0,80 C240,140 480,20 720,80 C960,140 1200,20 1440,80 L1440,200 L0,200 Z' fill='%2345B78C' fill-opacity='0.08'/%3E%3Cpath d='M0,120 C240,60 480,180 720,120 C960,60 1200,180 1440,120 L1440,200 L0,200 Z' fill='%233E8EDE' fill-opacity='0.06'/%3E%3C/svg%3E")`,
    backgroundRepeat: "repeat-y",
    backgroundSize: "100% 200px",
  },
};

export function BackgroundLayer() {
  const { backgroundTheme } = useBackground();

  if (backgroundTheme === "none") return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={THEME_STYLES[backgroundTheme]}
    />
  );
}
