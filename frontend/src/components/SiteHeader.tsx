"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";

const SEEN_IDS_KEY = "seen_thread_ids";

function loadSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

// Kullanici geri bildirimi: tum ekranlarda sol tarafta ana menuye
// donmeyi saglayacak bir yol olsun. Bu bileson layout.tsx uzerinden
// TUM sayfalarda otomatik gorunur - her sayfayi tek tek duzenlemeye
// gerek kalmadan. Ayrica: kullanici baska bir mesajin icindeyken bile
// yeni bir iletisim talebi geldiginde "Mesajlarim" linkinde bir rozet
// gostererek haberdar eder (arka planda periyodik kontrol). "Yeni"
// tanimi, Mesajlarim sayfasindaki ile ayni (seen_thread_ids) - bir
// mesaja TIKLANMADAN "gorulmus" sayilmaz.
export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [newThreadsCount, setNewThreadsCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    function checkForNewThreads() {
      apiFetch<{ id: string }[]>("/threads/mine")
        .then((threads) => {
          const seenIds = loadSeenIds();
          const unseenCount = threads.filter((t) => !seenIds.has(t.id)).length;
          setNewThreadsCount(unseenCount);
        })
        .catch(() => {});
    }

    checkForNewThreads();
    const interval = setInterval(checkForNewThreads, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, pathname]);

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
        <Link
          href="/mesajlarim"
          className="relative font-body text-sm text-slate-light hover:text-slate"
        >
          Mesajlarım
          {newThreadsCount > 0 && (
            <span className="absolute -right-3 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-meadow px-1 font-body text-[10px] font-bold text-white">
              {newThreadsCount}
            </span>
          )}
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
