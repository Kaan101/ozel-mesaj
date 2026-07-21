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
  | "giris.checking"
  | "mesajOlustur.title"
  | "mesajOlustur.subtitle"
  | "mesajOlustur.phoneLabel"
  | "mesajOlustur.messageLabel"
  | "mesajOlustur.messagePlaceholder"
  | "mesajOlustur.addQuestionLabel"
  | "mesajOlustur.destroyAfterRead"
  | "mesajOlustur.questionLabel"
  | "mesajOlustur.questionPlaceholder"
  | "mesajOlustur.answerLabel"
  | "mesajOlustur.answerPlaceholder"
  | "mesajOlustur.anonYes"
  | "mesajOlustur.anonNo"
  | "mesajOlustur.addEmailLabel"
  | "mesajOlustur.emailLabel"
  | "mesajOlustur.sendButton"
  | "mesajOlustur.sending"
  | "mesajOlustur.sentTitle"
  | "mesajOlustur.sentDesc"
  | "mesajOlustur.backHome"
  | "mesajOlustur.leaveAnother"
  | "havuzOlustur.title"
  | "havuzOlustur.subtitle"
  | "havuzOlustur.titleLabel"
  | "havuzOlustur.titlePlaceholder"
  | "havuzOlustur.questionLabel"
  | "havuzOlustur.questionPlaceholder"
  | "havuzOlustur.answerLabel"
  | "havuzOlustur.answerPlaceholder"
  | "havuzOlustur.categoryLabel"
  | "havuzOlustur.categoryPlaceholder"
  | "havuzOlustur.visibilityLabel"
  | "havuzOlustur.public"
  | "havuzOlustur.unlisted"
  | "havuzOlustur.publicDesc"
  | "havuzOlustur.unlistedDesc"
  | "havuzOlustur.publish"
  | "havuzOlustur.publishing"
  | "havuzOlustur.sentTitle"
  | "havuzOlustur.sentPublicDesc"
  | "havuzOlustur.sentUnlistedDesc"
  | "havuzOlustur.goToPool"
  | "havuzOlustur.leaveAnother"
  | "havuz.title"
  | "havuz.subtitle"
  | "havuz.leaveQuestion"
  | "havuz.all"
  | "havuz.loading"
  | "havuz.empty"
  | "mesajlarim.title"
  | "mesajlarim.newMessage"
  | "mesajlarim.loading"
  | "mesajlarim.empty"
  | "mesajlarim.received"
  | "mesajlarim.sent"
  | "mesajlarim.passwordProtected"
  | "mesajlarim.to"
  | "mesajlarim.youSent"
  | "mesajlarim.sentToYou"
  | "mesajlarim.pool"
  | "mesajlarim.direct"
  | "mesajlarim.deleteConfirm"
  | "mesajlarim.delete"
  | "havuz.searchPlaceholder"
  | "havuz.noResults"
  | "giris.kvkkLabel"
  | "giris.consentLabel"
  | "giris.kvkkLinkText"
  | "giris.consentLinkText"
  | "giris.viewLink";

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
    "mesajOlustur.title": "Ona Mesaj Bırak",
    "mesajOlustur.subtitle": "Söylemek istediğin şeyi, doğru kişiye ulaştır.",
    "mesajOlustur.phoneLabel": "Alıcının Telefon Numarası",
    "mesajOlustur.messageLabel": "Mesajın",
    "mesajOlustur.messagePlaceholder": "Seninle tanışmak isterim, bir kahve içelim mi?",
    "mesajOlustur.addQuestionLabel": "Bir soru-cevap ile korumak ister misin?",
    "mesajOlustur.destroyAfterRead": "Okunduktan sonra silinsin",
    "mesajOlustur.questionLabel": "Sorun",
    "mesajOlustur.questionPlaceholder": "Nerede tanıştık?",
    "mesajOlustur.answerLabel": "Doğru Cevap",
    "mesajOlustur.answerPlaceholder": "Kütüphanede",
    "mesajOlustur.anonYes": "Anonim kalacaksın",
    "mesajOlustur.anonNo": "Kimliğin görünecek",
    "mesajOlustur.addEmailLabel": "Ayrıca e-posta ile de bildirmek ister misin?",
    "mesajOlustur.emailLabel": "Alıcının E-postası",
    "mesajOlustur.sendButton": "Mesajı Gönder",
    "mesajOlustur.sending": "Gönderiliyor...",
    "mesajOlustur.sentTitle": "Mesajın gönderildi",
    "mesajOlustur.sentDesc": "numarasına bir bildirim SMS'i gitti.",
    "mesajOlustur.backHome": "Ana Sayfaya Dön",
    "mesajOlustur.leaveAnother": "Başka birine daha mesaj bırak",
    "havuzOlustur.title": "Havuza Soru Bırak",
    "havuzOlustur.subtitle": "Numarasını bilmediğin biriyle, ortak bir bilgi üzerinden buluş.",
    "havuzOlustur.titleLabel": "Başlık",
    "havuzOlustur.titlePlaceholder": "Ortak Anımız",
    "havuzOlustur.questionLabel": "Sorun",
    "havuzOlustur.questionPlaceholder": "İlk nerede tanıştık?",
    "havuzOlustur.answerLabel": "Doğru Cevap",
    "havuzOlustur.answerPlaceholder": "Kütüphanede",
    "havuzOlustur.categoryLabel": "Kategori",
    "havuzOlustur.categoryPlaceholder": "Genel",
    "havuzOlustur.visibilityLabel": "Görünürlük",
    "havuzOlustur.public": "Herkese Açık",
    "havuzOlustur.unlisted": "Sadece Link ile",
    "havuzOlustur.publicDesc": "Havuz sayfasında herkes görebilir.",
    "havuzOlustur.unlistedDesc": "Sadece paylaştığın linke sahip olanlar görebilir.",
    "havuzOlustur.publish": "Soruyu Yayınla",
    "havuzOlustur.publishing": "Oluşturuluyor...",
    "havuzOlustur.sentTitle": "Sorun havuzda",
    "havuzOlustur.sentPublicDesc": "Herkese açık havuzda listeleniyor. Doğru cevabı bilen biri seninle anında bağlantı kurabilecek.",
    "havuzOlustur.sentUnlistedDesc": "Sadece paylaştığın linkle erişilebilir.",
    "havuzOlustur.goToPool": "Havuza Git",
    "havuzOlustur.leaveAnother": "Başka bir soru daha bırak",
    "havuz.title": "Havuz",
    "havuz.subtitle": "Ortak bir bilgiyi paylaştığın biriyle karşılaş.",
    "havuz.leaveQuestion": "Soru Bırak",
    "havuz.all": "Tümü",
    "havuz.loading": "Yükleniyor...",
    "havuz.empty": "Bu kategoride henüz bir soru yok.",
    "mesajlarim.title": "Mesajlarım",
    "mesajlarim.newMessage": "Yeni Mesaj",
    "mesajlarim.loading": "Yükleniyor...",
    "mesajlarim.empty": "Henüz bir mesajın yok.",
    "mesajlarim.received": "📥 Bana Gelenler",
    "mesajlarim.sent": "📤 Gönderdiklerim",
    "mesajlarim.passwordProtected": "Parola korumalı mesaj",
    "mesajlarim.to": "Kime:",
    "mesajlarim.youSent": "Sen gönderdin",
    "mesajlarim.sentToYou": "Sana gönderildi",
    "mesajlarim.pool": "Havuz",
    "mesajlarim.direct": "Doğrudan",
    "mesajlarim.deleteConfirm": "Bu konuşmayı listenden kaldırmak istiyor musun?",
    "mesajlarim.delete": "Sil",
    "havuz.searchPlaceholder": "Başlık, soru veya kategori ara...",
    "havuz.noResults": "Aramanla eşleşen bir soru bulunamadı.",
    "giris.kvkkLinkText": "KVKK Aydınlatma Metni",
    "giris.kvkkLabel": "KVKK Aydınlatma Metni'ni okudum ve anladım.",
    "giris.consentLinkText": "Açık Rıza Metni",
    "giris.consentLabel": "Açık Rıza Metni'ni okudum ve onaylıyorum.",
    "giris.viewLink": "(görüntüle)",
  },
  en: {
    "nav.pool": "Pool",
    "nav.myMessages": "Messages",
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
    "mesajOlustur.title": "Leave Them a Message",
    "mesajOlustur.subtitle": "Say what you want to say, straight to the right person.",
    "mesajOlustur.phoneLabel": "Recipient's Phone Number",
    "mesajOlustur.messageLabel": "Your Message",
    "mesajOlustur.messagePlaceholder": "I'd love to get to know you, want to grab a coffee?",
    "mesajOlustur.addQuestionLabel": "With a question",
    "mesajOlustur.destroyAfterRead": "Delete after read",
    "mesajOlustur.questionLabel": "Your Question",
    "mesajOlustur.questionPlaceholder": "Where did we first meet?",
    "mesajOlustur.answerLabel": "Correct Answer",
    "mesajOlustur.answerPlaceholder": "At the library",
    "mesajOlustur.anonYes": "You'll stay anonymous",
    "mesajOlustur.anonNo": "Your identity will show",
    "mesajOlustur.addEmailLabel": "Also notify them by email?",
    "mesajOlustur.emailLabel": "Recipient's Email",
    "mesajOlustur.sendButton": "Send Message",
    "mesajOlustur.sending": "Sending...",
    "mesajOlustur.sentTitle": "Your message was sent",
    "mesajOlustur.sentDesc": "got a notification SMS.",
    "mesajOlustur.backHome": "Back to Home",
    "mesajOlustur.leaveAnother": "Leave a message for someone else",
    "havuzOlustur.title": "Leave a Question in the Pool",
    "havuzOlustur.subtitle": "Meet someone whose number you don't know, through shared knowledge.",
    "havuzOlustur.titleLabel": "Title",
    "havuzOlustur.titlePlaceholder": "Our Shared Memory",
    "havuzOlustur.questionLabel": "Your Question",
    "havuzOlustur.questionPlaceholder": "Where did we first meet?",
    "havuzOlustur.answerLabel": "Correct Answer",
    "havuzOlustur.answerPlaceholder": "At the library",
    "havuzOlustur.categoryLabel": "Category",
    "havuzOlustur.categoryPlaceholder": "General",
    "havuzOlustur.visibilityLabel": "Visibility",
    "havuzOlustur.public": "Public",
    "havuzOlustur.unlisted": "Link Only",
    "havuzOlustur.publicDesc": "Anyone can see it on the pool page.",
    "havuzOlustur.unlistedDesc": "Only people with your link can see it.",
    "havuzOlustur.publish": "Publish Question",
    "havuzOlustur.publishing": "Publishing...",
    "havuzOlustur.sentTitle": "Your question is in the pool",
    "havuzOlustur.sentPublicDesc": "It's listed in the public pool. Anyone who knows the answer can connect with you instantly.",
    "havuzOlustur.sentUnlistedDesc": "Only reachable through the link you shared.",
    "havuzOlustur.goToPool": "Go to Pool",
    "havuzOlustur.leaveAnother": "Leave another question",
    "havuz.title": "Pool",
    "havuz.subtitle": "Meet someone who shares something in common with you.",
    "havuz.leaveQuestion": "Leave a Question",
    "havuz.all": "All",
    "havuz.loading": "Loading...",
    "havuz.empty": "No questions in this category yet.",
    "mesajlarim.title": "Messages",
    "mesajlarim.newMessage": "New Message",
    "mesajlarim.loading": "Loading...",
    "mesajlarim.empty": "You don't have any messages yet.",
    "mesajlarim.received": "📥 Received",
    "mesajlarim.sent": "📤 Sent",
    "mesajlarim.passwordProtected": "Password-protected message",
    "mesajlarim.to": "To:",
    "mesajlarim.youSent": "You sent this",
    "mesajlarim.sentToYou": "Sent to you",
    "mesajlarim.pool": "Pool",
    "mesajlarim.direct": "Direct",
    "mesajlarim.deleteConfirm": "Remove this conversation from your list?",
    "mesajlarim.delete": "Delete",
    "havuz.searchPlaceholder": "Search by title, question, or category...",
    "havuz.noResults": "No questions match your search.",
    "giris.kvkkLinkText": "Privacy Disclosure Notice",
    "giris.kvkkLabel": "I have read and understood the Privacy Disclosure Notice.",
    "giris.consentLinkText": "Explicit Consent Form",
    "giris.consentLabel": "I have read and agree to the Explicit Consent Form.",
    "giris.viewLink": "(view)",
  },
};

export function translate(language: LanguageCode, key: TranslationKey): string {
  return TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
