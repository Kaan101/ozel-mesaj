"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

// Gorev 9.5 proof sayfasi: gercek OTP akisiyla giris yapip,
// AuthContext'in durumu dogru sekilde takip ettigini ve sayfa
// yenilendiginde (localStorage sayesinde) kaybolmadigini gosterir.
export default function AuthTestPage() {
  const { isAuthenticated, isLoading, login, logout } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [message, setMessage] = useState("");

  async function handleRequestOtp() {
    setMessage("Kod isteniyor...");
    try {
      await apiFetch("/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ phoneNumber }),
        skipAuth: true,
      });
      setStep("code");
      setMessage("Kod gonderildi. Backend terminalindeki [MOCK SMS] satirindan kodu al.");
    } catch (error: any) {
      setMessage(`Hata: ${error.message}`);
    }
  }

  async function handleVerifyOtp() {
    setMessage("Kod dogrulaniyor...");
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
      setMessage("Giris basarili!");
    } catch (error: any) {
      setMessage(`Hata: ${error.message}`);
    }
  }

  if (isLoading) {
    return <main className="min-h-screen bg-mint p-6">Yukleniyor...</main>;
  }

  return (
    <main className="min-h-screen bg-mint px-6 py-12">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="font-display text-2xl font-bold text-slate">
          Auth State Testi (Görev 9.5)
        </h1>

        <Card>
          <p className="font-body text-sm text-slate-light">Mevcut durum:</p>
          <p className="font-display text-lg font-bold text-slate">
            {isAuthenticated ? "✅ Giriş yapılmış" : "❌ Giriş yapılmamış"}
          </p>
        </Card>

        {!isAuthenticated ? (
          <Card>
            {step === "phone" ? (
              <div className="space-y-3">
                <Input
                  label="Telefon Numarası"
                  placeholder="+905551234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <Button onClick={handleRequestOtp}>Kod İste</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  label="Doğrulama Kodu"
                  className="font-mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <Button onClick={handleVerifyOtp}>Doğrula ve Giriş Yap</Button>
              </div>
            )}
            {message && <p className="mt-3 font-body text-sm text-slate-light">{message}</p>}
          </Card>
        ) : (
          <Card>
            <Button variant="secondary" onClick={logout}>
              Çıkış Yap
            </Button>
          </Card>
        )}

        <p className="font-body text-xs text-slate-light">
          Giriş yaptıktan sonra sayfayı yenile (F5) — &quot;Giriş yapılmış&quot; durumunun
          kaybolmadığını göreceksin.
        </p>
      </div>
    </main>
  );
}
