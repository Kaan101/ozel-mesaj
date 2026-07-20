"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { apiFetch } from "@/lib/api-client";
import { Avatar, AvatarId } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

// Kullanici istegi: ana menude, temsili bir resimle (kendi avatarim)
// acilan bir hesap menusu - altinda "Ayarlar" (kisisel duzenlemeler/
// profil icin) ve "Cikis Yap" (giris yapmamissa "Giris Yap") secenekleri.
export function AccountMenu() {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [avatarId, setAvatarId] = useState<AvatarId | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiFetch<{ avatarId: AvatarId | null }>("/me")
      .then((data) => setAvatarId(data.avatarId))
      .catch(() => {});
  }, [isAuthenticated]);

  // Menu disina tiklaninca kapansin.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    setIsOpen(false);
    logout();
    router.push("/");
  }

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <Link href="/giris">
        <Button variant="ghost">{t("nav.login")}</Button>
      </Link>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-center rounded-full ring-2 ring-transparent hover:ring-sky-light transition-shadow"
        aria-label="Hesap Menüsü"
      >
        {avatarId ? (
          <Avatar avatarId={avatarId} size={36} />
        ) : (
          <div className="h-9 w-9 rounded-full bg-sky-light" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl border-2 border-sky-light bg-white py-2 shadow-soft-lifted z-50">
          <Link
            href="/ayarlar"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 font-body text-sm text-slate hover:bg-mint"
          >
            Ayarlar
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 font-body text-sm text-coral hover:bg-coral-light"
          >
            {t("nav.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
