import { Metadata } from "next";
import Link from "next/link";
import { getProductDetails, getPublicStore, getStoreProducts } from "@shared/services/publicStoreService";
import { getProductReviews } from "@shared/services/reviewService";
import { ShoppingCart, ShieldCheck, Truck, RotateCcw, Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductActions } from "@shared/components/storefront/ProductActions";
import { ProductViewTracker } from "@shared/components/storefront/ProductViewTracker";
import { StarRating } from "@shared/components/storefront/StarRating";
import { ReviewsSection } from "@shared/components/storefront/ReviewsSection";
import { getTranslations } from "next-intl/server";
import { SocialShareButtons } from "@shared/components/storefront/SocialShareButtons";
import { imagePreset } from "@shared/lib/cloudinaryImage";

// See store/[subdomain]/layout.tsx for the full rationale.
export const revalidate = 60;

interface ProductPageProps {
    params: Promise<{
        locale: string;
        subdomain: string;
        productId: string;
    }>;
}

// Reads the merchant's per-product SEO overrides (product.seo.*) with the
// raw product name/description as the fallback — previously this ignored
// product.seo entirely, so the "Product SEO" tab in the SEO Center had no
// effect on the actual product page's <head>, search snippet, or share
// preview.
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
    try {
        const { subdomain, productId } = await params;
        const [store, product] = await Promise.all([
            getPublicStore(subdomain),
            getProductDetails(productId)
        ]) as [any, any];

        const seo = product.seo || {};
        const title = seo.title || product.name;
        const description = seo.description || product.description;
        const image = product.images?.[0]?.url;

        const baseUrl = store.domain?.customDomain && store.domain?.isVerified
            ? `https://${store.domain.customDomain}`
            : `https://${store.domain?.subdomain}.quickstore.live`;

        const allowIndexing = !seo.noindex && product.status === 'active' && store.status === 'live';

        return {
            title: `${title} | ${store.name}`,
            description,
            keywords: seo.keywords,
            robots: {
                index: allowIndexing,
                follow: !seo.nofollow,
            },
            alternates: {
                canonical: seo.canonicalUrl || `${baseUrl}/products/${product._id}`,
            },
            openGraph: {
                type: 'website',
                title,
                description,
                images: image ? [image] : []
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: image ? [image] : []
            }
        };
    } catch {
        return { title: 'Product Details' };
    }
}

