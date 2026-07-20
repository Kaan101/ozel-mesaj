"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { AccountMenu } from "./AccountMenu";

// Kullanici geri bildirimi: tum ekranlarda sol tarafta ana menuye
// donmeyi saglayacak bir yol olsun. Bu bileson layout.tsx uzerinden
// TUM sayfalarda otomatik gorunur - her sayfayi tek tek duzenlemeye
// gerek kalmadan.
//
// Not: "Yeni mesaj" gostergesi burada (genel menude) degil, Mesajlarim
// sayfasindaki her satirin kendi uzerinde gosteriliyor (WhatsApp
// benzeri, kullanici geri bildirimi).
//
// Kullanici istegi (revize): manuel TR/EN dil degistiricisi menuden
// tamamen kaldirildi - dil artik girişte secilen ulkeye gore otomatik
// belirleniyor (bkz. lib/language-context.tsx).
export function SiteHeader() {
  const pathname = usePathname();
  const { t } = useLanguage();

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
        <Link href="/mesajlarim" className="font-body text-sm text-slate-light hover:text-slate">
          {t("nav.myMessages")}
        </Link>
        {/* Kullanici istegi: hesap menusu - temsili avatar resmiyle
            acilir, altinda Ayarlar ve Cikis/Giris Yap secenekleri var. */}
        <AccountMenu />
      </nav>
    </header>
  );
}
