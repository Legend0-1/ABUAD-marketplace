import type { Metadata } from "next";
import { Inter, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "UNI MART — Campus Commerce, Reimagined",
  description: "Verified ABUAD student-only marketplace. Buy and sell food, gadgets, clothes, services and more on a safe, moderated platform.",
  keywords: ["ABUAD", "marketplace", "students", "ecommerce", "Nigeria", "Afe Babalola University"],
  authors: [{ name: "UNI MART" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UNI MART",
  },
  openGraph: {
    title: "UNI MART",
    description: "Verified ABUAD student-only marketplace.",
    siteName: "UNI MART",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#153B3D",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${plexMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="top-right" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
