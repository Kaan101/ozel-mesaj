// Yonetim ekraninda gosterilecek/degistirilebilecek parametrelerin
// tek tanim yeri. Her biri: benzersiz anahtar, env fallback degiskeni,
// varsayilan deger, tur ve kullanicinin gorecegi aciklama.
export interface SettingDefinition {
  key: string;
  envFallback: string;
  defaultValue: number;
  label: string;
  description: string;
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
];
