"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";

// Kullanici geri bildirimi: tum ekranlarda sol tarafta ana menuye
// donmeyi saglayacak bir yol olsun. Bu bileson layout.tsx uzerinden
// TUM sayfalarda otomatik gorunur - her sayfayi tek tek duzenlemeye
// gerek kalmadan.
export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, logout } = useAuth();

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
          Havuz
        </Link>
        <Link href="/mesajlarim" className="font-body text-sm text-slate-light hover:text-slate">
          Mesajlarım
        </Link>
        {!isLoading &&
          (isAuthenticated ? (
            <Button variant="ghost" onClick={handleLogout}>
              Çıkış Yap
            </Button>
          ) : (
            <Link href="/giris">
              <Button variant="ghost">Giriş Yap</Button>
            </Link>
          ))}
      </nav>
    </header>
  );
}
