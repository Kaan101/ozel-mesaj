// Genisletilebilir coklu-dil (i18n) sistemi. Su an icin gercekten
// cevrilmis diller: tr, en. Baska diller eklemek icin sadece
// TRANSLATIONS objesine yeni bir anahtar eklemek yeterli - sistem
// mimarisi herhangi bir sayida dili destekler.
//
// COUNTRY_LANGUAGE_MAP genis tutuldu (cogu ulke icin gercek dil kodu)
// - ama TRANSLATIONS'ta cevirisi olmayan bir dil secilirse, t()
// fonksiyonu otomatik olarak Ingilizce'ye (en) duser (Bolum: kullanici
// ile konusulan "genisletilebilir ama once TR/EN" karari).

export type LanguageCode = string;

export const COUNTRY_LANGUAGE_MAP: Record<string, LanguageCode> = {
  TR: "tr",
  US: "en",
  GB: "en",
  AU: "en",
  CA: "en",
  IE: "en",
  NZ: "en",
  DE: "de",
  AT: "de",
  CH: "de",
  FR: "fr",
  BE: "fr",
  NL: "nl",
  ES: "es",
  MX: "es",
  AR: "es",
  IT: "it",
  PT: "pt",
  BR: "pt",
  RU: "ru",
  UA: "uk",
  PL: "pl",
  CZ: "cs",
  SK: "sk",
  HU: "hu",
  RO: "ro",
  BG: "bg",
  GR: "el",
  SE: "sv",
  NO: "no",
  DK: "da",
  FI: "fi",
  IS: "is",
  HR: "hr",
  RS: "sr",
  SI: "sl",
  LT: "lt",
  LV: "lv",
  EE: "et",
  AZ: "az",
  GE: "ka",
  IR: "fa",
  SA: "ar",
  AE: "ar",
  EG: "ar",
  IL: "he",
  CN: "zh",
  TW: "zh",
  JP: "ja",
  KR: "ko",
  IN: "hi",
  PK: "ur",
  ID: "id",
  TH: "th",
  VN: "vi",
};

export function languageForCountry(iso2: string): LanguageCode {
  return COUNTRY_LANGUAGE_MAP[iso2] ?? "en";
}

type TranslationKey =
  | "nav.pool"
  | "nav.myMessages"
  | "nav.login"
  | "nav.logout"
  | "landing.hero.title.part1"
  | "landing.hero.title.highlight"
  | "landing.hero.title.part2"
  | "landing.hero.subtitle"
  | "landing.cta.send"
  | "landing.cta.browsePool"
  | "landing.howItWorks.title"
  | "landing.howItWorks.step1.title"
  | "landing.howItWorks.step1.desc"
  | "landing.howItWorks.step2.title"
  | "landing.howItWorks.step2.desc"
  | "landing.howItWorks.step3.title"
  | "landing.howItWorks.step3.desc"
  | "landing.trust.title"
  | "landing.trust.number.title"
  | "landing.trust.number.desc"
  | "landing.trust.hash.title"
  | "landing.trust.hash.desc"
  | "landing.trust.block.title"
  | "landing.trust.block.desc"
  | "landing.trust.delete.title"
  | "landing.trust.delete.desc"
  | "landing.footer.rights"
  | "giris.title.phone"
  | "giris.title.otp"
  | "giris.title.avatar"
  | "giris.title.checking"
  | "giris.subtitle.phone"
  | "giris.subtitle.avatar"
  | "giris.subtitle.otp"
  | "giris.phoneLabel"
  | "giris.sendCode"
  | "giris.sending"
  | "giris.otpLabel"
  | "giris.verify"
  | "giris.verifying"
  | "giris.resend"
  | "giris.changeNumber"
  | "giris.continue"
  | "giris.saving"
  | "giris.checking";

