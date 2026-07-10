"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";

// Gorev 9.4 proof sayfasi: apiFetch'in gercekten backend'e ulastigini
// gostermek icin /health endpoint'ini (auth gerektirmeyen) cagirir.
export default function ApiTestPage() {
  const [result, setResult] = useState<string>("Yukleniyor...");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    apiFetch("/health", { skipAuth: true })
      .then((data) => setResult(JSON.stringify(data, null, 2)))
      .catch((error) => {
        setIsError(true);
        setResult(`Hata: ${error.message}`);
      });
  }, []);

  return (
    <main className="min-h-screen bg-mint px-6 py-12">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-2xl font-bold text-slate mb-4">
          API Client Testi (Görev 9.4)
        </h1>
        <Card>
          <p className="font-body text-sm text-slate-light mb-2">
            GET /health cevabı:
          </p>
          <pre
            className={`font-mono text-sm p-4 rounded-2xl ${
              isError ? "bg-coral-light text-coral" : "bg-meadow-light text-meadow-hover"
            }`}
          >
            {result}
          </pre>
        </Card>
      </div>
    </main>
  );
}
