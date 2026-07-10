import type { Config } from "tailwindcss";

// Gorev 9.3 (revize): Tasarim sistemi token'lari. Tema: "bahar havasi,
// sosyal baglanti, iki insan arasinda sicak bir teklif" - mavi-yesil
// tonlar, ferah ve mutluluk verici bir mod. Onceki "muhurlu mektup"
// temasindan bilinçli olarak uzaklasildi (urun sahibinin talebi).
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        sky: {
          DEFAULT: "#3E8EDE", // gokyuzu mavisi - ana aksiyon rengi
          hover: "#2F76BE",
          light: "#DDEBFA",
        },
        meadow: {
          DEFAULT: "#45B78C", // cayir yesili - ikincil/basari rengi
          hover: "#379572",
          light: "#DCF3E9",
        },
        mint: {
          DEFAULT: "#F2FBF8", // acik nane - ana acik arka plan
          dark: "#E3F6EF",
        },
        sun: {
          DEFAULT: "#FFD166", // gunes sarisi - sicak, dikkat cekici vurgu
        },
        coral: {
          DEFAULT: "#F4685A", // hata/uyari rengi - lale kirmizisi tonunda
          light: "#FDE3E0",
        },
        slate: {
          DEFAULT: "#22303F", // yumusak koyu metin
          light: "#5C6B7A",
        },
      },
      fontFamily: {
        display: ["var(--font-baloo)", "sans-serif"], // yuvarlak, sicak, oyuncu basliklar
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"], // sadece OTP/kod gibi sayisal alanlar icin
      },
      borderRadius: {
        soft: "1rem", // daha yuvarlak, dostane koseler
        bubble: "1.5rem",
      },
      boxShadow: {
        soft: "0 4px 16px rgba(62, 142, 222, 0.12)",
        "soft-lifted": "0 10px 28px rgba(62, 142, 222, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
