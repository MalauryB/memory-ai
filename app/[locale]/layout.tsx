import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ThemeProvider } from "@/components/theme-provider"
import { SWRProvider } from "@/lib/swr-provider"
import { Toaster } from "@/components/ui/toaster"
import { locales } from '@/i18n/request';
import "../globals.css";

export const metadata: Metadata = {
  title: "Memo'ry planner",
  description: "Organisez votre vie - Planifiez, suivez et atteignez vos objectifs",
  generator: "v0.app",
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#141414",
}

// Générer les routes statiques pour toutes les locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Await params avant de l'utiliser
  const { locale } = await params;

  // Récupérer les messages pour la locale (next-intl récupère automatiquement la locale du contexte)
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SWRProvider>
            <NextIntlClientProvider messages={messages} locale={locale}>
              <Suspense fallback={<div>Loading...</div>}>
                {children}
                <Analytics />
              </Suspense>
              <Toaster />
            </NextIntlClientProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
