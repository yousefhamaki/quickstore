import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import { notFound } from 'next/navigation';
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Providers } from "./providers";
import { routing } from '@/i18n/routing';
import { IntlProvider } from "@/components/IntlProvider";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const cairo = Cairo({ subsets: ["arabic", "latin"], variable: '--font-cairo' });

export const metadata: Metadata = {
  title: "Buildora - Multi-Store E-commerce Platform",
  description: "Create and manage multiple online stores from one dashboard",
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

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body className={`${inter.variable} ${cairo.variable} ${locale === 'ar' ? 'font-cairo' : 'font-inter'}`}>
        <IntlProvider>
          <AuthProvider>
            <Providers>
              {children}
            </Providers>
          </AuthProvider>
        </IntlProvider>
      </body>
    </html>
  );
}
