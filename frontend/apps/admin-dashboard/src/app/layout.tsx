import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuickStore SaaS Admin Portal",
  description: "Enterprise management control plane for QuickStore.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark bg-slate-950 text-slate-50 antialiased">
      <body className="h-full min-h-screen bg-slate-950 text-slate-50 flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
