"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { ConnectionIllustration } from "@/components/ui/ConnectionIllustration";
import { useAutoRedirect } from "@/lib/use-auto-redirect";
import { fetchWeatherSummary } from "@/lib/weather";
import { AvatarDisplay } from "@/components/ui/AvatarDisplay";
import { AvatarId } from "@/components/ui/Avatar";
import { AvatarConfig } from "@/lib/dicebear-avatar";

// Gorev 11.1 + 11.2 + 11.3 + 11.4: Mesaj olusturma formu (alici no,
// mesaj metni, opsiyonel soru, kimlik tercihi) ve gonderim sonrasi
// onay ekrani. Katman 1 auth gerektirir - girisi olmayan kullanici
// /giris'e yonlendirilir (Bolum 5, 9).
//
// Kullanici geri bildirimi: "Ona Mesaj Gonder" akisinda alici zaten
// bilinen bir kisi oldugu icin parola secenegi tamamen kaldirildi.
// Soru-cevap eklemek istege bagli (varsayilan kapali) - acilirsa
// "Sorun" ve "Cevap" alanlari cikar. Kapaliyken mesaj hicbir kilit
// olmadan (lockType: "none") gonderilir.
export default function MesajOlusturPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [recipientPhone, setRecipientPhone] = useState("");
  const [addEmail, setAddEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [body, setBody] = useState("");
  const [addQuestion, setAddQuestion] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [lockSecret, setLockSecret] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  // Kullanici istegi: gonderen isterse mesaj okunduktan sonra
  // uygulamadan silinsin - hukuki ispat icin sifreli arsivde
  // (MessageAudit) yine de kalir.
  const [destroyAfterRead, setDestroyAfterRead] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentThreadId, setSentThreadId] = useState<string | null>(null);

  // Kullanici istegi: dogrudan mesaj gonderildikten sonra, dugmeye
  // basilmazsa belirli bir sure sonra otomatik olarak Mesajlarim'a
  // yonlensin.
  const redirectSecondsLeft = useAutoRedirect("/mesajlarim", 6, !!sentThreadId);
  // Kullanici istegi: e-posta secenegi bir sistem parametresiyle
  // acilip kapatilabilsin - varsayilan olarak acik kabul ediyoruz,
  // backend'den gercek deger gelene kadar (flicker'i onlemek icin).
  const [emailOptionEnabled, setEmailOptionEnabled] = useState(true);
  // Kullanici istegi: /ayarlar'da "profil ismimi her zaman goster"
  // secilmisse, buradaki anonimlik secenegi hic gosterilmez - mesaj
  // her zaman adiyla gonderilir.
  const [alwaysShowName, setAlwaysShowName] = useState(false);
  // Kullanici istegi: yanit kismindaki onizlemede kendi avatarim/
  // nickname'im gorunsun (anonim degilse).
  const [myAvatarId, setMyAvatarId] = useState<AvatarId | null>(null);
  const [myAvatarConfig, setMyAvatarConfig] = useState<Partial<AvatarConfig> | null>(null);
  const [myDisplayName, setMyDisplayName] = useState<string | null>(null);
  // Kullanici istegi: mesaj gonderirken tum secenekler (soru, okunduktan
  // sonra sil, anonimlik, e-posta) acilir-kapanir bir bolumde - kapaliyken
  // hicbir secenek gorunmez.
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);
  // Kullanici istegi: mesaj yazarken anlik hava durumunu mesajla
  // birlikte gonderebilme (izin verirse).
  const [addWeather, setAddWeather] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/giris");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiFetch<{
      alwaysShowName: boolean;
      avatarId: AvatarId | null;
      avatarConfig: Partial<AvatarConfig> | null;
      displayName: string | null;
    }>("/me")
      .then((data) => {
        setAlwaysShowName(data.alwaysShowName);
        if (data.alwaysShowName) setIsAnonymous(false);
        setMyAvatarId(data.avatarId);
        setMyAvatarConfig(data.avatarConfig);
        setMyDisplayName(data.displayName);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    apiFetch<{ enabled: boolean }>("/admin/settings/public/email-notification-enabled", {
      skipAuth: true,
    })
      .then((data) => setEmailOptionEnabled(data.enabled))
      .catch(() => {
        // Ayar okunamazsa varsayilan (acik) ile devam et - kullaniciyi
        // engellemeyelim.
      });
  }, []);

  function describeError(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 400) {
        const message = (err.body as any)?.message;
        return Array.isArray(message) ? message[0] : message ?? "Girdiğin bilgiyi kontrol et.";
      }
      if (err.status === 403) {
        return "Bu numaraya mesaj gönderemezsin.";
      }
    }
    return "Mesaj gönderilemedi. Lütfen tekrar dene.";
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      // Kullanici istegi: hava durumu eklemek istediyse, gonderim
      // oncesi (izin verirse) alinir - basarisiz olursa sessizce
      // atlanir, mesaj yine de gonderilir.
      const weatherSummary = addWeather ? await fetchWeatherSummary() : undefined;

      const data = await apiFetch<{ threadId: string }>("/threads", {
        method: "POST",
        body: JSON.stringify({
          recipientPhone,
          recipientNotificationEmail: addEmail && recipientEmail ? recipientEmail : undefined,
          body,
          lockType: addQuestion ? "question" : "none",
          lockSecret: addQuestion ? lockSecret : undefined,
          questionText: addQuestion ? questionText : undefined,
          isAnonymous,
          destroyAfterRead,
          weatherSummary: weatherSummary ?? undefined,
        }),
      });
      setSentThreadId(data.threadId);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || !isAuthenticated) {
    return <main className="min-h-screen bg-mint" />;
  }

  // Gorev 11.4: Gonderim sonrasi onay ekrani.
  if (sentThreadId) {
    return (
      <main className="min-h-screen bg-mint flex items-center justify-center px-4 py-12">
        <Card lifted className="max-w-sm text-center space-y-4">
          <div className="text-5xl">🌱</div>
          <h1 className="font-display text-2xl font-bold text-slate">
            {t("mesajOlustur.sentTitle")}
          </h1>
          <p className="font-body text-sm text-slate-light">
            {recipientPhone} {t("mesajOlustur.sentDesc")}
          </p>
          <Button className="w-full" onClick={() => router.push("/mesajlarim")}>
            {t("mesajOlustur.backHome")}
          </Button>
          {/* Kullanici istegi: dugmeye basilmazsa otomatik yonlendirme
              sayaci gosterilir. */}
          <p className="font-body text-xs text-slate-light">
            {redirectSecondsLeft} saniye içinde Mesajlarım&apos;a yönlendirileceksin.
          </p>
          <button
            type="button"
            onClick={() => {
              setSentThreadId(null);
              setRecipientPhone("");
              setAddEmail(false);
              setRecipientEmail("");
              setBody("");
              setAddQuestion(false);
              setLockSecret("");
              setQuestionText("");
            }}
            className="w-full font-body text-sm text-sky underline underline-offset-2"
          >
            {t("mesajOlustur.leaveAnother")}
          </button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mint px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        {/* Kullanici istegi: ana sayfa/Havuz/Mesajlarim ile ayni sicak,
            illustrasyonlu his - forma da eklendi. */}
        <ConnectionIllustration className="mx-auto w-full max-w-[220px] h-auto" />

        <div>
          <h1 className="font-display text-2xl font-bold text-slate">
            {t("mesajOlustur.title")}
          </h1>
          <p className="font-body text-sm text-slate-light mt-1">
            {t("mesajOlustur.subtitle")}
          </p>
        </div>

        <Card lifted className="space-y-5">
          <PhoneInput
            label={t("mesajOlustur.phoneLabel")}
            value={recipientPhone}
            onChange={setRecipientPhone}
          />

          {/* Kullanici istegi: avatar+nickname, yazi alaninin USTUNDE,
              sol kosede, sanki zaten gonderilmis bir mesajmis gibi
              varsayilan olarak gorunur. Kullanici istegi: anonimken
              SADECE avatar gizlenir, nickname her zaman gorunur. */}
          <div className="flex items-center gap-1.5">
            {!isAnonymous && (
              <AvatarDisplay avatarId={myAvatarId} avatarConfig={myAvatarConfig} size={24} />
            )}
            <span className="font-body text-xs font-semibold text-slate-light">
              {myDisplayName || "İsimsiz"}
            </span>
          </div>
          <Input
            label={t("mesajOlustur.messageLabel")}
            placeholder={t("mesajOlustur.messagePlaceholder")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          {/* Kullanici istegi: tum secenekler acilir-kapanir bir
              bolumde - kapaliyken hicbir secenek gorunmez. */}
          <button
            type="button"
            onClick={() => setIsOptionsExpanded((v) => !v)}
            className="flex w-full items-center justify-between py-1"
          >
            <span className="font-body text-sm font-semibold text-slate">
              {t("common.options")}
            </span>
            <span
              className={`font-body text-slate-light transition-transform ${
                isOptionsExpanded ? "rotate-180" : ""
              }`}
            >
              ▾
            </span>
          </button>

          {isOptionsExpanded && (
            <>
              {/* Kullanici geri bildirimi: soru-cevap eklemek istege bagli.
                  Kullanici istegi: "Question" ve "Delete after read"
                  yan yana, aralarinda tam olarak 2 karakter (2ch)
                  bosluk. */}
              <div className="flex items-center" style={{ gap: "2ch" }}>
                <Toggle
                  id="add-question-toggle"
                  checked={addQuestion}
                  onChange={setAddQuestion}
                  label={t("mesajOlustur.addQuestionLabel")}
                />
                <Toggle
                  id="destroy-after-read-toggle"
                  checked={destroyAfterRead}
                  onChange={setDestroyAfterRead}
                  label={t("mesajOlustur.destroyAfterRead")}
                />
              </div>

              {addQuestion && (
                <div className="space-y-3 rounded-2xl bg-sky-light/40 p-3">
                  <Input
                    label={t("mesajOlustur.questionLabel")}
                    placeholder={t("mesajOlustur.questionPlaceholder")}
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                  />
                  <Input
                    label={t("mesajOlustur.answerLabel")}
                    placeholder={t("mesajOlustur.answerPlaceholder")}
                    value={lockSecret}
                    onChange={(e) => setLockSecret(e.target.value)}
                  />
                </div>
              )}

              {/* Gorev 11.3: Anonim/Acik kimlik toggle - kullanici istegi:
                  /ayarlar'da "her zaman goster" secilmisse bu secenek
                  hic gosterilmez. */}
              {!alwaysShowName && (
                <Toggle
                  id="anon-toggle-create"
                  checked={isAnonymous}
                  onChange={setIsAnonymous}
                  label={isAnonymous ? t("mesajOlustur.anonYes") : t("mesajOlustur.anonNo")}
                />
              )}

              {/* Kullanici istegi: mesaj yazarken anlik hava durumunu
                  (izin verirse) mesajla birlikte gonderebilme. */}
              <Toggle
                id="add-weather-toggle"
                checked={addWeather}
                onChange={setAddWeather}
                label="Hava Durumunu Ekle"
              />

              {/* Kullanici istegi: opsiyonel ek bildirim kanali - alici hala
                  telefon/OTP ile giris yapiyor, bu sadece ek bir bildirim
                  yolu (mock modda calisir, gercek e-posta saglayicisi
                  baglanana kadar). Sistem parametresiyle (yonetim paneli)
                  gorunurlugu kapatilabilir. */}
              {emailOptionEnabled && (
                <>
                  <Toggle
                    id="add-email-toggle"
                    checked={addEmail}
                    onChange={setAddEmail}
                    label={t("mesajOlustur.addEmailLabel")}
                  />

                  {addEmail && (
                    <Input
                      label={t("mesajOlustur.emailLabel")}
                      type="email"
                      placeholder="ornek@eposta.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                    />
                  )}
                </>
              )}
            </>
          )}

          {error && <p className="font-body text-sm text-coral">{error}</p>}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !recipientPhone ||
              !body ||
              (addQuestion && (!questionText || !lockSecret)) ||
              (addEmail && !recipientEmail)
            }
          >
            {isSubmitting ? t("mesajOlustur.sending") : t("mesajOlustur.sendButton")}
          </Button>
        </Card>
      </div>
    </main>
  );
}
