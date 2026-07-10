"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { ConnectionIllustration } from "@/components/ui/ConnectionIllustration";

// Gorev 9.3 proof sayfasi: tum temel komponentlerin sorunsuz render
// edildigini gostermek icin. Gercek landing page Gorev 14'te gelecek.
export default function DesignSystemPreviewPage() {
  const [isAnonymous, setIsAnonymous] = useState(true);

  return (
    <main className="min-h-screen bg-mint px-6 py-12">
      <div className="mx-auto max-w-xl space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate">
            Tasarım Sistemi Önizlemesi
          </h1>
          <p className="mt-1 font-body text-slate-light">Görev 9.3 — temel komponentler</p>
        </div>

        <Card lifted>
          <ConnectionIllustration className="w-full h-auto" />
        </Card>

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

        <Card lifted>
          <h2 className="font-display text-lg font-bold text-slate mb-4">Anahtar (Toggle)</h2>
          <Toggle
            id="anon-toggle"
            checked={isAnonymous}
            onChange={setIsAnonymous}
            label={isAnonymous ? "Anonim kalacaksın" : "Kimliğin görünecek"}
          />
        </Card>
      </div>
    </main>
  );
}
