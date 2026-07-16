"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";

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
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useLanguage();

  // Admin ekraninda header gostermiyoruz (bilerek gizli/linksiz tutulan
  // bir ekran, ustune nav eklemek amacina aykiri olur).
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  function handleLogout() {
    logout();
    router.push("/");
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
        {!isLoading &&
          (isAuthenticated ? (
            <Button variant="ghost" onClick={handleLogout}>
              {t("nav.logout")}
            </Button>
          ) : (
            <Link href="/giris">
              <Button variant="ghost">{t("nav.login")}</Button>
            </Link>
          ))}
      </nav>
    </header>
  );
}
