"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConnectionIllustration } from "@/components/ui/ConnectionIllustration";
import { useLanguage } from "@/lib/language-context";

// Gorev 14.1-14.4: Landing page. Hero (deger onerisi + 2 CTA), "nasil
// calisir" (gercek bir 3 adimli surec oldugu icin numaralandirildi),
// guven unsurlari (gizlilik/guvenlik one plana cikarilir - hassas bir
// urun oldugu icin bu bolum susleme degil, gercek icerik).
// Not: Ust menu (header) artik layout.tsx'te global olarak gosteriliyor
// (SiteHeader), burada tekrar tanimlanmiyor.
export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-mint">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-8 md:py-16">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="font-display text-4xl font-bold text-slate leading-tight md:text-5xl">
              {t("landing.hero.title.part1")}{" "}
              <span className="text-sky">{t("landing.hero.title.highlight")}</span>{" "}
              {t("landing.hero.title.part2")}
            </h1>
            <p className="mt-4 font-body text-lg text-slate-light">
              {t("landing.hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/mesaj/olustur">
                <Button variant="primary">{t("landing.cta.send")}</Button>
              </Link>
              <Link href="/havuz">
                <Button variant="secondary">{t("landing.cta.browsePool")}</Button>
              </Link>
            </div>
          </div>
          <ConnectionIllustration className="w-full h-auto max-w-sm mx-auto md:max-w-none" />
        </div>
      </section>

      {/* Nasil calisir - gercek bir surec oldugu icin numaralandirma anlamli */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-slate text-center mb-10">
          {t("landing.howItWorks.title")}
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky font-display font-bold text-white">
              1
            </div>
            <h3 className="font-display text-base font-bold text-slate">
              {t("landing.howItWorks.step1.title")}
            </h3>
            <p className="mt-1 font-body text-sm text-slate-light">
              {t("landing.howItWorks.step1.desc")}
            </p>
          </Card>
          <Card className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky font-display font-bold text-white">
              2
            </div>
            <h3 className="font-display text-base font-bold text-slate">
              {t("landing.howItWorks.step2.title")}
            </h3>
            <p className="mt-1 font-body text-sm text-slate-light">
              {t("landing.howItWorks.step2.desc")}
            </p>
          </Card>
          <Card className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky font-display font-bold text-white">
              3
            </div>
            <h3 className="font-display text-base font-bold text-slate">
              {t("landing.howItWorks.step3.title")}
            </h3>
            <p className="mt-1 font-body text-sm text-slate-light">
              {t("landing.howItWorks.step3.desc")}
            </p>
          </Card>
        </div>
      </section>

      {/* Guven unsurlari - susleme degil, gercek icerik (hassas bir urun) */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-slate text-center mb-10">
          {t("landing.trust.title")}
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <h3 className="font-display text-base font-bold text-slate">
              {t("landing.trust.number.title")}
            </h3>
            <p className="mt-1 font-body text-sm text-slate-light">
              {t("landing.trust.number.desc")}
            </p>
          </Card>
          <Card>
            <h3 className="font-display text-base font-bold text-slate">
              {t("landing.trust.hash.title")}
            </h3>
            <p className="mt-1 font-body text-sm text-slate-light">
              {t("landing.trust.hash.desc")}
            </p>
          </Card>
          <Card>
            <h3 className="font-display text-base font-bold text-slate">
              {t("landing.trust.block.title")}
            </h3>
            <p className="mt-1 font-body text-sm text-slate-light">
              {t("landing.trust.block.desc")}
            </p>
          </Card>
          <Card>
            <h3 className="font-display text-base font-bold text-slate">
              {t("landing.trust.delete.title")}
            </h3>
            <p className="mt-1 font-body text-sm text-slate-light">
              {t("landing.trust.delete.desc")}
            </p>
          </Card>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-4 py-10 text-center">
        <p className="font-body text-xs text-slate-light">
          © {new Date().getFullYear()} YouHaveMi. {t("landing.footer.rights")}
        </p>
      </footer>
    </main>
  );
}
