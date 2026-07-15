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

## 6. Hukuki İspat/Belgeleme Amaçlı Veri Saklama (Sonradan Eklendi)

**ÖNEMLİ — Bu bölüm, yukarıdaki asgari veri toplama ilkesine bilinçli bir istisnadır ve avukat onayı gerektirir:**

Sistem sahibinin talebiyle, hukuki bir talep/soruşturma durumunda ispat sağlayabilmek için aşağıdaki ek veriler artık saklanmaktadır:

1. **`audit_logs` tablosu**: Tüm API isteklerinin (yöntem, yol, durum kodu, IP adresi, User-Agent, varsa kullanıcı ID'si) otomatik günlüğü. Ayrıca OTP istekleri/doğrulamaları, mesaj gönderimi, thread açma (başarılı/başarısız), engelleme, şikayet gibi iş olayları ayrıca işaretlenir.
2. **`users.phone_number_encrypted`**: Telefon numarası artık hash'e **ek olarak**, AES-256-GCM ile **geri döndürülebilir** şekilde de şifrelenip saklanıyor. Normal uygulama akışlarında hiçbir zaman kullanılmaz — sadece yönetim ekranından bilinçli bir "aç" işlemiyle çözülebilir.
3. **`message_audits` tablosu**: Her mesajın oluşturulduğu anda alınan şifreli bir kopyası. `destroy_after_read` (okunduktan sonra sil) özelliğiyle canlı `messages` tablosundan silinen mesajlar için bile bu arşiv kaydı **kalıcı olarak korunur**.

**KVKK açısından dikkat edilmesi gerekenler:**
- Bu, kullanıcılara sunulan "mesajın okunduktan sonra kalıcı olarak silindiği" vaadini **fiilen değiştirmektedir** — mesaj kullanıcı arayüzünden kayboluyor olsa da, şifreli bir kopyası sistem sahibi tarafından erişilebilir durumda kalmaktadır.
- Bu durumun **Gizlilik Politikası'nda açıkça belirtilmesi** (KVKK md. 10 aydınlatma yükümlülüğü) gerekmektedir — "mesajlarınız X süre boyunca hukuki amaçlarla şifreli olarak saklanabilir" gibi bir ifade.
- Saklama süresi için bir üst sınır (örn. "kayıt tarihinden itibaren 2 yıl") belirlenmesi ve bu sürenin sonunda otomatik silme mekanizması kurulması önerilir — şu an bu tablolar için otomatik bir silme job'ı **yoktur**, süresiz saklanmaktadır.
- Şifreleme anahtarının (`PHONE_ENCRYPTION_KEY`) güvenli saklanması kritik önem taşır — bu anahtar sızarsa, tüm şifreli veriler (telefon numaraları, mesaj arşivi) açığa çıkar.

**Bu bölümün nihai hukuki uygunluğu için bir avukatla görüşülmesi şiddetle önerilir.**
