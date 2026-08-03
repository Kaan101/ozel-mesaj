"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface Profile {
  displayName: string | null;
  showAvatar: boolean;
}

// Kullanici istegi: "En cok iletisim kurdukların" - en cok mesaj
// alisverisi olan konusmalar, karsi tarafin (gizlilik kurallarina
// uygun) etiketiyle.
interface TopContact {
  threadId: string;
  displayLabel: string;
  originType: "direct" | "pool";
  messageCount: number;
  lastMessagePreview: string;
  lastMessageAt: string | null;
}

// Kullanici istegi: "İlgini çekebilecekler" - daha once yanit
// verilen kategorilere gore onerilen havuz sorulari.
interface RecommendedEntry {
  id: string;
  title: string;
  questionText: string;
  category: string | null;
  createdAt: string;
  matchNote: string;
}

// Kullanici istegi: daha once mesaj atmis ya da havuza soru birakmis
// ("aktif") kullanicilar giris yaptiginda genel landing page yerine
// bu kisisellestirilmis ana sayfa karsilar - giris akisindaki
// yonlendirme mantigi bkz. lib/post-login-redirect.ts. Tasarim,
// kullanicinin verdigi HTML mockup'a (youhavemi_homepage_v2) sadik
// kalinarak uygulandi.
export default function PanelPage() {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [topContacts, setTopContacts] = useState<TopContact[]>([]);
  const [recommended, setRecommended] = useState<RecommendedEntry[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiFetch<Profile>("/me").then(setProfile).catch(() => {});
    apiFetch<TopContact[]>("/threads/top-contacts").then(setTopContacts).catch(() => {});
    apiFetch<RecommendedEntry[]>("/pool/entries/recommended").then(setRecommended).catch(() => {});
  }, [isAuthenticated]);

  return (
    <main className="min-h-screen bg-mint px-4 pb-20">
      <div className="mx-auto max-w-5xl">
        {/* Kisisel karsilama + hizli eylemler */}
        <section className="flex flex-wrap items-end justify-between gap-4 pt-9 pb-1.5">
          <div>
            <h1 className="font-display text-[32px] font-bold text-slate leading-tight">
              Merhaba{profile?.displayName ? `, ${profile.displayName}` : ""}! 👋
            </h1>
            <p className="mt-1.5 font-body text-[15.5px] text-slate-light">
              Kaçırdığın bir şey yok — sohbetlerin ve sana özel öneriler aşağıda.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/mesaj/olustur">
              <Button variant="primary">Mesaj Gönder</Button>
            </Link>
            <Link href="/havuz">
              <Button variant="secondary">Havuza Göz At</Button>
            </Link>
          </div>
        </section>

        {/* En cok iletisim kurdukların */}
        <section className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold text-slate">
              En çok iletişim kurdukların
            </h2>
            <Link
              href="/mesajlarim"
              className="font-body text-[13.5px] font-semibold text-sky hover:text-sky-hover"
            >
              Tüm mesajlar →
            </Link>
          </div>
          {topContacts.length === 0 ? (
            <Card>
              <p className="font-body text-sm text-slate-light">
                Henüz bir konuşman yok — ilk mesajını göndererek başla!
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {topContacts.map((contact) => (
                <Link key={contact.threadId} href={`/mesaj/${contact.threadId}`}>
                  <Card className="flex h-full flex-col gap-2.5 !p-[18px] hover:shadow-soft-lifted transition-shadow cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-mint-dark text-[19px]">
                        🙂
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-body text-[14.5px] font-semibold leading-tight text-slate">
                          {contact.displayLabel}
                        </p>
                        <p className="font-body text-xs text-slate-light">
                          {contact.lastMessageAt
                            ? `Son mesaj: ${new Date(contact.lastMessageAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <p className="line-clamp-2 font-body text-[13px] leading-normal text-slate-light">
                      &quot;{contact.lastMessagePreview}&quot;
                    </p>
                    <span className="self-start rounded-full bg-sky-light px-2.5 py-1 font-body text-[11.5px] font-semibold text-sky-hover">
                      {contact.originType === "direct" ? "Direct" : "Havuz"}
                    </span>
                    <p className="mt-0.5 font-body text-[11.5px] font-semibold text-meadow-hover">
                      {contact.messageCount} mesaj alışverişi
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Ilgini cekebilecekler */}
        <section className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold text-slate">
              İlgini çekebilecekler
            </h2>
            <span className="font-body text-[13.5px] text-slate-light">
              Sık yanıtladığın kategorilere göre
            </span>
          </div>
          {recommended.length === 0 ? (
            <Card>
              <p className="font-body text-sm text-slate-light">
                Havuzda birkaç soruya yanıt verdikçe, burada sana özel öneriler belirecek.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {recommended.map((entry) => (
                <Link key={entry.id} href={`/havuz/${entry.id}`}>
                  <Card className="relative hover:shadow-soft-lifted transition-shadow cursor-pointer">
                    <span className="absolute right-[18px] top-4 rounded-full bg-meadow-light px-2.5 py-[3px] font-body text-[11px] font-semibold text-meadow-hover">
                      {entry.matchNote}
                    </span>
                    <h3 className="mb-1.5 font-display text-base font-semibold text-slate">
                      {entry.title}
                    </h3>
                    <p className="mb-3.5 font-body text-[13.5px] text-slate-light">
                      {entry.questionText}
                    </p>
                    <div className="flex items-center justify-between">
                      {entry.category && (
                        <span className="rounded-full bg-meadow-light px-3 py-[5px] font-body text-xs font-semibold text-meadow-hover">
                          {entry.category}
                        </span>
                      )}
                      <span className="font-body text-xs text-slate-light">
                        {new Date(entry.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
