import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "./register-service-worker";

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
  weight: ["600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "YouHaveMi",
  description: "Soylemek istedigin ama nasil baslayacagini bilemedigin seyi, dogru kisiye ulastiran arac.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "YouHaveMi",
  },
};

export const viewport: Viewport = {
  themeColor: "#3E8EDE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${baloo.variable} ${inter.variable} ${plexMono.variable}`}>
      <body className="font-body bg-mint text-slate">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
