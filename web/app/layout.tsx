import type { Metadata, Viewport } from "next";
import "./globals.css";
import { dafFontVariables } from "./daf-fonts";

export const metadata: Metadata = {
  title: "RabAI",
  description: "An AI Torah teacher that answers from the Orthodox mesorah and opens the sources with you, and someone to talk with about anything.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F4F6" },
    { media: "(prefers-color-scheme: dark)", color: "#11141A" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dafFontVariables}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700&family=Noto+Rashi+Hebrew:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
