// Gorev 9.2: Minimal service worker - PWA'nin "ana ekrana ekle"
// ozelligi icin bir service worker'in kayitli olmasi gerekiyor.
// Simdilik agresif bir cache stratejisi kullanmiyoruz (API cagrilari
// gercek zamanli olmali, orn. OTP/mesajlasma) - sadece kurulum/aktivasyon
// olaylarini karsiliyoruz. Ileride offline destegi eklenmek istenirse
// buraya cache stratejisi eklenebilir.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Su an icin hicbir istegi cache'lemiyoruz - sadece PWA kurulum
  // kriterini (aktif bir service worker olmasi) karsiliyoruz.
});

// Kullanici istegi: gercek push bildirimleri - sunucudan (VAPID ile
// imzali) gelen push olayini yakalayip tarayici bildirimi olarak
// gosterir. Icerik BILEREK genel tutulur (bkz. backend
// NotificationService) - mesaj metni asla burada gorunmez.
self.addEventListener("push", (event) => {
  let data = { title: "YouHaveMi", body: "Yeni bir bildirimin var.", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // JSON degilse varsayilan metinle devam.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url },
    })
  );
});

// Bildirime tiklaninca, ilgili sayfayi (varsa acik bir sekmeyi
// odakla, yoksa yeni sekme ac) actiyor.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
