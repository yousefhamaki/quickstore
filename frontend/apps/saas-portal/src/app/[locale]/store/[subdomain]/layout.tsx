// Add React cache for request deduplication
import { cache, Suspense, ReactNode } from "react";
import { getPublicStore } from "@shared/services/publicStoreService";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CartWrapper } from "./CartWrapper";
import { HeaderCart } from "@shared/components/storefront/HeaderCart";
import { HeaderAccount } from "@shared/components/storefront/HeaderAccount";
import { VisitorTracker } from "@shared/components/storefront/VisitorTracker";
import { TrackingPixels } from "@shared/components/storefront/TrackingPixels";
import { imagePreset } from "@shared/lib/cloudinaryImage";

// ISR: cache the rendered storefront shell for 60s instead of doing a full
// SSR pass (store fetch + Redis + Mongo fallback + React render) on every
// single visit. Repeat traffic within the window is served straight from
// Next's cache; the next visit after it expires triggers a background
// re-render so nobody blocks on it (stale-while-revalidate). A merchant's
// own changes (theme, products, branding) can take up to this long to
// appear to a shopper who already has the page cached — an accepted
// tradeoff for the load reduction, not a bug if a change feels "delayed".
export const revalidate = 60;

interface StoreLayoutProps {
    children: ReactNode;
    params: Promise<{ locale: string; subdomain: string }>;
}

// 1. Deduplicate the fetch natively across the Server Request Context to prevent duplicate backend HTTP calls 
// between generateMetadata and StoreLayoutContent!
const getStoreCached = cache(async (subdomain: string) => {
    return await getPublicStore(subdomain);
});

// 2. Metadata (Fundamentally halts TTFB to inject <head> strings)
//
// Reads the merchant's SEO Center "Global Settings" (store.seo.*) with the
// raw store name/description as the fallback — previously this ignored
// store.seo entirely, so nothing a merchant configured in the SEO Center
// ever reached a real page's <head>, search snippet, or share preview.
export async function generateMetadata({ params }: { params: Promise<{ subdomain: string }> }): Promise<Metadata> {
    try {
        const { subdomain } = await params;
        const store = await getStoreCached(subdomain) as any;
        const seo = store.seo || {};

        const baseUrl = store.domain?.customDomain && store.domain?.isVerified
            ? `https://${store.domain.customDomain}`
            : `https://${store.domain?.subdomain}.quickstore.live`;

        const title = seo.metaTitle || store.name;
        const description = seo.metaDescription || store.description;
        const ogImage = seo.ogImage?.url || store.logo?.url;
        // Indexing is only allowed when both the merchant opted in AND the
        // store is actually live — a draft/paused store must never be
        // indexed regardless of the toggle. robots.txt already enforces
        // this at the crawl level; this is the equivalent per-page
        // <meta name="robots"> tag, which robots.txt alone doesn't set.
        const allowIndexing = seo.allowIndexing !== false && store.status === 'live';

        return {
            title,
            description,
            keywords: seo.keywords,
            manifest: '/manifest.json',
            appleWebApp: {
                capable: true,
                statusBarStyle: 'default',
                title: store.name,
            },
            robots: {
                index: allowIndexing,
                follow: allowIndexing,
            },
            alternates: {
                canonical: baseUrl,
            },
            openGraph: {
                type: (seo.ogType as any) || 'website',
                title,
                description,
                siteName: store.name,
                images: ogImage ? [ogImage] : [],
            },
            twitter: {
                card: (seo.twitterCard as any) || 'summary_large_image',
                site: seo.twitterUsername,
                title,
                description,
                images: ogImage ? [ogImage] : [],
            },
            icons: {
                icon: store.favicon?.url || '/favicon.ico',
                apple: store.logo?.url || '/apple-touch-icon.png',
            }
        };
    } catch {
        return { title: 'Buildora' };
    }
}

