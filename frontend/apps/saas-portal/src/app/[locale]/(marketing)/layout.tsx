import { Navbar } from "@shared/components/landing/Navbar";
import { Footer } from "@shared/components/landing/Footer";

/**
 * Shared shell for every marketing/informational page (home, about,
 * features, pricing, contact, support, terms, privacy) — a Next.js route
 * group (the parens don't affect the URL, so /en/about etc. are unchanged).
 *
 * Navbar/Footer used to be rendered independently inside each page.tsx, so
 * every navigation between these pages fully unmounted and remounted them —
 * and once loading.tsx was added (correctly, for the page-specific content),
 * that fallback replaced the ENTIRE tree including the header/footer, since
 * they weren't part of a persistent ancestor layout. That's what showed as
 * a "white screen" flash between pages. Here, Navbar/Footer live OUTSIDE
 * {children} — Next.js's loading.tsx (in this same folder) only wraps
 * {children} in Suspense, so the header/footer now stay mounted and visible
 * the whole time; only the page content in between swaps to its skeleton.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Navbar />
            {children}
            <Footer />
        </>
    );
}
