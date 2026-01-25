import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Providers } from "./providers";
import { IntlProvider } from "@/components/IntlProvider";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const cairo = Cairo({ subsets: ["arabic", "latin"], variable: '--font-cairo' });

export const metadata: Metadata = {
  title: "Buildora - Multi-Store E-commerce Platform",
  description: "Create and manage multiple online stores from one dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cairo.variable} font-inter`}>
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
