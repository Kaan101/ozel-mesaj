// Gorev 15.5: Basit yuk/performans testi. /health endpoint'ine
// esZAMANLI 50 istek atar, basari orani ve yanit surelerini olcer.
// Kullanim: node load-test.js

const CONCURRENT_REQUESTS = 50;
const TARGET_URL = process.env.LOAD_TEST_URL || "http://localhost:4000/health";

async function sendRequest() {
  const start = Date.now();
  try {
    const res = await fetch(TARGET_URL);
    const duration = Date.now() - start;
    return { ok: res.ok, status: res.status, duration };
  } catch (err) {
    return { ok: false, status: 0, duration: Date.now() - start, error: err.message };
  }
}

async function main() {
  console.log(`${CONCURRENT_REQUESTS} esZAMANLI istek gonderiliyor: ${TARGET_URL}`);
  const start = Date.now();

  const results = await Promise.all(
    Array.from({ length: CONCURRENT_REQUESTS }, () => sendRequest())
  );

  const totalDuration = Date.now() - start;
  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.length - successCount;
  const durations = results.map((r) => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);

  console.log("\n--- SONUCLAR ---");
  console.log(`Toplam sure: ${totalDuration}ms`);
  console.log(`Basarili: ${successCount}/${results.length}`);
  console.log(`Basarisiz: ${failCount}/${results.length}`);
  console.log(`Ortalama yanit suresi: ${avgDuration.toFixed(1)}ms`);
  console.log(`En hizli: ${minDuration}ms`);
  console.log(`En yavas: ${maxDuration}ms`);

  if (failCount > 0) {
    console.log("\nBasarisiz isteklerin hatalari:");
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - Status: ${r.status}, Hata: ${r.error ?? "yok"}`));
  }
}

main();
