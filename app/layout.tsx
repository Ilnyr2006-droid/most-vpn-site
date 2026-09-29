import type { Metadata } from "next";
import { Geologica, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const geologica = Geologica({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "MOST — стабильное подключение",
    template: "%s — MOST",
  },
  description: "VPN для телефона и компьютера: простое подключение, три локации и поддержка.",
  openGraph: {
    title: "MOST — стабильное подключение",
    description: "VPN для телефона и компьютера: простое подключение, три локации и поддержка.",
    type: "website",
    locale: "ru_RU",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${geologica.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
