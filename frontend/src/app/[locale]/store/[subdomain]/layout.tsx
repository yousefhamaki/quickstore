import { ReactNode } from "react";
import { getPublicStore } from "@/services/publicStoreService";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

interface StoreLayoutProps {
    children: ReactNode;
    params: Promise<{ locale: string; subdomain: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ subdomain: string }> }): Promise<Metadata> {
    try {
        const { subdomain } = await params;
        const store = await getPublicStore(subdomain) as any;
        return {
            title: store.name,
            description: store.description,
            openGraph: {
                title: store.name,
                description: store.description,
                images: store.logo ? [store.logo] : []
            }
        };
    } catch {
        return { title: 'Buildora' };
    }
}

import { CartWrapper } from "./CartWrapper";
import { HeaderCart } from "@/components/storefront/HeaderCart";
import { VisitorTracker } from "@/components/storefront/VisitorTracker";
import { TrackingPixels } from "@/components/storefront/TrackingPixels";

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
    const { subdomain, locale } = await params;
    const t = await getTranslations({ locale, namespace: 'store.layout' });
    let store: any;
    try {
        store = await getPublicStore(subdomain);
    } catch (error) {
        notFound();
    }

    if (!store) notFound();

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
                            {store.logo ? (
                                <img src={store.logo} alt={store.name} className="h-8 w-auto" />
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

                {/* Store Footer */}
                <footer className="bg-gray-50 border-t mt-20 p-12">
                    <div className="container mx-auto text-center space-y-6">
                        <h3 className="text-xl font-black tracking-tighter" style={{ color: primaryColor }}>{store.name}</h3>

                        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            <Link href={`/track-order`} className="hover:text-black transition-colors">{t('trackOrder')}</Link>
                            <Link href={`/contact`} className="hover:text-black transition-colors">{t('contact')}</Link>
                            <Link href={`/policies/shipping`} className="hover:text-black transition-colors">{t('shippingPolicy')}</Link>
                            <Link href={`/policies/refund`} className="hover:text-black transition-colors">{t('refundPolicy')}</Link>
                            <Link href={`/policies/privacy`} className="hover:text-black transition-colors">{t('privacyPolicy')}</Link>
                            <Link href={`/policies/terms`} className="hover:text-black transition-colors">{t('termsOfService')}</Link>
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