export const TRANSLATIONS: Record<LanguageCode, Partial<Record<TranslationKey, string>>> = {
  tr: {
    "nav.pool": "Havuz",
    "nav.myMessages": "Mesajlarım",
    "nav.login": "Giriş Yap",
    "nav.logout": "Çıkış Yap",
    "landing.hero.title.part1": "Ona söylemek istediğin şeyi,",
    "landing.hero.title.highlight": "doğru şekilde",
    "landing.hero.title.part2": "ulaştır.",
    "landing.hero.subtitle":
      "Beğendiğin birine mesaj atmak bazen zor. YouHaveMi, kimliğini istersen gizli tutarak, doğru kişiye ulaştığından emin olarak ilk adımı atmanı sağlar.",
    "landing.cta.send": "Ona Mesaj Gönder",
    "landing.cta.browsePool": "Havuza Göz At",
    "landing.howItWorks.title": "Nasıl çalışır?",
    "landing.howItWorks.step1.title": "Mesajını bırak",
    "landing.howItWorks.step1.desc": "Numarasını girip mesajını yaz, bir parola veya soru ile kilitle.",
    "landing.howItWorks.step2.title": "SMS gider",
    "landing.howItWorks.step2.desc": "Karşı taraf, birinin ona ulaşmaya çalıştığını gösteren bir SMS alır.",
    "landing.howItWorks.step3.title": "Doğru kişi okur",
    "landing.howItWorks.step3.desc": "Parolayı/cevabı bilen kişi mesajı açar, isterse yanıtlar.",
    "landing.trust.title": "Güvenliğin bizim için önemli",
    "landing.trust.number.title": "🔒 Numaran asla görünmez",
    "landing.trust.number.desc": "Anonim kalmayı seçersen, karşı taraf telefon numaranı hiçbir zaman göremez.",
    "landing.trust.hash.title": "🔑 Parolan hash'lenir",
    "landing.trust.hash.desc": "Belirlediğin parola/cevap düz metin olarak hiçbir yerde saklanmaz.",
    "landing.trust.block.title": "🚫 Engelle & Şikayet Et",
    "landing.trust.block.desc": "İstenmeyen bir mesaj alırsan tek tıkla engelleyebilir, şikayet edebilirsin.",
    "landing.trust.delete.title": "🗑️ Verini istediğinde sil",
    "landing.trust.delete.desc": "Hesabını sildiğinde tüm verilerin kalıcı olarak silinir (KVKK uyumlu).",
    "landing.footer.rights": "Tüm hakları saklıdır.",
    "giris.title.phone": "Hoş geldin",
    "giris.title.otp": "Doğrulama kodu",
    "giris.title.avatar": "Kendini seç",
    "giris.title.checking": "Kontrol ediliyor",
    "giris.subtitle.phone": "Devam etmek için telefon numaranı gir.",
    "giris.subtitle.avatar": "Seni temsil edecek bir avatar seç.",
    "giris.subtitle.otp": "numarasına gönderdiğimiz kodu gir.",
    "giris.phoneLabel": "Telefon Numarası",
    "giris.sendCode": "Kod Gönder",
    "giris.sending": "Gönderiliyor...",
    "giris.otpLabel": "Doğrulama Kodu",
    "giris.verify": "Doğrula ve Devam Et",
    "giris.verifying": "Doğrulanıyor...",
    "giris.resend": "Kodu tekrar gönder",
    "giris.changeNumber": "Numarayı değiştir",
    "giris.continue": "Devam Et",
    "giris.saving": "Kaydediliyor...",
    "giris.checking": "Kontrol ediliyor...",
  },
  en: {
    "nav.pool": "Pool",
    "nav.myMessages": "My Messages",
    "nav.login": "Log In",
    "nav.logout": "Log Out",
    "landing.hero.title.part1": "Say what you want to say to them,",
    "landing.hero.title.highlight": "the right way",
    "landing.hero.title.part2": ".",
    "landing.hero.subtitle":
      "Messaging someone you like can be hard. YouHaveMi lets you take the first step, keeping your identity private if you choose, and making sure it reaches the right person.",
    "landing.cta.send": "Send Them a Message",
    "landing.cta.browsePool": "Browse the Pool",
    "landing.howItWorks.title": "How does it work?",
    "landing.howItWorks.step1.title": "Leave your message",
    "landing.howItWorks.step1.desc": "Enter their number, write your message, lock it with a password or question.",
    "landing.howItWorks.step2.title": "An SMS is sent",
    "landing.howItWorks.step2.desc": "The other person gets an SMS letting them know someone is trying to reach them.",
    "landing.howItWorks.step3.title": "The right person reads it",
    "landing.howItWorks.step3.desc": "Whoever knows the password/answer opens the message and can reply if they want.",
    "landing.trust.title": "Your security matters to us",
    "landing.trust.number.title": "🔒 Your number is never shown",
    "landing.trust.number.desc": "If you choose to stay anonymous, the other person can never see your phone number.",
    "landing.trust.hash.title": "🔑 Your password is hashed",
    "landing.trust.hash.desc": "The password/answer you set is never stored anywhere as plain text.",
    "landing.trust.block.title": "🚫 Block & Report",
    "landing.trust.block.desc": "If you get an unwanted message, you can block or report it with one tap.",
    "landing.trust.delete.title": "🗑️ Delete your data anytime",
    "landing.trust.delete.desc": "When you delete your account, all your data is permanently erased.",
    "landing.footer.rights": "All rights reserved.",
    "giris.title.phone": "Welcome",
    "giris.title.otp": "Verification code",
    "giris.title.avatar": "Pick yourself",
    "giris.title.checking": "Checking",
    "giris.subtitle.phone": "Enter your phone number to continue.",
    "giris.subtitle.avatar": "Choose an avatar to represent you.",
    "giris.subtitle.otp": "We sent a code to",
    "giris.phoneLabel": "Phone Number",
    "giris.sendCode": "Send Code",
    "giris.sending": "Sending...",
    "giris.otpLabel": "Verification Code",
    "giris.verify": "Verify and Continue",
    "giris.verifying": "Verifying...",
    "giris.resend": "Resend code",
    "giris.changeNumber": "Change number",
    "giris.continue": "Continue",
    "giris.saving": "Saving...",
    "giris.checking": "Checking...",
  },
};

export function translate(language: LanguageCode, key: TranslationKey): string {
  return TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
