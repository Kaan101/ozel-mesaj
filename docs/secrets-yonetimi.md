# Secrets Yönetim Planı

Bu doküman, ortam değişkenlerinin (secrets) hangi ortamda nasıl yönetileceğini tanımlar.

## Ortamlar ve Yöntem

| Ortam | Nerede Saklanır | Nasıl Eklenir |
|---|---|---|
| **Lokal geliştirme** | `.env` dosyası (git'e eklenmez) | `.env.example` kopyalanıp doldurulur |
| **Staging** | Railway/Render proje ayarları → Environment Variables | Panelden manuel girilir, kod deposunda tutulmaz |
| **Production (Backend)** | Railway/Render proje ayarları → Environment Variables | Panelden manuel girilir; erişim sadece proje sahibi/yetkili kişilerde |
| **Production (Frontend)** | Vercel proje ayarları → Environment Variables | `NEXT_PUBLIC_*` önekli olanlar client'a açık olur, diğerleri sadece build/server sırasında kullanılır |

## Temel Kurallar

1. **Hiçbir secret git'e commit edilmez.** `.env` dosyası `.gitignore`'da tanımlıdır; sadece `.env.example` (boş/placeholder değerlerle) repo'da tutulur.
2. **JWT secret'ları ortam bazında farklı olmalıdır** — staging ve production aynı secret'ı paylaşmaz.
3. **SMS API anahtarları** sadece backend ortam değişkenlerinde tutulur, frontend'e asla geçmez.
4. **Production'a geçmeden önce** tüm `change-me-*` placeholder değerlerinin gerçek, rastgele üretilmiş değerlerle değiştirildiği kontrol edilir (bkz. Görev 13.4, Yayına Alma checklist'i).
5. Secret rotasyonu gerektiğinde (ör. bir anahtar sızdıysa), önce yeni değer ortam değişkenine yazılır, servis yeniden başlatılır, sonra eski anahtar sağlayıcı panelinden iptal edilir.

## Sorumluluk

Şu an tek geliştirici/kurucu olarak tüm secret'ların yönetimi senin sorumluluğunda. İleride ekip büyürse, bu tabloya "kim erişebilir" sütunu eklenmesi önerilir.
