// Yonetim ekraninda gosterilecek/degistirilebilecek parametrelerin
// tek tanim yeri. Her biri: benzersiz anahtar, env fallback degiskeni,
// varsayilan deger, tur ve kullanicinin gorecegi aciklama.
//
// Kullanici istegi: sayisal (number) parametrelerin yaninda, metin
// (string) parametreler de desteklenir - orn. iletisim e-postasi,
// adres. "type" alani belirtilmezse varsayilan "number" sayilir
// (geriye donuk uyumluluk icin).
export interface SettingDefinition {
  key: string;
  envFallback: string;
  defaultValue: number | string;
  label: string;
  description: string;
  type?: "number" | "string";
}

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    key: "OTP_RATE_LIMIT_PER_MINUTE",
    envFallback: "OTP_RATE_LIMIT_PER_MINUTE",
    defaultValue: 1,
    label: "OTP - Dakikalik Istek Siniri",
    description: "Ayni telefon numarasi dakikada kac kez kod isteyebilir.",
  },
  {
    key: "OTP_RATE_LIMIT_PER_HOUR",
    envFallback: "OTP_RATE_LIMIT_PER_HOUR",
    defaultValue: 5,
    label: "OTP - Saatlik Istek Siniri",
    description: "Ayni telefon numarasi saatte kac kez kod isteyebilir.",
  },
  {
    key: "OTP_VERIFY_MAX_ATTEMPTS",
    envFallback: "OTP_VERIFY_MAX_ATTEMPTS",
    defaultValue: 5,
    label: "OTP - Yanlis Deneme Siniri",
    description: "Kac yanlis kod denemesinden sonra 15 dakika kilitlensin.",
  },
  {
    key: "THREAD_UNLOCK_MAX_ATTEMPTS",
    envFallback: "THREAD_UNLOCK_MAX_ATTEMPTS",
    defaultValue: 5,
    label: "Mesaj Kilidi - Yanlis Deneme Siniri",
    description: "Parola/cevap icin kac yanlis denemeden sonra kilitlensin.",
  },
  {
    key: "POOL_ATTEMPT_RATE_LIMIT_PER_MINUTE",
    envFallback: "POOL_ATTEMPT_RATE_LIMIT_PER_MINUTE",
    defaultValue: 5,
    label: "Havuz - Dakikalik Cevap Deneme Siniri",
    description: "Bir havuz sorusuna dakikada kac cevap denemesi yapilabilir.",
  },
  {
    key: "REPORT_SUSPEND_THRESHOLD",
    envFallback: "REPORT_SUSPEND_THRESHOLD",
    defaultValue: 3,
    label: "Sikayet - Otomatik Askiya Alma Esigi",
    description: "Bir kullanici kac sikayetten sonra otomatik askiya alinsin.",
  },
  {
    key: "MESSAGE_DESTROY_DELAY_SECONDS",
    envFallback: "MESSAGE_DESTROY_DELAY_SECONDS",
    defaultValue: 10,
    label: "Mesaj Imha Gecikmesi (sn)",
    description: "destroy_after_read mesajlar okunduktan kac saniye sonra silinsin.",
  },
  {
    key: "RATE_LIMIT_WINDOW_MS",
    envFallback: "RATE_LIMIT_WINDOW_MS",
    defaultValue: 60000,
    label: "Genel Limit - Zaman Penceresi (ms)",
    description: "Tum endpoint'ler icin genel IP bazli limitin zaman penceresi (milisaniye).",
  },
  {
    key: "RATE_LIMIT_MAX_REQUESTS",
    envFallback: "RATE_LIMIT_MAX_REQUESTS",
    defaultValue: 100,
    label: "Genel Limit - Pencere Basina Istek Sayisi",
    description: "Bir IP, zaman penceresi icinde en fazla kac istek atabilir. Test sirasinda dusuk kalirsa 'cok sik istek' hatasi cok erken tetiklenir.",
  },
  {
    key: "EMAIL_NOTIFICATION_ENABLED",
    envFallback: "EMAIL_NOTIFICATION_ENABLED",
    defaultValue: 1,
    label: "E-posta Bildirim Secenegi Goster (1=Acik, 0=Kapali)",
    description: "'Ona Mesaj Gonder' formunda opsiyonel e-posta bildirim alaninin gorunup gorunmeyecegini kontrol eder.",
  },
  {
    key: "AUTO_LOGIN_SESSION_DAYS",
    envFallback: "AUTO_LOGIN_SESSION_DAYS",
    defaultValue: 90,
    label: "Otomatik Giris Suresi (Gun)",
    description: "'Beni Hatirla / Otomatik Giris' secilirse, kullanici bu sure boyunca tekrar kod girmeden giris yapabilir. Sure sonunda yeniden dogrulama istenir.",
  },
  {
    key: "OTP_REQUEST_DAILY_LIMIT",
    envFallback: "OTP_REQUEST_DAILY_LIMIT",
    defaultValue: 10,
    label: "Gunluk Kod Isteme Siniri",
    description: "Ayni telefon numarasi icin gunde en fazla kac kez yeni dogrulama kodu istenebilir (spam/smishing onleme, dakika/saat limitlerine ek).",
  },
  {
    key: "POOL_ENTRY_LIFESPAN_DAYS",
    envFallback: "POOL_ENTRY_LIFESPAN_DAYS",
    defaultValue: 90,
    label: "Havuz Sorusu Yasam Omru (Gun)",
    description: "Bir havuz sorusu, olusturulmasindan bu kadar gun sonra otomatik olarak kaldirilir (ilgili mesajlasmalar/thread'ler ETKILENMEZ, sadece soru gizlenir). 0 girilirse otomatik kaldirma devre disi kalir.",
  },
  {
    key: "THREAD_MAX_LIFESPAN_DAYS",
    envFallback: "THREAD_MAX_LIFESPAN_DAYS",
    defaultValue: 365,
    label: "Iletisimin Maksimum Yasam Suresi (Gun)",
    description: "Bir iletisim (mesajlasma/konusma), olusturulmasindan bu kadar gun sonra her iki taraf icin de otomatik olarak arsivlenir (Mesajlarim listesinden kalkar, mesajlarin kendisi SILINMEZ). 0 girilirse devre disi kalir.",
  },
  {
    key: "MESSAGE_LIFESPAN_DAYS",
    envFallback: "MESSAGE_LIFESPAN_DAYS",
    defaultValue: 365,
    label: "Mesaj Yasam Suresi (Gun)",
    description: "Gonderilen bir mesaj, bu kadar gun sonra uygulamadan kalici olarak silinir (okunma durumundan bagimsiz - 'okunduktan sonra sil' secenegiyle karistirilmamali). Hukuki ispat icin sifreli arsiv kopyasi (MessageAudit) bundan ETKILENMEZ. 0 girilirse devre disi kalir.",
  },
  {
    key: "THREAD_MAX_MESSAGE_COUNT",
    envFallback: "THREAD_MAX_MESSAGE_COUNT",
    defaultValue: 500,
    label: "Bir Iletisimdeki Maksimum Mesaj Sayisi",
    description: "Bir mesajlasma (thread) icinde en fazla kac mesaj birikebilir - bu sayiya ulasilinca yeni mesaj gonderimi ENGELLENMEZ, bunun yerine o iletisimdeki EN ESKI mesaj otomatik silinir (dongusel/rolling limit, kim gonderdiyse gondersin). 0 girilirse sinirsiz.",
  },
  {
    key: "PUSH_NOTIFICATIONS_ENABLED",
    envFallback: "PUSH_NOTIFICATIONS_ENABLED",
    defaultValue: 1,
    label: "Push Bildirimleri (1=Acik, 0=Kapali)",
    description: "Yeni mesaj/havuz yaniti geldiginde tarayici push bildirimi gonderilsin mi.",
  },
  {
    key: "PUSH_NOTIFICATION_MAX_WIDTH_PX",
    envFallback: "PUSH_NOTIFICATION_MAX_WIDTH_PX",
    defaultValue: 768,
    label: "Bildirim Icin Maksimum Ekran Genisligi (px)",
    description: "Tarayici penceresi bu genislikten (piksel) DAHA GENISSE (orn. masaustu), bildirim izni istenmez - sadece mobil boyuttaki ekranlarda calisir. 0 girilirse genislik kontrolu devre disi kalir (her boyutta calisir).",
  },
  {
    key: "MULTI_LANGUAGE_ENABLED",
    envFallback: "MULTI_LANGUAGE_ENABLED",
    defaultValue: 1,
    label: "Coklu Dil Destegi (1=Acik, 0=Kapali)",
    description: "Kapatilirsa, girişte ulkeye gore otomatik dil secimi devre disi kalir - sistem HER ZAMAN Ingilizce calisir (varsayilan).",
  },
  {
    key: "CONTACT_EMAIL",
    envFallback: "CONTACT_EMAIL",
    defaultValue: "destek@youhavemi.com",
    type: "string",
    label: "Iletisim E-postasi",
    description: "Footer ve KVKK Aydinlatma Metni'nde gosterilen iletisim e-postasi.",
  },
  {
    key: "CONTACT_ADDRESS",
    envFallback: "CONTACT_ADDRESS",
    defaultValue: "İstanbul, Türkiye",
    type: "string",
    label: "Iletisim Adresi",
    description: "Footer ve KVKK Aydinlatma Metni'nde gosterilen adres bilgisi.",
  },
];
