# Özel Mesaj

İki insan arasında iletişimin ilk adımını kolaylaştıran, parola/soru tabanlı kilitleme ve SMS OTP doğrulamasıyla çalışan bir "iletişim başlatma" platformu.

Detaylı ürün ve teknik spesifikasyon için: [`docs/spec.md`](./docs/spec.md)

## Proje Yapısı

```
.
├── backend/     # NestJS API (auth, thread, pool, mesajlaşma)
├── frontend/    # Next.js + Tailwind (PWA, landing page dahil)
└── docs/        # Ürün spesifikasyonu ve görev yol haritası
```

## Gereksinimler

- Node.js (sürüm `.nvmrc` dosyasında sabitlenmiştir)
- Docker & Docker Compose (lokal PostgreSQL + Redis için)
- pnpm (paket yöneticisi)

## Kurulum (Lokal Geliştirme)

```bash
# 1. Repoyu klonla
git clone <repo-url>
cd ozel-mesaj

# 2. Ortam değişkenlerini ayarla
cp .env.example .env

# 3. Veritabanı + Redis'i ayağa kaldır (Docker Compose ile)
docker compose up -d

# 4. Backend bağımlılıklarını kur ve çalıştır
cd backend && pnpm install && pnpm run dev

# 5. Frontend bağımlılıklarını kur ve çalıştır (başka bir terminalde)
cd frontend && pnpm install && pnpm run dev
```

## Dallanma Stratejisi

- `main` — production'a deploy edilen stabil kod
- `develop` — aktif geliştirme dalı, feature dalları buradan açılır
- `feature/*` — her görev için ayrı dal (örn. `feature/otp-auth`)

PR'lar `develop`'a açılır, CI (lint + test + build) geçmeden merge edilmez.

## Durum

🚧 Geliştirme aşamasında — görev takibi için `docs/gorev-yol-haritasi.xlsx`.
 
Test: branching akisi calisiyor. 
