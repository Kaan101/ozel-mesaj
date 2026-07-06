# Özel Mesaj Platformu — Uçtan Uca Ürün & Teknik Spesifikasyon

## İçindekiler
1. Ürün Vizyonu ve Konumlandırma
2. Kullanıcı Personaları
3. Customer Journey — Senaryo A (Doğrudan İletişim)
4. Customer Journey — Senaryo B (Havuz / Kesişme)
5. Ekran Akışı ve Bilgi Mimarisi
6. Teknik Mimari ve Stack Seçimi
7. Veri Modeli
8. Authentication & Authorization Tasarımı
9. API Tasarımı
10. Güvenlik, Gizlilik ve Kötüye Kullanım Önleme
11. Büyüme Mekanizmaları (Viral Döngü)
12. MVP Kapsam Kararları (Faz 1 / 2 / 3)
13. Yayına Alma (Deployment) Planı
14. Riskler ve Açık Kararlar

---

## 1. Ürün Vizyonu ve Konumlandırma

**Çekirdek fikir:** Bu bir "mesajlaşma uygulaması" değil, **iki insan arasında iletişimin ilk adımını kolaylaştıran bir başlatma (ice-breaker) protokolüdür.** Entelektüel soru-cevap mekanizması bu protokolün sadece bir "kapı tipi"dir — asıl değer önerisi şudur:

> "Normal şartlarda birine mesaj atmak (özellikle tanımadığın ya da çekindiğin biri) sosyal bir risk taşır. Bu ürün, o riski azaltan; kimliği, niyeti ve reddedilme ihtimalini kontrol altında tutarak iletişimi başlatan bir araçtır."

Bunun pratik anlamı:
- **Gönderici** için risk azaltma: Anonim kalabilme, parola/soru ile "hedefli" erişim (yanlış kişiye ulaşmama garantisi), reddedilirse iz bırakmama.
- **Alıcı** için güven: Rastgele bir yabancıdan gelen spam değil, doğrulanmış bir telefon numarasından, tek kullanımlık kodla korunan, "birinin bilerek sana ulaştığı" bir mesaj.
- **Kesişme (Senaryo B)** ise bunun genişletilmiş hâli: Numarayı bile bilmeden, ortak bir merak/bilgi/ilgi üzerinden iki yabancının karşılaşması.

Konumlandırma açısından bu ürün; klasik mesajlaşma uygulamaları (WhatsApp, Telegram) ile "confession/anonim itiraf" uygulamaları (Sarahah, NGL, Yik Yak) arasında bir yerde durur — ama onlardan farklı olarak **çift taraflı doğrulama (parola/soru + SMS OTP)** ile "gürültüyü" (spam, taciz, rastgele mesaj) en aza indirmeyi hedefler. Bu, ürünün en kritik farklılaştırıcısıdır ve bu yüzden güvenlik/kötüye kullanım önleme (bkz. Bölüm 10) MVP'nin göz ardı edilemeyecek bir parçasıdır, "sonraya bırakılacak" bir özellik değildir.

**Tek cümlelik konumlandırma:** *"Söylemek istediğin ama nasıl başlayacağını bilemediğin şeyi, doğru kişiye, doğru şekilde ulaştıran araç."*

---

## 2. Kullanıcı Personaları

| Persona | Tanım | Temel Motivasyon | Temel Korku |
|---|---|---|---|
| **Başlatan (Initiator)** | Birine bir şey söylemek/sormak isteyen ama doğrudan yüzleşmek istemeyen kişi | Riski azaltarak iletişim kurmak | Reddedilme, karşı tarafın "kim bu?" diye ürkmesi |
| **Alıcı (Recipient)** | Beklenmedik bir SMS alan, çoğu zaman gönderici hakkında ipucu sahibi olan kişi | Merak, güvenlik hissi | Spam/dolandırıcılık şüphesi, taciz riski |
| **Kaşif (Explorer — Senaryo B)** | Havuzdaki soruları gezen, ortak zemin arayan kişi | Ortak ilgi/bilgi üzerinden eşleşme, oyunlaştırılmış keşif | Zaman kaybı, kalitesiz içerik |

