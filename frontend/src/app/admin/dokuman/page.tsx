"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

// Kullanici istegi: sistemle ilgili bilgileri iceren bir dokumantasyon
// sayfasi, admin paneline baglanmis. Ayni ADMIN_SECRET korumasini kullanir.
export default function AdminDokumanPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_secret");
    if (stored) {
      setAdminKey(stored);
      setIsUnlocked(true);
    }
  }, []);

  function handleUnlock() {
    sessionStorage.setItem("admin_secret", adminKey);
    setIsUnlocked(true);
  }

  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-mint flex items-center justify-center px-4">
        <Card lifted className="max-w-sm w-full space-y-4">
          <h1 className="font-display text-xl font-bold text-slate">Yönetim Girişi</h1>
          <Input
            label="Yönetim Anahtarı"
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
          />
          <Button className="w-full" onClick={handleUnlock} disabled={!adminKey}>
            Giriş Yap
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/admin" className="font-body text-sm text-sky underline underline-offset-2">
          ← Yönetim Paneli
        </Link>
        <h1 className="font-display text-2xl font-bold text-slate">Dokümantasyon</h1>

        <Card className="prose-sm space-y-6">
          <Section title="Genel Bakış">
            <p>
              <strong>YouHaveMi</strong>, iki insan arasında iletişimin ilk adımını
              kolaylaştıran bir başlatma (ice-breaker) aracı. İki ana senaryo var:
            </p>
            <ul>
              <li>
                <strong>Senaryo A (Doğrudan Mesaj):</strong> Bir kişi, başka birinin telefon
                numarasına parola veya soru-cevap ile kilitlenmiş bir mesaj bırakır. Alıcı,
                doğru bilgiyi girerek mesajı açar.
              </li>
              <li>
                <strong>Senaryo B (Havuz):</strong> Bir kişi ortak bir anıya dair bir soru
                bırakır, herkese açık havuzda listelenir. Doğru cevabı bilen biri
                cevaplayınca anlık olarak eşleşip mesajlaşmaya başlarlar.
              </li>
            </ul>
          </Section>

          <Section title="Teknik Mimari">
            <ul>
              <li>
                <strong>Backend:</strong> NestJS (TypeScript), PostgreSQL (Prisma ORM), Redis
                (OTP/rate-limit/cache)
              </li>
              <li>
                <strong>Frontend:</strong> Next.js 14 (App Router), Tailwind CSS, PWA destekli
              </li>
              <li>
                <strong>Kimlik doğrulama:</strong> SMS OTP tabanlı (Katman 1) + parola/cevap
                bilgisine dayalı thread erişimi (Katman 2)
              </li>
              <li>
                <strong>Barındırma:</strong> Backend Railway&apos;de, frontend Vercel&apos;de,
                domain youhavemi.com (Kriweb üzerinden yönetiliyor)
              </li>
              <li>
                <strong>Hata izleme:</strong> Sentry (backend)
              </li>
            </ul>
          </Section>

          <Section title="Tamamlanan Özellikler">
            <ul>
              <li>Telefon + SMS OTP ile giriş (mock ve gerçek SMS modları)</li>
              <li>Senaryo A: mesaj oluşturma, parola/soru kilidi, anonim/açık kimlik seçimi</li>
              <li>Senaryo B: havuzda soru bırakma, kategori filtresi, cevap deneme</li>
              <li>Karşılıklı mesajlaşma, 5sn otomatik yenileme, kimlik gösterme anahtarı</li>
              <li>
                Kalıcı erişim: bir kez doğru parolayı/cevabı giren kullanıcı bir daha
                sorulmuyor (ThreadUnlock kaydı)
              </li>
              <li>Mesajı oluşturan kişi (initiator) parola sormadan kendi mesajına erişir</li>
              <li>Engelleme, şikayet etme, otomatik hesap askıya alma (şikayet eşiği)</li>
              <li>Rate limiting: OTP, thread-unlock, pool-attempt, genel IP bazlı</li>
              <li>KVKK: hesap/veri silme talebi (hard-delete)</li>
              <li>Yönetim paneli: sistem parametreleri (deploy&apos;suz), proje/görev takibi</li>
            </ul>
          </Section>

          <Section title="Güvenlik Notları">
            <ul>
              <li>Telefon numaraları asla düz metin saklanmaz (HMAC-SHA256 hash)</li>
              <li>Parola/cevap bcrypt ile hash&apos;lenir, büyük/küçük harfe duyarsızdır</li>
              <li>Anonim mesajlarda sender bilgisi backend seviyesinde filtrelenir</li>
              <li>Global + endpoint bazlı rate limiting (yönetim panelinden ayarlanabilir)</li>
            </ul>
          </Section>

          <Section title="Deploy Sürecinde Öğrenilen Dersler">
            <p>Railway deploy&apos;u sırasında sırayla şu sorunlar yaşandı ve çözüldü:</p>
            <ul>
              <li>
                <code>prisma generate</code> build komutuna eklenip sonra{" "}
                <code>postinstall</code> script&apos;ine taşındı
              </li>
              <li>
                <code>NODE_ENV=production</code> olduğunda Railway devDependencies&apos;i hiç
                kurmuyor — bu yüzden <code>prisma</code>, <code>@nestjs/cli</code>,{" "}
                <code>typescript</code>, <code>@types/express</code>,{" "}
                <code>@types/node</code>, <code>@types/bcryptjs</code> gibi build-time&apos;da
                gerekli paketler <code>dependencies</code>&apos;e taşındı
              </li>
              <li>
                <code>tsconfig.build.json</code> eksikti — test dosyaları (*.spec.ts) production
                build&apos;e dahil oluyordu, bu dosya eklenerek çözüldü
              </li>
              <li>
                Vercel/Railway&apos;in otomatik deploy webhook&apos;u bazen gecikebiliyor —
                elle &quot;Redeploy&quot; gerekebilir
              </li>
              <li>
                Her yeni Prisma modelinden sonra <code>npx prisma migrate dev --name ...</code>{" "}
                lokalde çalıştırılıp migration dosyası commit&apos;lenmeli (unutulursa canlı
                veritabanı senkron olmuyor)
              </li>
            </ul>
          </Section>

          <Section title="Önemli Yönetim Bilgileri">
            <ul>
              <li>
                Yönetim paneli anahtarı (<code>ADMIN_SECRET</code>) Railway&apos;in backend
                servisi &quot;Variables&quot; kısmında tanımlı
              </li>
              <li>
                Yönetim paneli sayfaları (<code>/admin/*</code>) genel navigasyonda
                linklenmez, bilerek gizli tutulur
              </li>
              <li>SMS şu an mock modda (gerçek SMS gönderilmiyor, backend loglarına yazılıyor)</li>
            </ul>
          </Section>

          <Section title="Versiyon Notu">
            <p>
              Bu doküman <strong>v1.0</strong> (ilk stable versiyon) itibarıyla güncel tutulmaya
              çalışılmaktadır. Yeni önemli özellik/karar eklendikçe burası da güncellenmelidir.
            </p>
          </Section>
        </Card>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg font-bold text-slate mb-2">{title}</h2>
      <div className="font-body text-sm text-slate-light space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1 [&_strong]:text-slate [&_strong]:font-semibold [&_code]:bg-mint [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-slate [&_code]:font-mono [&_code]:text-xs">
        {children}
      </div>
    </div>
  );
}
