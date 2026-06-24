import { getPublicStore, getStoreProducts } from "@shared/services/publicStoreService";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import ProductCatalog from "./ProductCatalog";
import NewsletterForm from "./NewsletterForm";

// 1. The Instant UI Skeleton
function StoreSkeleton() {
    return (
        <div className="space-y-20 animate-pulse">
            <section className="relative h-[80vh] flex items-center justify-center bg-gray-50 overflow-hidden">
                <div className="container mx-auto px-4 z-10 text-center space-y-8 flex flex-col items-center">
                    <div className="h-20 w-[80%] md:w-[60%] bg-gray-200 rounded-3xl" />
                    <div className="h-24 w-[60%] md:w-[40%] bg-gray-200 rounded-3xl" />
                    <div className="h-6 w-full md:w-[50%] bg-gray-200 rounded-full mt-8" />
                    <div className="h-16 w-48 bg-gray-200 rounded-full mt-12" />
                </div>
            </section>
            <section className="container mx-auto px-4 py-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div className="h-10 w-64 bg-gray-200 rounded-xl" />
                    <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-10 w-24 bg-gray-200 rounded-full" />
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="space-y-4">
                            <div className="aspect-[4/5] bg-gray-200 rounded-3xl" />
                            <div className="h-6 w-3/4 bg-gray-200 rounded-full" />
                            <div className="h-4 w-1/2 bg-gray-200 rounded-full" />
                            <div className="h-6 w-1/3 bg-gray-200 rounded-full" />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

// 2. The Asynchronous Data Resolution Component
async function StoreContent({ subdomain, locale }: { subdomain: string; locale: string }) {
    console.log(`[Store Page] StoreContent executing for subdomain: "${subdomain}" | locale: "${locale}"`);
    const t = await getTranslations({ locale, namespace: 'store.home' });
    let store: any = null;
    let products: any[] = [];
    let fetchError: string | null = null;

    try {
        store = await getPublicStore(subdomain);
        console.log(`[Store Page] getPublicStore returned:`, store ? `Found "${store.name}"` : 'null');
        products = await getStoreProducts(store?._id || store?.id) as any[];
        console.log(`[Store Page] getStoreProducts fetched:`, products ? `${products.length} products` : 'null/undefined');
    } catch (error: any) {
        console.error(`[Store Page] Fetch error:`, error?.message || error);
        fetchError = error.message || String(error);
    }

    // --- FORCE-RENDER DIAGNOSTIC SCREEN ON ERROR ---
    if (fetchError || !store) {
        return (
            <div className="p-12 max-w-4xl mx-auto space-y-6 bg-red-50 rounded-3xl border border-red-200 mt-20 font-mono text-xs text-red-700">
                <h1 className="text-xl font-bold">⚠️ Storefront Diagnostic Output</h1>
                <p><strong>Subdomain Queried:</strong> "{subdomain}"</p>
                <p><strong>Error Encountered:</strong> {fetchError || "Store returned null from database"}</p>
                <div>
                    <strong>Fetched Store Data Payload:</strong>
                    <pre className="p-4 bg-white rounded-xl border mt-2 overflow-auto max-h-60 text-gray-800">
                        {JSON.stringify(store, null, 2)}
                    </pre>
                </div>
            </div>
        );
    }

    const primaryColor = store.branding?.primaryColor || "#3B82F6";

    return (
        <div className="space-y-20">
            {/* Hero Section */}
            <section className="relative h-[80vh] flex items-center justify-center overflow-hidden bg-gray-50">
                <div className="container mx-auto px-4 z-10 text-center space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <div className="space-y-4">
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-tight">
                            {t('welcome')} <br />
                            <span style={{ color: primaryColor }}>{store.name}</span>
                        </h1>
                        <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto font-medium">
                            {store.description || t('newsletterSubtitle')}
                        </p>
                    </div>
                    <div>
                        <button className="store-button text-lg px-12 h-16 shadow-2xl shadow-blue-500/20">
                            {t('startShopping')}
                        </button>
                    </div>
                </div>
                <div
                    className="absolute -top-[20%] -right-[10%] w-[60%] aspect-square rounded-full opacity-10 blur-[120px]"
                    style={{ backgroundColor: primaryColor }}
                />
            </section>

            {/* Product Grid */}
            <ProductCatalog products={products} />

            {/* Newsletter Section */}
            <NewsletterForm storeId={store._id || store.id} primaryColor={primaryColor} />
        </div>
    );
}

// 3. Complete Root Page wrapper with zero-delay TTFB capabilities
export default async function StoreHome({ params }: { params: Promise<{ locale: string; subdomain: string }> }) {
    // Crucially resolved without blocking any backend DB network layer
    const { subdomain, locale } = await params;
    console.log(`[Store Page] StoreHome executing for subdomain: "${subdomain}" | locale: "${locale}"`);

    return (
        <Suspense fallback={<StoreSkeleton />}>
            <StoreContent subdomain={subdomain} locale={locale} />
        </Suspense>
    );
}
