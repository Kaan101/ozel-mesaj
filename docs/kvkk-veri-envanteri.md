# KVKK Veri İşleme Envanteri (Görev 8.4)

Bu doküman, Özel Mesaj platformunun hangi kişisel veriyi, nerede, ne amaçla ve ne kadar süre sakladığını özetler (KVKK md. 10 kapsamındaki Aydınlatma Metni'nin teknik temelini oluşturur — nihai hukuki metin, hukuk danışmanlığıyla birlikte Görev 13.2'de hazırlanacaktır).

## 1. İşlenen Kişisel Veri Kategorileri

| Veri Kategorisi | Nerede Saklanır | Düz Metin mi? | Amaç |
|---|---|---|---|
| Telefon numarası | `users.phone_number_hash` (PostgreSQL) | ❌ Hayır — HMAC-SHA256 ile hash'lenir | Kimlik doğrulama (OTP), tekrar eden kullanıcıyı tanıma |
| Görünen isim | `users.display_name` (PostgreSQL) | ✅ Evet (kullanıcı isteğe bağlı girer) | Kimliğini açık gösteren kullanıcılar için profil bilgisi |
| Mesaj içeriği | `messages.body` (PostgreSQL) | ✅ Evet | Ürünün temel işlevi (mesajlaşma) |
| Parola/cevap | `message_threads.lock_secret_hash`, `pool_entries.answer_hash` | ❌ Hayır — bcrypt ile hash'lenir | Erişim yetkilendirmesi (Katman 2) |
| OTP kodu | Redis (`otp:{hash}`) | ✅ Evet ama TTL:5dk sonra otomatik silinir | Telefon numarası doğrulama |
| IP adresi (rate limiting için) | Redis (rate-limit sayaçları), uygulama logları | ✅ Evet, TTL'li | Kötüye kullanım/spam önleme |
| Şikayet/engelleme kayıtları | `reports`, `blocks` (PostgreSQL) | Kullanıcı referansları hash'li (user id, düz telefon değil) | Kötüye kullanım önleme, moderasyon |

## 2. Saklama Süreleri

- **OTP kodları**: Redis'te TTL ile 5 dakika sonra otomatik silinir.
- **`destroy_after_read` mesajlar**: Okunduktan `MESSAGE_DESTROY_DELAY_SECONDS` (varsayılan test: 10sn, production önerisi: 0 veya 86400sn) sonra arka plan job'ı ile hard-delete edilir (Görev 5.6).
- **Diğer mesajlar/thread'ler**: Kullanıcı `DELETE /me` talebinde bulunana kadar süresiz saklanır.
- **Rate-limit sayaçları**: Redis'te ilgili pencere kadar (60sn - 1 saat) TTL ile otomatik silinir.

## 3. Silme Talebi (DELETE /me) Kapsamı

Kullanıcı `DELETE /me` çağırdığında aşağıdakiler **hard-delete** edilir (soft-delete değil):
1. Kullanıcının yaptığı tüm şikayetler (`reports`)
2. Kullanıcının taraf olduğu tüm engelleme kayıtları (`blocks`)
3. Kullanıcının **initiator veya recipient olduğu tüm thread'ler** ve bu thread'lere ait **tüm mesajlar** (karşı tarafın mesajları dahil — GDPR/KVKK "unutulma hakkı" kapsamında, paylaşılan konuşma verisinin de silinmesi standart bir yaklaşımdır)
4. Kullanıcının sahip olduğu tüm `pool_entries` kayıtları
5. Kullanıcı kaydının kendisi (`users` tablosu satırı)

## 4. Üçüncü Taraf Veri Paylaşımı

- **İleti Merkezi (SMS sağlayıcı)**: Sadece SMS gönderimi anında telefon numarası ve mesaj metni iletilir; bizim veritabanımızda düz numara hiç tutulmaz.
- **Sentry (hata izleme)**: Hata (exception) detayları gönderilir; hata mesajlarında kişisel veri (telefon numarası, mesaj içeriği) bulunmamasına özen gösterilir — mevcut kodda hata mesajları teknik nitelikte (örn. "Refresh token gecersiz").

## 5. Açık Noktalar / Hukuki Danışmanlık Gerektiren Konular

- Nihai Gizlilik Politikası ve KVKK Aydınlatma Metni'nin hukuki dille yazılması (Görev 13.2).
- Veri işleme envanterinin resmi VERBİS (Veri Sorumluları Sicili) kaydı gerekip gerekmediğinin değerlendirilmesi.
- 18 yaş altı kullanım riskine karşı yaş doğrulama mekanizmasının hukuki yeterliliği (Bölüm 10, 14'te not edilmişti).
