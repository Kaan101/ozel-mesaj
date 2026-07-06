# Staging / Production Ortam Ayrımı Planı

Bu doküman, geliştirme sürecinde kullanılacak ortamları ve bu ortamların birbirinden nasıl izole edileceğini tanımlar. Gerçek deploy işlemleri Görev 13 (Yayına Alma) kapsamında yapılacaktır — bu doküman şimdiden netleştirilen **plandır**.

## Ortamlar

| Ortam | Amaç | Kim/Ne Kullanır |
|---|---|---|
| **local** | Geliştirici bilgisayarında geliştirme | Docker Compose (Postgres + Redis) + `pnpm run dev` |
| **staging** | Canlıya almadan önce test ortamı | Kapalı beta, iç test, QA |
| **production** | Gerçek kullanıcıların eriştiği canlı ortam | Son kullanıcılar |

## Ayrım Prensipleri

1. **Ayrı veritabanları:** Her ortamın kendi PostgreSQL ve Redis örneği olacak. Staging verisi asla production'a, production verisi asla staging'e karışmaz.
2. **Ayrı ortam değişkenleri:** Her ortamın kendi `.env` değerleri olacak (bkz. `docs/secrets-yonetimi.md`). Özellikle:
   - JWT secret'ları ortam bazında farklı
   - SMS sağlayıcı: staging'de `SMS_MOCK_MODE=true` (gerçek SMS gönderilmez), production'da `false`
3. **Ayrı domain/URL:**
   - staging → örn. `staging.ozelmesaj.com` (veya sağlayıcının verdiği geçici URL)
   - production → örn. `ozelmesaj.com`
4. **Deploy tetikleyicisi:**
   - `develop` dalına yapılan merge → otomatik **staging**'e deploy edilir
   - `main` dalına yapılan merge → otomatik **production**'a deploy edilir
   - Bu sayede "önce staging'de dene, sorun yoksa main'e al" akışı doğal olarak kurulmuş olur.
5. **Hosting hedefleri (Bölüm 6, teknik mimari kararına göre):**
   - Frontend → Vercel (staging ve production için ayrı proje/environment)
   - Backend + DB → Railway/Render/Fly.io (staging ve production için ayrı servis)

## Neden Şimdiden Planlıyoruz (Görev 13'te Değil de Görev 1'de)?

Çünkü ortam değişkenlerini (Görev 1.3), CI pipeline'ı (Görev 1.6) ve ileride yazılacak kodu (Görev 3+) bu ayrımı baştan göz önünde bulundurarak tasarlamamız gerekiyor. Örneğin CI pipeline'a ileride "develop'a merge olunca staging'e deploy et" adımını eklerken, bu planın zaten var olması işi kolaylaştırır.

## Sonraki Adım

Gerçek staging/production hesaplarının açılması ve bağlanması **Görev 13.1 ve 13.3**'te (Yayına Alma bölümü) yapılacaktır. Bu doküman o zaman referans alınacaktır.
