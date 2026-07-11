import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "YouHaveMi havuz sorusu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Gorev 12.5: Sosyal medya paylasim karti icin dinamik OG gorseli.
// Next.js'in ImageResponse API'siyle, soru basligini/kategorisini
// iceren bir gorsel anlik olarak uretilir (Bolum 11).
export default async function OpengraphImage({ params }: { params: { id: string } }) {
  let title = "YouHaveMi";
  let category: string | null = null;

  try {
    const res = await fetch(`${API_BASE_URL}/pool/entries/${params.id}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      title = data.title;
      category = data.category;
    }
  } catch {
    // Varsayilan degerlerle devam edilir.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #F2FBF8 0%, #DDEBFA 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {category && (
          <div
            style={{
              background: "#45B78C",
              color: "white",
              padding: "10px 28px",
              borderRadius: 999,
              fontSize: 28,
              marginBottom: 24,
            }}
          >
            {category}
          </div>
        )}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#22303F",
            textAlign: "center",
            padding: "0 80px",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 32, color: "#3E8EDE", marginTop: 32, fontWeight: 600 }}>
          YouHaveMi — Bu soruyu cevaplayabilir misin?
        </div>
      </div>
    ),
    { ...size }
  );
}
