import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "./register-service-worker";

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
  themeColor: "#6B3FA0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
