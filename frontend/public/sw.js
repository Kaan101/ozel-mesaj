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
