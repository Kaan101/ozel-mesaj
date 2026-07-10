"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { ConnectionIllustration } from "@/components/ui/ConnectionIllustration";

// Gorev 9.3 + 9.6 proof sayfasi: tum temel komponentlerin sorunsuz
// render edildigini VE mobil-oncelikli responsive stratejinin
// calistigini gosterir. Mobilde (< md) tek sutun, tablet/masaustunde
// (>= md) iki sutunlu grid'e geciyor. Gercek landing page Gorev 14'te.
export default function DesignSystemPreviewPage() {
  const [isAnonymous, setIsAnonymous] = useState(true);

  return (
    <main className="min-h-screen bg-mint px-4 py-8 xs:px-6 sm:py-12 lg:px-12">
      <div className="mx-auto max-w-xl space-y-6 lg:max-w-4xl lg:space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate xs:text-3xl">
            Tasarım Sistemi Önizlemesi
          </h1>
          <p className="mt-1 font-body text-sm text-slate-light xs:text-base">
            Görev 9.3 + 9.6 — komponentler ve responsive breakpoint stratejisi
          </p>
        </div>

        <Card lifted>
          <ConnectionIllustration className="w-full h-auto" />
        </Card>

        {/* Gorev 9.6: mobilde alt alta (1 sutun), lg (>=1024px) ve
            uzerinde yan yana (2 sutun) - grid-cols-1 lg:grid-cols-2 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="font-display text-lg font-bold text-slate mb-4">Butonlar</h2>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Ona Mesaj Gönder</Button>
              <Button variant="secondary">Havuza Göz At</Button>
              <Button variant="ghost">Vazgeç</Button>
              <Button variant="primary" disabled>
                Devre Dışı
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-bold text-slate mb-4">Girdi Alanları</h2>
            <div className="space-y-4">
              <Input label="Telefon Numarası" placeholder="+90 5xx xxx xx xx" />
              <Input
                label="Mesajın"
                placeholder="Seninle tanışmak isterim, bir kahve içelim mi?"
              />
              <Input label="Doğrulama Kodu" placeholder="1234" className="font-mono tracking-widest" />
              <Input label="Hatalı Alan" error="Kod hatalı veya süresi dolmuş." defaultValue="0000" />
            </div>
          </Card>
        </div>

        <Card lifted>
          <h2 className="font-display text-lg font-bold text-slate mb-4">Anahtar (Toggle)</h2>
          <Toggle
            id="anon-toggle"
            checked={isAnonymous}
            onChange={setIsAnonymous}
            label={isAnonymous ? "Anonim kalacaksın" : "Kimliğin görünecek"}
          />
        </Card>

        <p className="font-body text-xs text-slate-light">
          Ekran genişliğini değiştirip dene: 1024px altında butonlar/girdiler alt alta,
          üstünde yan yana görünür.
        </p>
      </div>
    </main>
  );
}