Bu üç personanın çelişen ihtiyaçları ürün kararlarının merkezinde yer alır: Başlatan'ın "az sürtünme" isteği ile Alıcı'nın "güvenlik" isteği birbiriyle gerilim halindedir — tasarımın her adımı bu ikisini dengelemek zorundadır.

---

## 3. Customer Journey — Senaryo A (Doğrudan İletişim)

### Adım 1 — Mesaj Oluşturma (Başlatan tarafı)
1. Başlatan siteye girer (hesap zorunlu değil — telefon numarası doğrulaması yeterli, bkz. Bölüm 8).
2. Form: alıcı telefon numarası + mesaj metni + kilit tipi seçimi:
   - **Parola modu:** Başlatan bir kelime/ifade belirler (örn. "Mavi Klasör").
   - **Soru modu:** Başlatan bir soru + doğru cevap belirler (örn. "Nerede tanıştık?" → "Kütüphanede").
3. Başlatan kendi kimliğini gösterip göstermeyeceğini seçer: **Açık kimlik / Anonim**.
4. Gönder → Sistem alıcıya SMS yollar.

### Adım 2 — SMS Tetiklenmesi
- SMS içeriği örneği: *"Sana özel bir mesaj var. [link] → Doğrulama kodun: 4821. Devam etmek için göndericinin belirlediği parola/cevabı gireceksin."*
- Bu adımda **iki farklı gizli bilgi katmanı** vardır: (a) sistemin ürettiği tek kullanımlık 4 haneli kod — kişinin doğru numaraya sahip olduğunu kanıtlar; (b) göndericinin belirlediği parola/cevap — göndericinin *niyetli* olarak bu kişiyi hedeflediğini kanıtlar. Bu ayrım UX metinlerinde nettir, kullanıcı iki kodu birbirine karıştırmamalıdır.

### Adım 3 — Alıcının Mesajı Açması
1. Linke tıklar → 4 haneli SMS kodunu girer (cihaz/oturum doğrulama).
2. Parola/cevap ekranı gelir → doğru girilirse mesaj açılır.
   - Yanlış girişlerde: 5 deneme sonrası kilitleme + Başlatan'a "biri denemeye çalışıyor" bildirimi (opsiyonel, kötüye kullanım sinyali).
3. Mesaj gösterilir. Gönderici anonimse sadece mesaj + (varsa) profil ipucu gösterilir, numara asla gösterilmez.

### Adım 4 — Yanıt ve Gizlilik Kontrolü
1. Alıcı "Yanıtla" der.
2. Yanıt ekranında tek bir açık soru sorulur: **"Kimliğini göstermek ister misin?"** → Evet (telefon/isim görünür) / Hayır (anonim kalır).
3. Yanıt gönderilir → Başlatan'a SMS/bildirim gider.
4. Bu noktadan sonra iki taraf "eşleşmiş konuşma" (thread) üzerinden devam eder; her mesajda gizlilik tercihi tekilde saklanır (bir kişinin bir konuşmada anonim, başka bir konuşmada açık olması mümkündür).

**Kritik UX prensibi:** Toplam adım sayısı Alıcı için 2-3'ü geçmemelidir (kod gir → parola gir → oku). Her ekstra adım terk oranını artırır.

---

## 4. Customer Journey — Senaryo B (Havuz / Kesişme)

### Adım 1 — Soru Bırakma
1. Kullanıcı (telefon doğrulamalı, hesabı olsun ya da olmasın) bir başlık + soru + doğru cevap + (opsiyonel) kategori etiketi girer (örn. "Felsefe", "Şehir hafızası", "Ortak anı").
2. Görünürlük seçer: **Herkese açık havuzda listelensin** / **Sadece link ile paylaşılsın (gizli link)**.

