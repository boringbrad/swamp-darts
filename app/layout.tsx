import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "./contexts/AppContext";
import { PlayerProvider } from "./contexts/PlayerContext";
import { AuthProvider } from "./contexts/AuthContext";
import { SessionProvider } from "./contexts/SessionContext";
import { VenueProvider } from "./contexts/VenueContext";
import PWARegister from "./components/PWARegister";
import GoogleAnalytics from "./components/GoogleAnalytics";
import MobileOrientationLock from "./components/MobileOrientationLock";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Swamp Darts",
  description: "Professional dart scoring app with Cricket, Golf, and custom game modes",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a1a1a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        <PWARegister />
        <MobileOrientationLock />
        <AuthProvider>
          <AppProvider>
            <PlayerProvider>
              <SessionProvider>
                <VenueProvider>
                  {children}
                </VenueProvider>
              </SessionProvider>
            </PlayerProvider>
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
