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
  description: "Verified university student-only marketplace. Buy and sell gadgets, clothes, services and more on a safe, moderated platform.",
  keywords: ["marketplace", "students", "ecommerce", "Nigeria", "campus"],
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
    description: "Verified university student-only marketplace.",
    siteName: "UNI MART",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#0b1220",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${plexMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {/* Apply the saved theme before paint to avoid a flash. Reads the
            persisted zustand store (localStorage key "unimart-storage"); if the
            user picked light last time, swap the html class synchronously.
            Defaults to dark (the class already on <html>) on any error. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var raw = localStorage.getItem('unimart-storage');
                var theme = raw && JSON.parse(raw).state && JSON.parse(raw).state.theme;
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                }
              } catch (e) {}
            `,
          }}
        />
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
