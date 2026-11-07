import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import "@/app/globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Race Center — SECTOR validation preview",
  robots: { index: false, follow: false },
};

export default function PreviewLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="container">
          <p>
            SECTOR is an independent project, unaffiliated with Formula 1, the
            FIA or any team. Validation preview uses invented data only.
          </p>
        </footer>
      </body>
    </html>
  );
}