### Adım 2 — Keşif / Karşılaşma
- Herkese açık soru: platformun "Havuz" sekmesinde kategoriye göre filtrelenebilir listede görünür.
- Gizli link: sadece paylaşıldığı kişi/kanal üzerinden erişilir (örn. sosyal medya bio'su, DM).

### Adım 3 — Cevaplama Denemesi
1. Herhangi bir ziyaretçi soruyu görür, cevap kutusuna yazar.
2. Doğru cevap → anlık olarak soru sahibiyle **anonim bir mesajlaşma penceresi** açılır (Senaryo A'daki gizlilik/yanıt mantığı burada da geçerlidir).
3. Yanlış cevap → nazik bir geri bildirim ("Bu sefer olmadı, tekrar dene" — deneme sayısı sınırlanır, brute-force'u önlemek için, bkz. Bölüm 10).

### Adım 4 — Eşleşme Sonrası
- Konuşma, Senaryo A'daki thread mantığına düşer: gizlilik tercihi, yanıt akışı, mesaj imha kuralları aynıdır.
- Fark: Senaryo B'de başlangıçta **telefon numarası bilgisi olmadan** eşleşme kurulmuştur — bu yüzden sistemin numarayı iki taraf da isterse açığa çıkarması, istemezse hiç çıkarmaması gerekir (bkz. Bölüm 8, "numarasız kimlik" modeli).

**Ürün notu:** Senaryo B, ürünün "keşif" (discovery) katmanıdır ve viral büyümenin asıl motorudur — bir soru paylaşıldığında yanıtlayan kişi de platforma girmiş olur (bkz. Bölüm 11).

---

## 5. Ekran Akışı ve Bilgi Mimarisi

### Sayfa/Ekran Envanteri (MVP)
1. **Landing / Giriş** — ürün değer önerisi + "Mesaj Gönder" / "Havuza Göz At" iki ana CTA.
2. **Telefon Doğrulama** — numara girişi + OTP (tüm akışlarda ortak, bkz. Bölüm 8).
3. **Mesaj Oluştur (Senaryo A)** — alıcı no, mesaj metni, kilit tipi seçimi, kimlik tercihi.
4. **Soru Oluştur (Senaryo B)** — başlık, soru, cevap, görünürlük.
5. **Havuz Listesi** — kategori filtreli soru kartları.
6. **Mesaj Açma (Alıcı tarafı)** — OTP girişi → parola/cevap girişi → mesaj gösterimi.
7. **Konuşma / Thread** — mesaj geçmişi, yanıtla butonu, kimlik gösterme anahtarı.
8. **Ayarlar** — bildirim tercihleri, hesap/numara yönetimi, veri silme talebi (KVKK).
9. **Bildirim/Onboarding e-postası veya SMS şablonları** (kullanıcı arayüzü dışı ama UX'in parçası).

### Navigasyon Prensibi
- Kimliği doğrulanmamış (anonim) kullanıcı da Senaryo B'de soru cevaplayabilir/soru bırakabilir — **hesap oluşturma zorunlu değildir**, sadece telefon doğrulama yeterlidir. Bu, sürtünmeyi en aza indiren en kritik karardır.
- "Hesap" kavramı MVP'de hafiftir: telefon numarası + (opsiyonel) görünen isim. Şifre tabanlı klasik hesap sistemi yoktur — kimlik doğrulama tamamen OTP tabanlıdır (bkz. Bölüm 8).

---

## 6. Teknik Mimari ve Stack Seçimi

### Önerilen Stack (Time-to-Market odaklı)
| Katman | Seçim | Gerekçe |
|---|---|---|
| Frontend | **Next.js (React) + Tailwind CSS**, PWA desteği | SSR ile hızlı ilk yükleme (SMS'ten gelen linke tıklayan kullanıcı için kritik), tek kod tabanıyla mobil+masaüstü |
| Backend | **Node.js (NestJS) veya Next.js API Routes** | Frontend ile aynı ekosistem, hızlı geliştirme; NestJS büyürse modüler yapı avantajı |
| Veritabanı | **PostgreSQL** (ana veri) + **Redis** (OTP, rate-limit, oturum, kısa ömürlü veri) | İlişkisel bütünlük (kullanıcı-mesaj-thread) + Redis'in TTL özelliği OTP/mesaj imhası için doğal uyum |
| SMS Sağlayıcı | **Netgsm veya İleti Merkezi** (TR odaklı, maliyet avantajlı), **Twilio** (uluslararası genişleme için opsiyon) | Türkiye pazarına öncelik + SMS başlık onayı gibi yerel gereklilikler |
| Auth altyapısı | Kendi OTP servisi + **JWT (kısa ömürlü access + refresh token)** | 3. parti bağımlılığı azaltmak, mesaj bazlı yetkilendirme esnekliği |
| Hosting | **Vercel** (frontend) + **Railway/Render/Fly.io** (backend+DB) MVP için; ölçeklenince AWS/GCP'ye geçiş | Hızlı devreye alma, DevOps yükü az |
| Dosya/asset | Gerekli değil MVP'de (metin tabanlı ürün) | Kapsam dışı bırakılarak karmaşıklık azaltılır |

### Neden bu seçimler?
- **Next.js + PWA**: Kullanıcı "uygulama indirmeden" akışı tamamlamalı (başarı kriteri #2). PWA, ana ekrana ekleme opsiyonu sunar ama zorunlu kılmaz.
- **Redis**: Hem OTP kodlarının hem de "okunduktan sonra imha edilecek mesajların" TTL (time-to-live) ile doğal olarak yönetilmesini sağlar — cron job yazmaya gerek kalmaz.
- **JWT kısa ömürlü access token + refresh token rotasyonu**: Hesap sistemi hafif olduğu için tam OAuth2 kurmak yerine, kendi basit ama güvenli token mekanizmamızı kurmak yeterli ve daha hızlıdır.

---

## 7. Veri Modeli

### Ana Tablolar (PostgreSQL)

**users**
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid (PK) | |
| phone_number_hash | text (unique, indexed) | Numara **hash'lenerek** saklanır, düz metin değil (bkz. Bölüm 10) |
| display_name | text (nullable) | Opsiyonel görünen isim |
| created_at | timestamp | |
| last_seen_at | timestamp | |
| status | enum(active, suspended, deleted) | |

**message_threads**
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid (PK) | |
| origin_type | enum(direct, pool) | Senaryo A / B ayrımı |
| initiator_user_id | uuid (FK) | |
| recipient_user_id | uuid (FK, nullable) | Pool senaryosunda eşleşme olana kadar null |
| lock_type | enum(password, question) | |
| lock_secret_hash | text | Parola/cevap **hash'lenerek** saklanır |
| question_text | text (nullable) | Sadece question modunda |
| created_at | timestamp | |
| expires_at | timestamp (nullable) | Otomatik imha için |

**messages**
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid (PK) | |
| thread_id | uuid (FK) | |
| sender_user_id | uuid (FK) | |
| body | text | |
| is_anonymous | boolean | Bu mesaj için gönderici kimliği gizli mi |
| read_at | timestamp (nullable) | |
| destroy_after_read | boolean | |
| created_at | timestamp | |

**pool_entries** (Senaryo B'ye özel)
| Alan | Tip | Açıklama |
|---|---|---|
| id | uuid (PK) | |
| owner_user_id | uuid (FK) | |
| title | text | |
| question_text | text | |
| answer_hash | text | |
| category | text (nullable) | |
| visibility | enum(public, unlisted) | |
| attempt_count | integer (default 0) | Rate-limit/brute-force takibi için |
| created_at | timestamp | |

**otp_codes** (Redis'te, kalıcı DB'de değil)
| Alan | TTL | Açıklama |
|---|---|---|
| phone_number_hash | 5 dk | 4 haneli kod + deneme sayacı |

### Tasarım Kararları
- **Telefon numaraları asla düz metin saklanmaz** — sadece hash (arama/karşılaştırma için) + gerekirse geri döndürülebilir alan tamamen ayrı, şifrelenmiş bir "vault" tabloda (SMS gönderimi anında kullanılıp servis dışına çıkmaz).
- **lock_secret_hash ve answer_hash** bcrypt/argon2 ile hash'lenir — düz metin hiçbir yerde tutulmaz, brute-force'a karşı dayanıklı hash algoritması kullanılır.
- **destroy_after_read**: true ise, `read_at` set edildikten sonra bir arka plan job (veya Redis TTL tetikleyici) `body` alanını siler/tabloyu temizler.

---

## 8. Authentication & Authorization Tasarımı

Bu üründe **iki farklı doğrulama katmanı** var ve bunları karıştırmamak mimarinin en kritik noktası:

### Katman 1 — Kimlik Doğrulama (Authentication): "Bu numara gerçekten sana mı ait?"
- **Akış:** Telefon numarası girilir → Backend Redis'te `otp:{phone_hash}` anahtarıyla 4 haneli kod üretir (TTL: 5 dk, max 5 deneme) → SMS ile gönderilir → Kullanıcı doğru kodu girerse backend bir **kısa ömürlü access token (15 dk, JWT)** + **refresh token (30 gün, httpOnly secure cookie)** üretir.
- **Rate limiting:** Aynı numaraya 1 dakikada 1'den fazla, saatte 5'ten fazla OTP gönderilmez (SMS maliyeti + smishing/spam önleme).
- **Neden JWT + refresh token:** Kullanıcı her thread'e girdiğinde yeniden SMS almasın diye — oturum access token ile yürür, süresi dolunca refresh token sessizce yeniler.

### Katman 2 — Yetkilendirme (Authorization): "Bu spesifik mesaja erişebilir misin?"
Bu, klasik "role-based" yetkilendirmeden farklı, **mesaj/thread bazlı, bilgiye dayalı (knowledge-based) yetkilendirmedir**:
- Bir thread'e erişim, kullanıcının rolüne değil, **doğru parola/cevabı bilmesine** bağlıdır.
- Akış: `POST /threads/{id}/unlock` → body: `{secret}` → backend `bcrypt.compare(secret, lock_secret_hash)` → doğruysa thread için **kısa ömürlü, sadece o thread'e scope'lu bir "thread access token"** üretilir (JWT claim: `thread_id`, `exp: 10dk` veya konuşma süresince).
- Bu token olmadan `GET /threads/{id}/messages` çağrısı 403 döner — yani **"doğru kişi olmak" (Katman 1) yetmez, "doğru bilgiyi bilmek" (Katman 2) de gerekir.** İki katman birbirinden bağımsız çalışır.
- **Brute-force koruması:** `lock_secret_hash` denemeleri thread bazında sayılır (`attempt_count`); 5 yanlış denemeden sonra thread 15 dakika kilitlenir + isteğe bağlı olarak initiator'a "deneme yapılıyor" bildirimi.

### Anonimlik Modeli (Authorization'ın bir uzantısı)
- `messages.is_anonymous = true` olduğunda, API response'unda `sender_user_id` **hiç dönmez** (frontend'e gitmez) — bu bir UI gizleme değil, backend seviyesinde alan filtrelemesidir. Böylece client tarafında yanlışlıkla ifşa riski olmaz.
- "Numarasız kimlik" (Senaryo B): `recipient_user_id` eşleşme anına kadar null'dur; eşleşme olduğunda iki tarafın da `is_anonymous` tercihine göre karşılıklı numara/isim asla otomatik paylaşılmaz — sadece "kimliğini göster" aksiyonu açıkça tetiklenirse bir alan güncellenir.

### Özet Tablo
| Soru | Mekanizma |
|---|---|
| Bu numara gerçek mi / sahibi mi? | SMS OTP (Katman 1) |
| Bu kişi bu mesajı okumaya yetkili mi? | Parola/cevap doğrulama (Katman 2) |
| Kimliği görünsün mü? | Alan bazlı response filtreleme (is_anonymous) |
| Oturum ne kadar sürer? | JWT access (15dk) + refresh (30 gün) |

---

## 9. API Tasarımı (MVP Endpoint Listesi)

```
POST   /auth/otp/request          { phone_number }
POST   /auth/otp/verify           { phone_number, code } → { access_token, refresh_token }
POST   /auth/refresh              { refresh_token } → { access_token }

POST   /threads                   { recipient_phone, body, lock_type, lock_secret, is_anonymous }
POST   /threads/:id/unlock        { secret } → { thread_access_token }
GET    /threads/:id/messages      [Authorization: thread_access_token]
POST   /threads/:id/messages      { body, is_anonymous } [Authorization: thread_access_token]

POST   /pool/entries              { title, question, answer, category, visibility }
GET    /pool/entries              ?category=&page=
POST   /pool/entries/:id/attempt  { answer } → { success, thread_id? }

GET    /me                        → kullanıcı profili
PATCH  /me                        { display_name }
DELETE /me                        → KVKK kapsamında hesap/veri silme talebi
```

Tüm `POST /threads/*` ve `pool/entries/*` uçları, Katman 1 access token gerektirir; `GET/POST /threads/:id/messages` ayrıca Katman 2 (thread_access_token) gerektirir.

---

## 10. Güvenlik, Gizlilik ve Kötüye Kullanım Önleme

Bu ürün kategorisinde (anonim + hedefli iletişim) en büyük risk **taciz/stalking potansiyeli**dir. Bu, "sonra eklenir" değil, MVP'nin ayrılmaz parçasıdır:

- **Engelleme (Block):** Alıcı, bir numarayı/kullanıcıyı tek tıkla engelleyebilmeli — engellenen taraf bir daha o numaraya mesaj gönderemez (backend seviyesinde kontrol, sadece UI gizleme değil).
- **Şikayet (Report):** Her mesaj/thread için "Şikayet Et" aksiyonu; şikayet eşiği aşan hesaplar otomatik geçici askıya alınır (rate-limit + manuel moderasyon kuyruğu).
- **Rate limiting (çok katmanlı):**
  - Aynı numaradan saatte kaç mesaj gönderilebilir (spam önleme).
  - Aynı numaraya kaç farklı kişi mesaj gönderebilir (taciz önleme — tek kişinin sürekli farklı hesaplardan hedef alınmasını zorlaştırır).
  - Pool'da bir soruya dakikada kaç cevap denemesi yapılabilir (brute-force önleme).
- **Mesaj imhası:** `destroy_after_read = true` olan mesajlar okunduktan X süre sonra (örn. 24 saat veya anında, kullanıcı tercihi) veritabanından fiziksel olarak silinir — soft-delete değil, hard-delete.
- **Numara asla client'a sızmaz:** Anonim modda `phone_number` alanı API response'larında hiçbir zaman dönmez (backend filtreleme, Bölüm 8).
- **KVKK/GDPR uyumu:** Kullanıcı `DELETE /me` ile tüm verisinin silinmesini talep edebilir; log/analytics verilerinde numara yerine hash kullanılır; açık bir Gizlilik Politikası ve Aydınlatma Metni MVP launch'ından önce yayınlanır (Türkiye'de KVKK md. 10 gereği zorunlu).
- **Reşit olmayan kullanıcı riski:** Uygulama 18+ olarak konumlandırılmalı, kayıt sırasında yaş beyanı istenmeli; "yakınlık/iletişim başlatma" temalı bir üründe bu, yasal ve etik açıdan atlanamaz bir gerekliliktir.
- **Smishing/Phishing farkındalığı:** SMS içeriğinde platformun resmi kısa linki ve marka adı net olmalı ki kullanıcılar bunu phishing SMS'i sanıp güvenmesin ya da tam tersi gerçek phishing'e daha az kanabilsin.

---

## 11. Büyüme Mekanizmaları (Viral Döngü)

Ürünün doğal viral çekirdeği zaten mimaride gömülü: **her mesaj gönderimi, alıcıyı platforma davet eder.**

- **Zorunlu davet döngüsü (Senaryo A):** Alıcı mesajı okumak için siteye girmek zorunda — bu, "davetiyeli" bir onboarding'dir, ekstra pazarlama gerekmez.
- **Sosyal paylaşım (Senaryo B):** Pool sorusu bir link olarak paylaşılabilir hâle getirilmeli ("Bu soruyu cevaplayabilir misin?" formatında Instagram/Twitter bio'suna eklenebilir kısa link + Open Graph önizleme kartı).
- **"Sen de birine mesaj bırak" CTA'sı:** Bir konuşma tamamlandıktan sonra, kullanıcıya kendi mesajını/sorusunu oluşturması için nazik bir yönlendirme gösterilir (özellikle Alıcı, mesajı okuduktan sonra "Sen de birine böyle bir şey gönderebilirsin" akışına yönlendirilir).
- **Referral/davet kodu (Faz 2):** İlk sürümde şart değil ama veri modeli buna uygun tasarlanmalı (`users` tablosuna `invited_by_user_id` alanı eklenmesi kolay).

---

## 12. MVP Kapsam Kararları (Faz 1 / 2 / 3)

### Faz 1 — MVP (İlk Yayın)
- Senaryo A (parola/soru ile doğrudan mesaj) — tam akış.
- Senaryo B (public pool, temel kategori filtresi) — tam akış.
- OTP tabanlı auth, thread bazlı yetkilendirme.
- Engelle/Şikayet Et, temel rate-limiting.
- Mesaj imhası (okunduktan sonra silme, opsiyonel).
- PWA/responsive web (native app yok).

### Faz 2 — Büyüme ve İyileştirme
- Referral/davet kodu sistemi.
- Bildirim tercihleri (push notification, PWA destekliyse).
- Gelişmiş moderasyon paneli (admin dashboard, şikayet kuyruğu).
- Havuzda arama + gelişmiş kategori/etiket sistemi.
- Çoklu dil desteği.

### Faz 3 — Ölçekleme
- Native mobil uygulama (opsiyonel, PWA yeterli kalırsa gerekmeyebilir).
- E-posta tabanlı alternatif doğrulama (SMS maliyetini azaltmak için).
- Gelişmiş anti-abuse: ML tabanlı spam/taciz tespiti.
- Kurumsal/işletme kullanım senaryoları (opsiyonel yeni gelir kalemi).

**Kesilen (MVP dışı bırakılan) özellikler ve gerekçesi:**
- Native app → web zaten hedefe ulaştırıyor, geliştirme süresini ikiye katlamaya değmez.
- Gelişmiş eşleştirme algoritmaları (AI destekli öneri) → çekirdek değer önerisi bu değil, sonradan eklenebilir.
- Çoklu SMS sağlayıcı fallback → tek sağlayıcı ile başlanır, ölçek büyüyünce eklenir.

---

## 13. Yayına Alma (Deployment) Planı

1. **Domain + SSL:** Marka adı belirlenip domain alınır, Vercel/Cloudflare üzerinden otomatik SSL.
2. **SMS sağlayıcı onayı:** Netgsm/İleti Merkezi başlık (header) onayı — Türkiye'de ticari SMS göndermek için başlık başvurusu birkaç gün sürebilir, bu **en erken başlatılması gereken adımlardan biri** (kritik yol/critical path).
3. **Ortam ayrımı:** `staging` (test SMS numaralarıyla) ve `production` ortamları ayrı tutulur.
4. **Yasal metinler:** Kullanım Şartları, Gizlilik Politikası, KVKK Aydınlatma Metni yayına alınmadan önce hazır olmalı.
5. **Soft launch:** Kapalı beta (davetiye ile sınırlı sayıda kullanıcı) → geri bildirim → Faz 1 tamamlanınca herkese açık yayın.
6. **İzleme:** Temel analytics (sayfa görüntüleme, dönüşüm hunisi: SMS tıklama → mesaj okuma → yanıt) + hata izleme (Sentry benzeri).

---

## 14. Riskler ve Açık Kararlar

| Risk/Karar | Açıklama | Öneri |
|---|---|---|
| Taciz/stalking potansiyeli | Anonim + hedefli iletişim kombinasyonu kötüye kullanıma açık | Bölüm 10'daki önlemler MVP'den itibaren aktif olmalı, "sonra eklenir" denmemeli |
| SMS maliyeti | Her etkileşim bir SMS demek, ölçek büyüdükçe maliyet artar | Faz 2'de e-posta alternatifi + SMS başına maliyet takibi |
| Yasal konumlandırma | "Yakınlık başlatma" teması bazı pazarlarda flört/dating regülasyonlarına girebilir | Hukuki danışmanlıkla ürün tanımının hangi kategoriye girdiği netleştirilmeli |
| 18 yaş altı kullanım | Reşit olmayan kullanıcıların bu tür bir üründe yer alması ciddi risk taşır | Yaş doğrulama + kullanım şartlarında net yaş sınırı, mümkünse ek doğrulama katmanı değerlendirilmeli |
| Numara doğrulama vs. gerçek kimlik | OTP sadece "bu numarayı kontrol ediyorsun" demek, "sen busun" demek değil | Kullanıcı beklentisi yönetilmeli — pazarlama dilinde "kimlik doğrulaması" değil "numara doğrulaması" ifadesi kullanılmalı |

---

*Bu doküman, canlıya alma öncesi hukuk (KVKK/Aydınlatma Metni) ve SMS sağlayıcı onay süreçleriyle birlikte güncellenmelidir. Sıradaki adım için önerim: Faz 1 kapsamındaki ekranların wireframe/UI tasarımına geçmek ya da veri modelini gerçek migration dosyalarına dökmek — hangisiyle devam etmek istersin?*
