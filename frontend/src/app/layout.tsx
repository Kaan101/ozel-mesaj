import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "./register-service-worker";
import { AuthProvider } from "@/lib/auth-context";

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
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "YouHaveMi — Ona doğru şekilde ulaş",
    template: "%s — YouHaveMi",
  },
  description:
    "Beğendiğin birine mesaj atmak zor olabilir. YouHaveMi, kimliğini istersen gizli tutarak, doğru kişiye ulaştığından emin olarak ilk adımı atmanı sağlar.",
  keywords: ["anonim mesaj", "iletişim başlatma", "ice breaker", "tanışma", "gizli mesaj"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "YouHaveMi",
  },
  openGraph: {
    title: "YouHaveMi — Ona doğru şekilde ulaş",
    description:
      "Kimliğini istersen gizli tutarak, doğru kişiye ulaştığından emin olarak ilk adımı at.",
    type: "website",
    locale: "tr_TR",
  },
  twitter: {
    card: "summary",
    title: "YouHaveMi — Ona doğru şekilde ulaş",
    description:
      "Kimliğini istersen gizli tutarak, doğru kişiye ulaştığından emin olarak ilk adımı at.",
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
        <AuthProvider>
          {children}
          <RegisterServiceWorker />
        </AuthProvider>
      </body>
    </html>
  );
}
