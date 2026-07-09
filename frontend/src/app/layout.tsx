import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouHaveMi",
  description: "Soylemek istedigin ama nasil baslayacagini bilemedigin seyi, dogru kisiye ulastiran arac.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
