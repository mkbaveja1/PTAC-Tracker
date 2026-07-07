import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AppHeader } from "@/components/layout/app-header";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PTAC Pro Tracker Console",
  description: "Hampton Inn PTAC inventory, custody, and maintenance tracker",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <Providers>
          <AppHeader />
          <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
