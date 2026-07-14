"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { ConnectionIllustration } from "@/components/ui/ConnectionIllustration";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { AvatarId } from "@/components/ui/Avatar";

type Step = "phone" | "otp" | "checking" | "avatar";

const RESEND_COOLDOWN_SECONDS = 60;

// Gorev 10.1 + 10.2 + 10.3: Telefon numarasi girisi + OTP dogrulama
// ekrani, geri sayimli "yeniden gonder" ve hata durumlari ile.
function GirisFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarId>("genc-erkek");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Kullanici geri bildirimi: zaten gecerli bir oturumu varsa (token
  // hala gecerliyse), /giris sayfasi tekrar form gostermemeli - dogrudan
  // hedef sayfaya (varsa ?next, yoksa ana sayfaya) yonlendirilmeli.
  useEffect(() => {
    // "avatar" adimindaysak yonlendirmeyelim - kullanici az once
    // giris yapti (isAuthenticated true oldu) ama once avatar
    // secimini tamamlamasi gerekiyor.
    if (!authLoading && isAuthenticated && step !== "avatar" && step !== "checking") {
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
        return "Çok sık istek gönderdin. Lütfen bir dakika sonra tekrar dene.";
      }
      if (err.status === 423) {
        return "Çok fazla yanlış deneme yaptın. Lütfen 15 dakika sonra tekrar dene.";
      }
      if (err.status === 401) {
        return "Kod hatalı ya da süresi dolmuş. Kontrol edip tekrar dene.";
      }
      if (err.status === 400) {
        const message = (err.body as any)?.message;
        return Array.isArray(message) ? message[0] : message ?? "Girdiğin bilgiyi kontrol et.";
      }
    }
    return "Bir şeyler ters gitti. Lütfen tekrar dene.";
  }

  async function handleRequestOtp() {
    setError(null);
    setIsSubmitting(true);
    try {
      const data = await apiFetch<{ mockCode?: string }>("/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ phoneNumber }),
        skipAuth: true,
      });
      // Kullanici geri bildirimi: MOCK modda (SMS_MOCK_MODE=true) backend
      // kodu response'a ekliyor - test/gelistirme sirasinda kolaylik icin
      // otomatik dolduruyoruz. Gercek SMS modunda bu alan gelmez.
      if (data.mockCode) {
        setCode(data.mockCode);
      }
      setStep("otp");
      startCooldown();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    setIsSubmitting(true);
    try {
      const data = await apiFetch<{ access_token: string; refresh_token: string }>(
        "/auth/otp/verify",
        {
          method: "POST",
          body: JSON.stringify({ phoneNumber, code }),
          skipAuth: true,
        }
      );
      login(data.access_token, data.refresh_token);
      // Kullanici geri bildirimi (bug duzeltmesi): login() cagrisi
      // isAuthenticated'i senkron olmayan bir sekilde true yapiyor,
      // bu da asagidaki "zaten giris yapmissa yonlendir" useEffect'inin
      // - biz henuz avatar kontrolunu (GET /me) bitirmeden - hemen
      // tetiklenmesine sebep oluyordu (yaris durumu). "checking" adimina
      // gecerek bu useEffect'in devreye girmesini geçici olarak
      // engelliyoruz.
      setStep("checking");

      // Kullanici geri bildirimi: giris akisinin bir parcasi olarak
      // avatar secimi - kullanicinin daha once avatar secmemis olmasi
      // durumunda (ilk giris) bu adimi gosteriyoruz.
      const profile = await apiFetch<{ avatarId: string | null }>("/me");
      if (!profile.avatarId) {
        setStep("avatar");
        return;
      }

      const next = searchParams.get("next") ?? "/";
      router.push(next);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIsSubmitting(false);
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
  // onlemek icin. Avatar adimindaysak (yeni giris yapilmis, henuz
  // avatar secilmemis) bu ekrani BOS gostermeyelim.
  if ((authLoading || isAuthenticated) && step !== "avatar" && step !== "checking") {
    return <main className="min-h-screen bg-mint" />;
  }

  return (
    <main className="min-h-screen bg-mint flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <ConnectionIllustration className="w-40 h-auto mx-auto" />
          <h1 className="font-display text-2xl font-bold text-slate mt-4">
            {step === "phone"
              ? "Hoş geldin"
              : step === "otp"
                ? "Doğrulama kodu"
                : "Kendini seç"}
          </h1>
          <p className="font-body text-sm text-slate-light mt-1">
            {step === "phone"
              ? "Devam etmek için telefon numaranı gir."
              : step === "otp"
                ? `${phoneNumber} numarasına gönderdiğimiz kodu gir.`
                : "Seni temsil edecek bir avatar seç."}
          </p>
        </div>

        <Card lifted>
          {step === "phone" ? (
            <div className="space-y-4">
              <PhoneInput
                label="Telefon Numarası"
                value={phoneNumber}
                onChange={setPhoneNumber}
              />
              {error && <p className="font-body text-sm text-coral">{error}</p>}
              <Button
                className="w-full"
                onClick={handleRequestOtp}
                disabled={isSubmitting || phoneNumber.trim().length < 10}
              >
                {isSubmitting ? "Gönderiliyor..." : "Kod Gönder"}
              </Button>
            </div>
          ) : step === "avatar" ? (
            <div className="space-y-4">
              <AvatarPicker value={selectedAvatarId} onChange={setSelectedAvatarId} />
              {error && <p className="font-body text-sm text-coral">{error}</p>}
              <Button className="w-full" onClick={handleSaveAvatar} disabled={isSavingAvatar}>
                {isSavingAvatar ? "Kaydediliyor..." : "Devam Et"}
              </Button>
            </div>
          ) : step === "checking" ? (
            <p className="font-body text-sm text-slate-light text-center py-6">Kontrol ediliyor...</p>
          ) : (
            <div className="space-y-4">
              <Input
                label="Doğrulama Kodu"
                placeholder="1234"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono text-center text-2xl tracking-[0.5em]"
                inputMode="numeric"
                maxLength={4}
                autoFocus
              />
              {error && <p className="font-body text-sm text-coral">{error}</p>}
              <Button
                className="w-full"
                onClick={handleVerifyOtp}
                disabled={isSubmitting || code.trim().length < 4}
              >
                {isSubmitting ? "Doğrulanıyor..." : "Doğrula ve Devam Et"}
              </Button>

              {/* Gorev 10.2: Geri sayimli "yeniden gonder" */}
              <div className="text-center">
                {cooldown > 0 ? (
                  <p className="font-body text-sm text-slate-light">
                    Yeniden gönder ({cooldown}s)
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={isSubmitting}
                    className="font-body text-sm text-sky underline underline-offset-2 disabled:opacity-50"
                  >
                    Kodu tekrar gönder
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError(null);
                }}
                className="w-full font-body text-xs text-slate-light underline underline-offset-2"
              >
                Numarayı değiştir
              </button>
            </div>
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
