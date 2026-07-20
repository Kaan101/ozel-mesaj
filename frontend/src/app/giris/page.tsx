"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { ConnectionIllustration } from "@/components/ui/ConnectionIllustration";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { AvatarId } from "@/components/ui/Avatar";
import { useLanguage } from "@/lib/language-context";

type Step = "form" | "checking" | "birthdate" | "rejected" | "avatar";

const RESEND_COOLDOWN_SECONDS = 60;
const REMEMBERED_PHONE_KEY = "remembered_phone_number";

// Kullanici istegi (revize): telefon+kod tek ekranda birlikte -
// "Giris" butonu birincil aksiyon (telefon+varsa kod ile dogrudan
// giris dener), "Kod Gonder" altta ikincil bir aksiyon. Kod, basarili
// girisden sonra ARTIK silinmiyor (backend) - kullanici "Beni
// Hatirla/Otomatik Giris" secmediyse bile ayni kodu (suresi dolana
// kadar) tekrar tekrar giris icin kullanabilir. Telefon numarasi
// localStorage'da hatirlanir, bir sonraki ziyarette otomatik doldurulur.
function GirisFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t, setLanguageFromCountry } = useLanguage();

  const [step, setStep] = useState<Step>("form");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  // Kullanici istegi: girise izin vermeden once KVKK aydinlatma metni
  // ve acik riza metni onayi zorunlu.
  const [acceptedKvkk, setAcceptedKvkk] = useState(false);
  const [acceptedConsent, setAcceptedConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarId>("genc-erkek");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  // Kullanici istegi: platform sadece 18+ icin calisir.
  const [birthDateInput, setBirthDateInput] = useState("");
  const [isSubmittingBirthDate, setIsSubmittingBirthDate] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Kullanici istegi: daha once girilmis bir telefon numarasi varsa
  // (localStorage) otomatik doldur.
  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBERED_PHONE_KEY);
    if (remembered) setPhoneNumber(remembered);
  }, []);

  // Kullanici geri bildirimi: zaten gecerli bir oturumu varsa (token
  // hala gecerliyse), /giris sayfasi tekrar form gostermemeli - dogrudan
  // hedef sayfaya (varsa ?next, yoksa ana sayfaya) yonlendirilmeli.
  useEffect(() => {
    // "avatar"/"checking" adimindaysak yonlendirmeyelim - kullanici az
    // once giris yapti (isAuthenticated true oldu) ama once avatar
    // secimini tamamlamasi gerekiyor.
    if (!authLoading && isAuthenticated && step !== "avatar" && step !== "checking" && step !== "birthdate" && step !== "rejected") {
      const next = searchParams.get("next") ?? "/";
      router.replace(next);
    }
  }, [authLoading, isAuthenticated, step, router, searchParams]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Gorev 10.3: Backend'den gelen HTTP durum koduna gore kullanici
  // dostu, Turkce hata mesajlari uretir.
  function describeError(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 429) {
        return "Çok sık istek gönderdin. Lütfen bir süre sonra tekrar dene.";
      }
      if (err.status === 423) {
        return "Çok fazla yanlış deneme yaptın. Lütfen 15 dakika sonra tekrar dene.";
      }
      if (err.status === 401) {
        return "Kod hatalı ya da süresi dolmuş. Kontrol edip tekrar dene, ya da yeni bir kod iste.";
      }
      if (err.status === 400) {
        const message = (err.body as any)?.message;
        return Array.isArray(message) ? message[0] : message ?? "Girdiğin bilgiyi kontrol et.";
      }
    }
    return "Bir şeyler ters gitti. Lütfen tekrar dene.";
  }

  const canAttempt =
    phoneNumber.trim().length >= 10 && acceptedKvkk && acceptedConsent;

  // Kullanici istegi: "Kod Gonder" artik ikincil bir aksiyon - kod
  // gerektiginde/unutulunca kullanilir, giris denemesini TETIKLEMEZ.
  async function handleSendCode() {
    setError(null);
    setInfoMessage(null);
    setIsSendingCode(true);
    try {
      const data = await apiFetch<{ mockCode?: string }>("/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({
          phoneNumber,
          kvkkConsentAccepted: acceptedKvkk,
          explicitConsentAccepted: acceptedConsent,
        }),
        skipAuth: true,
      });
      // Kullanici geri bildirimi: MOCK modda (SMS_MOCK_MODE=true) backend
      // kodu response'a ekliyor - test/gelistirme sirasinda kolaylik icin
      // otomatik dolduruyoruz. Gercek SMS modunda bu alan gelmez.
      if (data.mockCode) {
        setCode(data.mockCode);
      }
      setInfoMessage("Kod gönderildi. Telefonuna gelen kodu gir.");
      startCooldown();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIsSendingCode(false);
    }
  }

  // Kullanici istegi: birincil aksiyon - telefon + (varsa) kod ile
  // dogrudan giris dener. Kod alani bossa kullaniciyi once kod
  // istemeye yonlendirir.
  async function handleLogin() {
    setError(null);
    setInfoMessage(null);

    if (!code.trim()) {
      setError("Önce \"Kod Gönder\"e basıp telefonuna gelen kodu gir.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const data = await apiFetch<{ access_token: string; refresh_token: string }>(
        "/auth/otp/verify",
        {
          method: "POST",
          body: JSON.stringify({ phoneNumber, code, rememberMe }),
          skipAuth: true,
        }
      );
      login(data.access_token, data.refresh_token);

      // Kullanici istegi: telefon numarasini bir sonraki ziyaret icin
      // hatirla.
      localStorage.setItem(REMEMBERED_PHONE_KEY, phoneNumber);

      // Kullanici geri bildirimi (bug duzeltmesi): login() cagrisi
      // isAuthenticated'i senkron olmayan bir sekilde true yapiyor,
      // bu da asagidaki "zaten giris yapmissa yonlendir" useEffect'inin
      // - biz henuz avatar kontrolunu (GET /me) bitirmeden - hemen
      // tetiklenmesine sebep oluyordu (yaris durumu). "checking" adimina
      // gecerek bu useEffect'in devreye girmesini geçici olarak
      // engelliyoruz.
      setStep("checking");

      // Kullanici istegi: platform sadece 18+ icin calisir - dogum
      // tarihi henuz girilmemisse (ilk giris), avatar secimden ONCE
      // bu adim gosterilir.
      const profile = await apiFetch<{ avatarId: string | null; needsBirthDate: boolean }>(
        "/me"
      );
      if (profile.needsBirthDate) {
        setStep("birthdate");
        return;
      }
      if (!profile.avatarId) {
        setStep("avatar");
        return;
      }

      const next = searchParams.get("next") ?? "/";
      router.push(next);
    } catch (err) {
      setStep("form");
      setError(describeError(err));
    } finally {
      setIsLoggingIn(false);
    }
  }

  // Kullanici istegi: platform sadece 18+ icin calisir - dogum
  // tarihi gonderilir, backend yasi hesaplayip kontrol eder.
  async function handleSubmitBirthDate() {
    if (!birthDateInput) {
      setError("Lütfen doğum tarihini gir.");
      return;
    }
    setIsSubmittingBirthDate(true);
    setError(null);
    try {
      const result = await apiFetch<{ isAdult: boolean; message?: string }>(
        "/me/birthdate",
        {
          method: "POST",
          body: JSON.stringify({ birthDate: birthDateInput }),
        }
      );
      if (!result.isAdult) {
        setRejectionMessage(
          result.message ?? "Üzgünüz, bu platform sadece 18 yaş ve üzerindeki kullanıcılar içindir."
        );
        setStep("rejected");
        return;
      }

      // Yas kontrolu gecildi - simdi avatar adimina devam.
      const profile = await apiFetch<{ avatarId: string | null }>("/me");
      if (!profile.avatarId) {
        setStep("avatar");
        return;
      }
      const next = searchParams.get("next") ?? "/";
      router.push(next);
    } catch {
      setError("Bir şeyler ters gitti. Lütfen tekrar dene.");
    } finally {
      setIsSubmittingBirthDate(false);
    }
  }

  async function handleSaveAvatar() {
    setIsSavingAvatar(true);
    try {
      await apiFetch("/me", {
        method: "PATCH",
        body: JSON.stringify({ avatarId: selectedAvatarId }),
      });
      const next = searchParams.get("next") ?? "/";
      router.push(next);
    } catch {
      setError("Avatar kaydedilemedi. Lütfen tekrar dene.");
    } finally {
      setIsSavingAvatar(false);
    }
  }

  // Yonlendirme gerceklesene kadar formun bir an gorunmesini (flicker)
  // onlemek icin. Avatar/checking adimindaysak bu ekrani BOS gostermeyelim.
  if ((authLoading || isAuthenticated) && step !== "avatar" && step !== "checking" && step !== "birthdate" && step !== "rejected") {
    return <main className="min-h-screen bg-mint" />;
  }

  return (
    <main className="min-h-screen bg-mint flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <ConnectionIllustration className="w-40 h-auto mx-auto" />
          <h1 className="font-display text-2xl font-bold text-slate mt-4">
            {step === "form"
              ? t("giris.title.phone")
              : step === "checking"
                ? t("giris.title.checking")
                : t("giris.title.avatar")}
          </h1>
          <p className="font-body text-sm text-slate-light mt-1">
            {step === "form" ? t("giris.subtitle.phone") : t("giris.subtitle.avatar")}
          </p>
        </div>

        <Card lifted>
          {step === "form" ? (
            <div className="space-y-4">
              <PhoneInput
                label={t("giris.phoneLabel")}
                value={phoneNumber}
                onChange={setPhoneNumber}
                onCountryChange={setLanguageFromCountry}
              />

              {/* Kullanici istegi: kod alani her zaman gorunur - daha
                  once gonderilmis (henuz suresi dolmamis) bir kod
                  varsa dogrudan buraya girilip "Giris"e basilabilir. */}
              <div>
                <label className="font-display text-sm font-semibold text-slate">
                  {t("giris.otpLabel")}
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="1234"
                  className="mt-1.5 w-full rounded-2xl border-2 border-sky-light bg-white px-4 py-3 font-mono text-center text-2xl tracking-[0.5em] text-slate focus:outline-none focus:border-sky"
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>

              {/* Kullanici istegi: "Otomatik Giris/Beni Hatirla" -
                  isaretlenirse kod/oturum cok daha uzun sureli
                  (sistem parametresi, varsayilan 90 gun) gecerli olur. */}
              <label className="flex items-center gap-2 font-body text-sm text-slate">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-5 w-5 shrink-0 accent-sky"
                />
                Otomatik giriş yap (beni hatırla)
              </label>

              {/* Kullanici istegi: girise izin vermeden once KVKK
                  aydinlatma metni ve acik riza metni onayi zorunlu. */}
              <div className="space-y-2">
                <label className="flex items-start gap-2 font-body text-xs text-slate-light">
                  <input
                    type="checkbox"
                    checked={acceptedKvkk}
                    onChange={(e) => setAcceptedKvkk(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-sky"
                  />
                  <span>
                    {t("giris.kvkkLabel")}{" "}
                    <a
                      href="/yasal/kvkk-aydinlatma"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky underline underline-offset-2"
                    >
                      {t("giris.viewLink")}
                    </a>
                  </span>
                </label>
                <label className="flex items-start gap-2 font-body text-xs text-slate-light">
                  <input
                    type="checkbox"
                    checked={acceptedConsent}
                    onChange={(e) => setAcceptedConsent(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-sky"
                  />
                  <span>
                    {t("giris.consentLabel")}{" "}
                    <a
                      href="/yasal/acik-riza"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky underline underline-offset-2"
                    >
                      {t("giris.viewLink")}
                    </a>
                  </span>
                </label>
              </div>

              {error && <p className="font-body text-sm text-coral">{error}</p>}
              {infoMessage && !error && (
                <p className="font-body text-sm text-meadow-hover">{infoMessage}</p>
              )}

              {/* Kullanici istegi: birincil aksiyon artik "Giris". */}
              <Button
                className="w-full"
                onClick={handleLogin}
                disabled={isLoggingIn || !canAttempt}
              >
                {isLoggingIn ? t("giris.verifying") : "Giriş"}
              </Button>

              {/* Kullanici istegi: "Kod Gonder" altta ikincil bir aksiyon. */}
              <div className="text-center">
                {cooldown > 0 ? (
                  <p className="font-body text-sm text-slate-light">
                    {t("giris.resend")} ({cooldown}s)
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isSendingCode || !canAttempt}
                    className="font-body text-sm text-sky underline underline-offset-2 disabled:opacity-50"
                  >
                    {isSendingCode ? t("giris.sending") : t("giris.sendCode")}
                  </button>
                )}
              </div>
            </div>
          ) : step === "birthdate" ? (
            <div className="space-y-4">
              <p className="font-body text-sm text-slate-light text-center">
                Devam edebilmek için doğum tarihini girmen gerekiyor. Bu platform sadece 18 yaş ve
                üzerindeki kullanıcılar içindir.
              </p>
              <input
                type="date"
                value={birthDateInput}
                onChange={(e) => setBirthDateInput(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full rounded-full border-2 border-sky-light bg-white px-4 py-3 font-body text-slate focus:outline-none focus:border-sky"
              />
              {error && <p className="font-body text-sm text-coral">{error}</p>}
              <Button
                className="w-full"
                onClick={handleSubmitBirthDate}
                disabled={isSubmittingBirthDate || !birthDateInput}
              >
                {isSubmittingBirthDate ? "Kontrol ediliyor..." : "Devam Et"}
              </Button>
            </div>
          ) : step === "rejected" ? (
            <div className="space-y-4 text-center">
              <div className="text-5xl">🔒</div>
              <p className="font-body text-sm text-slate">{rejectionMessage}</p>
              <Button
                className="w-full"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              >
                Anladım
              </Button>
            </div>
          ) : step === "avatar" ? (
            <div className="space-y-4">
              <AvatarPicker value={selectedAvatarId} onChange={setSelectedAvatarId} />
              {error && <p className="font-body text-sm text-coral">{error}</p>}
              <Button className="w-full" onClick={handleSaveAvatar} disabled={isSavingAvatar}>
                {isSavingAvatar ? t("giris.saving") : t("giris.continue")}
              </Button>
            </div>
          ) : (
            <p className="font-body text-sm text-slate-light text-center py-6">{t("giris.checking")}</p>
          )}
        </Card>
      </div>
    </main>
  );
}

// useSearchParams, Next.js App Router'da bir Suspense siniri
// gerektirir - aksi halde build sirasinda hata verebilir.
export default function GirisPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-mint" />}>
      <GirisFormContent />
    </Suspense>
  );
}
