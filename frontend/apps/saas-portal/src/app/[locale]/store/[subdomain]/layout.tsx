// Add React cache for request deduplication
import { cache, Suspense, ReactNode } from "react";
import { getPublicStore } from "@shared/services/publicStoreService";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CartWrapper } from "./CartWrapper";
import { HeaderCart } from "@shared/components/storefront/HeaderCart";
import { VisitorTracker } from "@shared/components/storefront/VisitorTracker";
import { TrackingPixels } from "@shared/components/storefront/TrackingPixels";

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
export async function generateMetadata({ params }: { params: Promise<{ subdomain: string }> }): Promise<Metadata> {
    try {
        const { subdomain } = await params;
        const store = await getStoreCached(subdomain) as any;
        return {
            title: store.name,
            description: store.description,
            openGraph: {
                title: store.name,
                description: store.description,
                images: store.logo?.url ? [store.logo.url] : []
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

    return (
        <CartWrapper storeId={store._id}>
            <VisitorTracker storeId={store._id} />
            <TrackingPixels marketing={store.settings?.marketing} />
            <div style={{ "--primary": primaryColor, fontFamily } as any} className="min-h-screen bg-white">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;500;600;700;800;900&display=swap');
                    :root {
                        --store-primary: ${primaryColor};
                        --store-font: '${fontFamily}', sans-serif;
                    }
                    .store-button {
                        background-color: var(--store-primary);
                        color: white;
                        border-radius: 9999px;
                        padding: 12px 24px;
                        font-weight: 700;
                        transition: transform 0.2s;
                    }
                    .store-button:hover {
                        transform: scale(1.05);
                    }
                ` }} />
                
                {/* Store Header */}
                <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2">
                            {store.logo?.url ? (
                                <img src={store.logo.url} alt={store.name} className="h-8 w-auto object-contain" />
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
                        <div className="flex items-center gap-4">
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
                            <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest">© 2026 {store.name}. {t('allRightsReserved')}</p>
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
