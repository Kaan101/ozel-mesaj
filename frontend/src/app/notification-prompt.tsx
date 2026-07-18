"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";

const DISMISSED_KEY = "push_prompt_dismissed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Kullanici istegi: gercek tarayici push bildirimleri. Kullanici
// GIRIS YAPMISSA ve daha once izin durumu belirlenmemisse (default),
// nazik bir banner ile izin ister. Reddedilirse ya da "Simdi Degil"
// denirse bir daha (bu tarayicida) sorulmaz - rahatsiz etmemek icin.
export function NotificationPrompt() {
  const { isAuthenticated } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    if (Notification.permission === "default") {
      setShowPrompt(true);
    }
  }, [isAuthenticated]);

  async function handleAllow() {
    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShowPrompt(false);
        localStorage.setItem(DISMISSED_KEY, "1");
        return;
      }

      const { publicKey } = await apiFetch<{ publicKey: string | null }>(
        "/notifications/vapid-public-key",
        { skipAuth: true }
      );
      if (!publicKey) {
        setShowPrompt(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const json = subscription.toJSON();
      await apiFetch("/notifications/subscribe", {
        method: "POST",
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        }),
      });

      setShowPrompt(false);
    } catch (error) {
      console.error("Bildirim aboneligi basarisiz:", error);
      setShowPrompt(false);
    } finally {
      setIsSubscribing(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShowPrompt(false);
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-bubble bg-white p-4 shadow-soft-lifted border-2 border-sky-light">
      <p className="font-body text-sm text-slate">
        Yeni mesaj ve yanıtlardan haberdar olmak ister misin? Bildirimlere izin verebilirsin.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleAllow}
          disabled={isSubscribing}
          className="flex-1 rounded-full bg-sky px-4 py-2 font-body text-sm font-semibold text-white hover:bg-sky/90 disabled:opacity-50"
        >
          {isSubscribing ? "..." : "İzin Ver"}
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 rounded-full border-2 border-slate-light/40 bg-white px-4 py-2 font-body text-sm text-slate hover:bg-mint"
        >
          Şimdi Değil
        </button>
      </div>
    </div>
  );
}
