# Güvenlik Kontrol Listesi Taraması (Görev 7.6)

Bu doküman, OWASP API Security Top 10'a dayalı bir temel kontrol listesiyle mevcut backend kodunun taranması sonucunu ve bulunan/giderilen açıkları özetler.

## Tarama Sonucu Özeti

| # | Kontrol Maddesi | Durum | Not |
|---|---|---|---|
| 1 | SQL Injection | ✅ Güvenli | Tüm veritabanı erişimi Prisma ORM üzerinden, parametreli sorgularla yapılıyor. Hiçbir raw SQL/string concatenation kullanılmıyor. |
| 2 | Kimlik doğrulama bypass'i | ✅ Güvenli | Tüm korumalı endpoint'ler `JwtAuthGuard` ve/veya `ThreadAccessGuard` ile korunuyor; guard'sız route'lar bilerek public olanlar (health, pool listeleme, kategori listesi). |
| 3 | Hassas veri sızıntısı | ✅ Güvenli | Telefon numaraları asla düz metin dönmüyor (hash'li tutuluyor), parola/cevap bcrypt ile hash'li, anonim mesajlarda `senderUserId` alan seviyesinde filtreleniyor (Görev 5.4'te doğrulandı). |
| 4 | Rate limiting / brute-force | ⚠️ Bulgu → ✅ Düzeltildi | OTP doğrulamada deneme sınırı **yoktu** (spesifikasyonun kendi gereksinimini karşılamıyorduk). 5 deneme + 15 dk kilitleme eklendi (thread-unlock ve pool-attempt'te zaten vardı). |
| 5 | CORS yapılandırması | ⚠️ Bulgu → ✅ Düzeltildi | `enableCors()` hiçbir kısıtlama olmadan (`*`) açıktı. `ALLOWED_ORIGINS` env değişkeniyle kısıtlanabilir hale getirildi (prod'da mutlaka doldurulmalı, Görev 13). |
| 6 | Güvenlik HTTP header'ları | ⚠️ Bulgu → ✅ Düzeltildi | `X-Content-Type-Options`, `X-Frame-Options` gibi standart güvenlik header'ları eksikti. `helmet` middleware'i eklendi. |
| 7 | Zayıf parola/cevap kabul edilmesi | ⚠️ Bulgu → ✅ Düzeltildi | `lockSecret` ve `answer` alanları sadece "boş olmasın" kontrolündeydi (1 karakter bile kabul ediliyordu). Minimum 4 karakter zorunluluğu eklendi. |
| 8 | Input validation / mass assignment | ✅ Güvenli | Tüm DTO'lar `class-validator` ile doğrulanıyor, global `ValidationPipe({ whitelist: true })` tanımsız alanları otomatik siliyor. |
| 9 | Hata mesajlarında bilgi sızıntısı | ✅ Güvenli | 5xx hatalarında client'a sadece "Internal server error" dönüyor, stack trace hiç sızmıyor; detaylar sadece Sentry'e gidiyor. |
| 10 | Yetkilendirme katman karışıklığı | ✅ Güvenli | Katman 1 (kimlik) ve Katman 2 (thread bilgisi) ayrı secret'lar ve ayrı guard'larla uygulanıyor, birbirinin yerine geçemiyor (Görev 5.3'te doğrulandı). |
| 11 | Şikayet/moderasyon endpoint'i yetki seviyesi | 🔶 Bilinen kısıt | `GET /safety/reports` şu an herhangi bir giriş yapmış kullanıcıya açık — ileride "admin" rolü ayrımı eklenmeli (MVP kapsamı dışı, not olarak bırakıldı). |
| 12 | HTTPS zorunluluğu | 🔶 Bilinen kısıt | Lokal geliştirmede HTTP kullanılıyor; TLS/HTTPS zorunluluğu hosting/reverse-proxy seviyesinde Görev 13'te (Yayına Alma) ele alınacak. |

## Bu Görevde Yapılan Kod Düzeltmeleri

1. **`AuthService.verifyOtp`**: Redis tabanlı deneme sayacı eklendi (max 5, 15 dk kilitleme) — `thread-unlock` ve `pool-attempt` ile tutarlı hale getirildi.
2. **`main.ts`**: `helmet()` middleware'i eklendi; `enableCors()` artık `ALLOWED_ORIGINS` env değişkenine göre kısıtlanabiliyor.
3. **`CreateThreadDto.lockSecret`** ve **`CreatePoolEntryDto.answer`**: Minimum uzunluk 1'den 4'e çıkarıldı.

## Kapsam Dışı Bırakılan / İleriye Ertelenen Maddeler

- Admin/moderatör rol ayrımı (şikayet kuyruğu erişimi) — Faz 2 kapsamına alınabilir.
- HTTPS/TLS zorunluluğu — Görev 13 (Yayına Alma) sırasında hosting seviyesinde ele alınacak.
- Otomatik bağımlılık güvenlik taraması (örn. `npm audit`, Dependabot) — CI pipeline'a ileride eklenebilir.
