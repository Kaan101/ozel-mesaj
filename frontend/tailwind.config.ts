import type { Config } from "tailwindcss";

// Gorev 9.3'te tasarim sistemi (renkler, tipografi) buraya
// genisletilecek. Simdilik Tailwind'in varsayilan tema yapisi kullaniliyor.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
