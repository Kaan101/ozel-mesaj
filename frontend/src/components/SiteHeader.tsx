"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { AccountMenu } from "./AccountMenu";

// Kullanici geri bildirimi: tum ekranlarda sol tarafta ana menuye
// donmeyi saglayacak bir yol olsun. Bu bileson layout.tsx uzerinden
// TUM sayfalarda otomatik gorunur - her sayfayi tek tek duzenlemeye
// gerek kalmadan.
//
// Kullanici istegi: okunmamis (yeni) mesaj varsa, menudeki "Mesajlar"
// yazisinin ustunde kucuk yesil bir nokta gorunur - Mesajlarim
// sayfasindaki AYNI seenMap (localStorage) mantigini kullanir.
//
// Kullanici istegi (revize): manuel TR/EN dil degistiricisi menuden
// tamamen kaldirildi - dil artik girişte secilen ulkeye gore otomatik
// belirleniyor (bkz. lib/language-context.tsx).
export function SiteHeader() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    function checkUnread() {
      apiFetch<{ id: string; lastMessageAt: string }[]>("/threads/mine")
        .then((threads) => {
          let seenMap: Record<string, string> = {};
          try {
            seenMap = JSON.parse(localStorage.getItem("seen_thread_last_message_at") ?? "{}");
          } catch {
            seenMap = {};
          }
          const anyUnread = threads.some((t) => {
            const lastSeenAt = seenMap[t.id];
            return !lastSeenAt || new Date(t.lastMessageAt) > new Date(lastSeenAt);
          });
          setHasUnread(anyUnread);
        })
        .catch(() => {});
    }

    checkUnread();

    // Kullanici istegi: mesaji okudugunda yesil nokta ANINDA (sayfa
    // degismeden) kaybolsun - /mesaj/[id] sayfasi bu event'i
    // mesajlar yuklenince yayinlar.
    window.addEventListener("thread-seen-updated", checkUnread);
    return () => window.removeEventListener("thread-seen-updated", checkUnread);
  }, [isAuthenticated, pathname]);

  // Admin ekraninda header gostermiyoruz (bilerek gizli/linksiz tutulan
  // bir ekran, ustune nav eklemek amacina aykiri olur).
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="mx-auto max-w-5xl px-4 py-6 flex items-center justify-between">
      <Link href="/" className="font-display text-xl font-bold text-slate hover:text-sky">
        YouHaveMi
      </Link>
      <nav className="flex items-center gap-4">
        <Link href="/havuz" className="font-body text-sm text-slate-light hover:text-slate">
          {t("nav.pool")}
        </Link>
        <Link
          href="/mesajlarim"
          className="relative font-body text-sm text-slate-light hover:text-slate"
        >
          {hasUnread && (
            <span className="absolute -top-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-meadow" />
          )}
          {t("nav.myMessages")}
        </Link>
        {/* Kullanici istegi: hesap menusu - temsili avatar resmiyle
            acilir, altinda Ayarlar ve Cikis/Giris Yap secenekleri var. */}
        <AccountMenu />
      </nav>
    </header>
  );
}
