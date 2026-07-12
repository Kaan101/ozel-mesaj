"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken, setTokens } from "@/lib/token-storage";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// Gorev 10.4 proof sayfasi: access token'i bilerek bozup, korumali bir
// endpoint'e istek atarak apiFetch'in 401 aldiginda otomatik olarak
// refresh token ile yeni bir access token alip istegi sessizce
// tekrarladigini kanitlar (Bolum 8, "Neden JWT + refresh token").
export default function TokenRefreshTestPage() {
  const { isAuthenticated } = useAuth();
  const [log, setLog] = useState<string[]>([]);

  function addLog(line: string) {
    setLog((prev) => [...prev, line]);
  }

  function corruptAccessToken() {
    setTokens("gecersiz-bozuk-token-" + Date.now());
    addLog("Access token bilerek bozuldu (refresh token dokunulmadi).");
  }

  async function callProtectedEndpoint() {
    addLog(`Su anki access token: ${getAccessToken()?.slice(0, 20)}...`);
    addLog("GET /auth/whoami cagriliyor...");
    try {
      const data = await apiFetch<{ userId: string }>("/auth/whoami");
      addLog(`BASARILI: ${JSON.stringify(data)}`);
      addLog(`Yeni access token: ${getAccessToken()?.slice(0, 20)}... (degisti mi kontrol et)`);
    } catch (error: any) {
      addLog(`HATA: ${error.message}`);
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-mint p-6">
        <p className="font-body text-slate">
          Once <a href="/giris" className="text-sky underline">giriş yap</a>, sonra bu sayfaya dön.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mint px-6 py-12">
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="font-display text-2xl font-bold text-slate">
          Token Yenileme Testi (Görev 10.4)
        </h1>

        <Card>
          <div className="flex flex-col gap-3">
            <Button variant="secondary" onClick={corruptAccessToken}>
              1. Access Token&apos;ı Bilerek Boz
            </Button>
            <Button onClick={callProtectedEndpoint}>
              2. Korumalı Endpoint&apos;i Çağır (/auth/whoami)
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-sm font-bold text-slate mb-2">Log</h2>
          <div className="font-mono text-xs text-slate-light space-y-1 max-h-96 overflow-auto">
            {log.length === 0 && <p>Henüz işlem yapılmadı.</p>}
            {log.map((line, i) => (
              <p key={i}>→ {line}</p>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
