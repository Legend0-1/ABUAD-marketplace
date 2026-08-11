import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ABUAD Marketplace — Campus Commerce, Reimagined",
  description: "Verified ABUAD student-only marketplace. Buy and sell food, gadgets, clothes, services and more on a safe, moderated platform.",
  keywords: ["ABUAD", "marketplace", "students", "ecommerce", "Nigeria", "Afe Babalola University"],
  authors: [{ name: "ABUAD Marketplace" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "ABUAD Marketplace",
    description: "Verified ABUAD student-only marketplace.",
    siteName: "ABUAD Marketplace",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </body>
    </html>
  );
}
