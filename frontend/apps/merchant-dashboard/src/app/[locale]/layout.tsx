import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import { notFound } from 'next/navigation';
import "./globals.css";
import { AuthProvider } from "@shared/context/AuthContext";
import { Providers } from "./providers";
import { routing } from '@shared/i18n/routing';
import { IntlProvider } from "@shared/components/IntlProvider";
import { getMessages } from 'next-intl/server';
import { ChatbotWidget } from "@shared/components/chat/ChatbotWidget";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter', display: 'swap' });
const cairo = Cairo({ subsets: ["arabic", "latin"], variable: '--font-cairo', display: 'swap' });

export const metadata: Metadata = {
  title: "Buildora - Multi-Store E-commerce Platform",
  description: "Create and manage multiple online stores from one dashboard",
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

// Generate static params for all supported locales
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Load translations on the server side
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <head>
        <link rel="preconnect" href="https://images.simplycodes.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.simplycodes.com" />
      </head>
      <body className={`${inter.variable} ${cairo.variable} ${locale === 'ar' ? 'font-cairo' : 'font-inter'}`}>
        <IntlProvider locale={locale} messages={messages}>
          <AuthProvider>
            <Providers>
              <main className="flex-grow flex flex-col min-h-screen relative w-full h-full">
                {children}
              </main>
              <ChatbotWidget />
            </Providers>
          </AuthProvider>
        </IntlProvider>
      </body>
    </html>
  );
}
