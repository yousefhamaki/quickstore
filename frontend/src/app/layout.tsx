// Root layout - required by Next.js App Router
// This is intentionally minimal and delegates to [locale]/layout.tsx
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Don't add html/body here - they're in [locale]/layout.tsx
    return children;
}