export default async function ProductPage({ params }: ProductPageProps) {
    const { subdomain, productId, locale } = await params;
    const t = await getTranslations({ locale, namespace: 'store.product' });

    let product: any;
    let store: any;
    let relatedProducts: any[] = [];
    let reviewsData: { reviews: any[]; pagination: { total: number } } = { reviews: [], pagination: { total: 0 } };

    try {
        store = await getPublicStore(subdomain);
        product = await getProductDetails(productId);

        // Fetch related products (from same store, same category if possible, excluding current)
        const [allProducts, reviews] = await Promise.all([
            getStoreProducts(store._id) as Promise<any[]>,
            getProductReviews(productId).catch(() => ({ reviews: [], pagination: { total: 0 } }))
        ]);
        reviewsData = reviews as any;
        relatedProducts = allProducts
            .filter((p: any) => p._id !== productId)
            .sort((a, b) => {
                // Prioritize same category
                if (a.category === product.category && b.category !== product.category) return -1;
                if (a.category !== product.category && b.category === product.category) return 1;
                return 0;
            })
            .slice(0, 4);

    } catch (error) {
        notFound();
    }

    if (!product || !store) notFound();

    const primaryColor = store.branding?.primaryColor || "#3B82F6";

    const productSeo = product.seo || {};
    const structuredDataOverrides = productSeo.structuredData || {};
    const productBaseUrl = store.domain?.customDomain && store.domain?.isVerified
        ? `https://${store.domain.customDomain}`
        : `https://${store.domain?.subdomain}.quickstore.live`;

    // Product JSON-LD — rich search result data (price, availability,
    // brand). Respects the per-product overrides a merchant can set in the
    // SEO Center's "Product SEO" tab (brand/gtin/mpn/condition/availability),
    // falling back to real product data when they're left blank.
    const availability = structuredDataOverrides.availability
        || (product.inventory?.quantity > 0 ? 'InStock' : 'OutOfStock');
    const productSchema: Record<string, any> = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description,
        image: (product.images || []).map((img: any) => img.url),
        ...(product.sku ? { sku: product.sku } : {}),
        ...(structuredDataOverrides.gtin ? { gtin: structuredDataOverrides.gtin } : {}),
        ...(structuredDataOverrides.mpn ? { mpn: structuredDataOverrides.mpn } : {}),
        brand: {
            "@type": "Brand",
            name: structuredDataOverrides.brand || store.name
        },
        offers: {
            "@type": "Offer",
            price: product.price,
            priceCurrency: store.settings?.currency || 'EGP',
            availability: `https://schema.org/${availability}`,
            url: `${productBaseUrl}/products/${product._id}`,
            seller: {
                "@type": "Organization",
                name: store.name
            }
        }
    };

    return (
        <div className="container mx-auto px-4 py-12 md:py-20 animate-in fade-in duration-700">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
            />
            {/* Track product view for marketing pixels */}
            <ProductViewTracker product={product} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 pb-20">

                {/* Product Images */}
                <div className="space-y-6">
                    <div className="aspect-square bg-gray-100 rounded-[40px] overflow-hidden border shadow-sm group">
                        {product.images?.[0]?.url ? (
                            <img
                                src={imagePreset.detail(product.images[0].url)}
                                alt={product.name}
                                fetchPriority="high"
                                decoding="async"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <ShoppingCart size={80} />
                            </div>
                        )}
                    </div>
                    {/* Thumbnail placeholder */}
                    <div className="flex gap-4 scrollbar-hide overflow-x-auto pb-2">
                        {product.images?.map((img: any, i: number) => (
                            <div key={i} className="w-24 h-24 bg-gray-100 rounded-2xl border overflow-hidden cursor-pointer hover:border-black transition shrink-0">
                                <img src={imagePreset.thumbnail(img.url)} alt={product.name} loading="lazy" decoding="async" width={100} height={100} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Product Info */}
                <div className="flex flex-col h-full space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                                {product.category}
                            </span>
                            {product.inventory?.quantity < 10 && (
                                <span className="bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                                    {t('onlyLeft', { count: product.inventory?.quantity || 0 })}
                                </span>
                            )}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-foreground">
                            {product.name}
                        </h1>
                        {product.ratingCount > 0 && (
                            <div className="flex items-center gap-2">
                                <StarRating rating={product.ratingAverage} size={16} />
                                <span className="text-sm font-bold">{product.ratingAverage.toFixed(1)}</span>
                                <span className="text-xs text-gray-400 font-medium">({product.ratingCount} review{product.ratingCount === 1 ? '' : 's'})</span>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-gray-100" />

                    <div className="space-y-4">
                        <p className="text-gray-500 font-medium leading-relaxed">
                            {product.description || t('noDescription')}
                        </p>
                    </div>

                    {/* Quantity & Add to Cart */}
                    <ProductActions product={product} />

                    {/* Social Sharing */}
                    <SocialShareButtons store={store} product={product} />

                    <div className="h-px bg-gray-100" />

                    {/* Features/Trust badges */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                                <ShieldCheck size={20} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-tight">{t('genuineProduct')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Truck size={20} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-tight">{t('fastDelivery')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                                <RotateCcw size={20} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-tight">{t('easyReturns')}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Specifications / Features spec table — merchant-defined,
                free-form label/value pairs (see Product.features). Only
                rendered when non-empty. */}
            {Array.isArray(product.features) && product.features.length > 0 && (
                <div className="pb-20">
                    <h2 className="text-2xl font-black tracking-tight mb-6">{t('specifications')}</h2>
                    <div className="rounded-3xl border overflow-hidden divide-y max-w-2xl">
                        {product.features.map((feature: any, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-6 px-6 py-4 odd:bg-gray-50/50">
                                <span className="text-sm font-bold text-gray-500">{feature.label}</span>
                                <span className="text-sm font-bold text-foreground text-right">{feature.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Reviews Section */}
            <ReviewsSection
                productId={productId}
                storeId={store._id || store.id}
                initialReviews={reviewsData.reviews}
                total={reviewsData.pagination.total}
                ratingAverage={product.ratingAverage || 0}
                ratingCount={product.ratingCount || 0}
            />

            {/* Related Products Section */}
            {relatedProducts.length > 0 && (
                <div className="pt-20 border-t">
                    <div className="space-y-12">
                        <h2 className="text-4xl font-black tracking-tighter text-center">
                            {t('relatedProducts')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {relatedProducts.map((p: any) => (
                                <Link
                                    key={p._id}
                                    href={`/products/${p._id}`}
                                    className="group cursor-pointer space-y-4"
                                >
                                    <div className="aspect-[4/5] bg-gray-100 rounded-3xl overflow-hidden relative border shadow-sm group-hover:shadow-xl transition duration-500">
                                        {p.images?.[0]?.url ? (
                                            <img
                                                src={imagePreset.card(p.images[0].url)}
                                                alt={p.name}
                                                loading="lazy"
                                                decoding="async"
                                                width={500}
                                                height={500}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <ShoppingCart size={40} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition duration-300">
                                            <div className="w-full bg-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl">
                                                <Plus size={14} /> {t('viewDetails')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-2 space-y-1">
                                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors duration-300">{p.name}</h3>
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{p.category}</p>
                                        <p className="text-lg font-black mt-2">EGP {p.price.toLocaleString()}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
