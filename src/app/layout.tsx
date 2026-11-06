import type { Metadata, Viewport } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SECTOR — A different view of the race",
    template: "%s — SECTOR",
  },
  description:
    "An independent, free Formula 1 analytics project. Explore the stories behind race pace, championship battles and the finest margins.",
  applicationName: "SECTOR",
  openGraph: {
    title: "SECTOR — A different view of the race",
    description: "Independent motorsport intelligence. Built for the curious.",
    type: "website",
    locale: "en_US",
    siteName: "SECTOR",
  },
  twitter: {
    card: "summary",
    title: "SECTOR — A different view of the race",
    description: "Independent motorsport intelligence. Built for the curious.",
  },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#F2F0E9" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable}`}>
      <body id="top">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Header />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
