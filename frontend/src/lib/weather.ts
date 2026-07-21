// Kullanici istegi: mesaj yazarken (izin verirse) anlik hava durumunu
// mesajla birlikte gonderebilme. Open-Meteo kullanilir - ucretsiz,
// API anahtari gerektirmez, konum SADECE tarayicida kullanilir,
// backend'e asla ham koordinat gonderilmez - sadece kisa bir ozet
// metin ("22°C, Açık" gibi).

// Kullanici istegi (gizlilik): sadece bir OZET metin uretilir, ham
// enlem/boylam hicbir zaman saklanmaz ya da backend'e gonderilmez.
const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "Açık",
  1: "Az Bulutlu",
  2: "Parçalı Bulutlu",
  3: "Kapalı",
  45: "Sisli",
  48: "Kırağı Sisi",
  51: "Hafif Çisenti",
  53: "Çisenti",
  55: "Yoğun Çisenti",
  61: "Hafif Yağmurlu",
  63: "Yağmurlu",
  65: "Şiddetli Yağmurlu",
  71: "Hafif Kar Yağışlı",
  73: "Kar Yağışlı",
  75: "Yoğun Kar Yağışlı",
  80: "Sağanak Yağışlı",
  81: "Kuvvetli Sağanak",
  82: "Şiddetli Sağanak",
  95: "Gök Gürültülü Fırtına",
};

function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 65) return "🌧️";
  if (code <= 75) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

// Kullanici istegi: konumdan (izin varsa) anlik hava durumu ozeti
// getirir - basarisiz olursa (izin yok, servis erisilemez vb.) null
// doner, mesaj gonderimini ENGELLEMEZ.
export async function fetchWeatherSummary(): Promise<string | null> {
  if (typeof window === "undefined" || !navigator.geolocation) return null;

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 8000,
        maximumAge: 10 * 60 * 1000, // 10 dk - ayni konum icin tekrar tekrar sormasin
      });
    });

    const { latitude, longitude } = position.coords;
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );
    if (!res.ok) return null;

    const data = await res.json();
    const temp = Math.round(data?.current_weather?.temperature);
    const code = data?.current_weather?.weathercode;
    if (typeof temp !== "number" || isNaN(temp)) return null;

    const label = WEATHER_CODE_LABELS[code] ?? "";
    const emoji = weatherEmoji(code ?? 0);
    return `${emoji} ${temp}°C${label ? ", " + label : ""}`;
  } catch {
    return null; // Izin reddedildi, zaman asimi vb. - sessizce vazgec.
  }
}