// 3. Isolated Heavy Layout Content
async function StoreLayoutContent({ children, subdomain, locale }: { children: ReactNode; subdomain: string; locale: string }) {
    const t = await getTranslations({ locale, namespace: 'store.layout' });
    let store: any;
    
    console.log(`[Store Layout] Fetching store for subdomain: "${subdomain}" | API URL: "${process.env.NEXT_PUBLIC_API_URL}"`);
    
    try {
        store = await getStoreCached(subdomain);
        console.log(`[Store Layout] Fetch result: ${store ? `Found store "${store.name}" (id: ${store._id || store.id})` : 'null/undefined'}`);
    } catch (error: any) {
        console.error(`[Store Layout] Fetch FAILED for "${subdomain}":`, error?.message || error, error?.response?.status, error?.response?.data);
        notFound();
    }
    if (!store) {
        console.error(`[Store Layout] Store is null/undefined for "${subdomain}" — calling notFound()`);
        notFound();
    }

    const branding = store.branding || {};
    const primaryColor = branding.primaryColor || "#3B82F6";
    const fontFamily = branding.fontFamily || "Inter";

    const customizations = store.theme?.customizations || {};
    const buttonRadiusMap: Record<string, string> = { sharp: '6px', soft: '16px', pill: '9999px' };
    const buttonRadius = buttonRadiusMap[customizations.buttonRadius] || buttonRadiusMap.pill;
    const announcementBar = customizations.announcementBar;
    const footerCopyright = customizations.footer?.copyrightText;

    const seoBaseUrl = store.domain?.customDomain && store.domain?.isVerified
        ? `https://${store.domain.customDomain}`
        : `https://${store.domain?.subdomain}.quickstore.live`;

    // Organization JSON-LD — sitewide structured data for rich search
    // results (the storefront had none of this before). Product-level
    // structured data lives on the product page itself.
    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: store.name,
        url: seoBaseUrl,
        ...(store.logo?.url ? { logo: store.logo.url } : {}),
        ...(store.contact?.email || store.contact?.phone
            ? {
                contactPoint: {
                    "@type": "ContactPoint",
                    ...(store.contact?.phone ? { telephone: store.contact.phone } : {}),
                    ...(store.contact?.email ? { email: store.contact.email } : {}),
                    contactType: "customer service"
                }
            }
            : {})
    };

    return (
        <CartWrapper storeId={store._id}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <VisitorTracker storeId={store._id} />
            <TrackingPixels marketing={store.settings?.marketing} />
            <div style={{ "--primary": primaryColor, fontFamily } as any} className="min-h-screen bg-white">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;500;600;700;800;900&display=swap');
                    :root {
                        --store-primary: ${primaryColor};
                        --store-font: '${fontFamily}', sans-serif;
                        --store-button-radius: ${buttonRadius};
                    }
                    .store-button {
                        background-color: var(--store-primary);
                        color: white;
                        border-radius: var(--store-button-radius);
                        padding: 12px 24px;
                        font-weight: 700;
                        transition: transform 0.2s;
                    }
                    .store-button:hover {
                        transform: scale(1.05);
                    }
                ` }} />

                {/* Announcement Bar — merchant-configurable, see settings/theme */}
                {announcementBar?.enabled && announcementBar?.text && (
                    <div
                        className="w-full text-center py-2.5 px-4 text-[11px] font-bold uppercase tracking-widest"
                        style={{
                            backgroundColor: announcementBar.backgroundColor || primaryColor,
                            color: announcementBar.textColor || '#ffffff'
                        }}
                    >
                        {announcementBar.text}
                    </div>
                )}

                {/* Store Header */}
                <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2">
                            {store.logo?.url ? (
                                <img src={imagePreset.logo(store.logo.url)} alt={store.name} fetchPriority="high" decoding="async" className="h-8 w-auto object-contain" />
                            ) : (
                                <span className="text-xl font-black tracking-tighter" style={{ color: primaryColor }}>
                                    {store.name.toUpperCase()}
                                </span>
                            )}
                        </Link>
                        <nav className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <Link href="/" className="hover:text-black transition-colors">{t('shop')}</Link>
                            <Link href="/track-order" className="hover:text-black transition-colors">{t('trackOrder')}</Link>
                            <Link href="/contact" className="hover:text-black transition-colors">{t('contact')}</Link>
                        </nav>
                        <div className="flex items-center gap-1">
                            <HeaderAccount />
                            <HeaderCart />
                        </div>
                    </div>
                </header>

                <main>{children}</main>

                <footer className="bg-gray-50 border-t mt-20 p-12">
                    <div className="container mx-auto text-center space-y-6">
                        <h3 className="text-xl font-black tracking-tighter" style={{ color: primaryColor }}>{store.name}</h3>

                        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            <Link href="/track-order" className="hover:text-black transition-colors">{t('trackOrder')}</Link>
                            <Link href="/contact" className="hover:text-black transition-colors">{t('contact')}</Link>
                            <Link href="/policies/shipping" className="hover:text-black transition-colors">{t('shippingPolicy')}</Link>
                            <Link href="/policies/refund" className="hover:text-black transition-colors">{t('refundPolicy')}</Link>
                            <Link href="/policies/privacy" className="hover:text-black transition-colors">{t('privacyPolicy')}</Link>
                            <Link href="/policies/terms" className="hover:text-black transition-colors">{t('termsOfService')}</Link>
                        </nav>
                        <div className="pt-4 space-y-2">
                            <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest">
                                {footerCopyright || `© ${new Date().getFullYear()} ${store.name}. ${t('allRightsReserved')}`}
                            </p>
                            <div className="flex justify-center gap-4 text-gray-500">
                                <span className="text-[10px] font-black opacity-50">{t('poweredBy')}</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </CartWrapper>
    );
}

// 4. The Non-Blocking Root Component Shell wrapper
export default async function StoreLayout({ children, params }: StoreLayoutProps) {
    const { subdomain, locale } = await params;
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 animate-pulse" />}>
            <StoreLayoutContent subdomain={subdomain} locale={locale}>
                {children}
            </StoreLayoutContent>
        </Suspense>
    );
}
