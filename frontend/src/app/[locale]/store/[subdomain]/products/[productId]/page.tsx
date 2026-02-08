import { Metadata } from "next";
import Link from "next/link";
import { getProductDetails, getPublicStore, getStoreProducts } from "@/services/publicStoreService";
import { ShoppingCart, Heart, ShieldCheck, Truck, RotateCcw, Plus, Minus } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductActions } from "@/components/storefront/ProductActions";
import { ProductViewTracker } from "@/components/storefront/ProductViewTracker";
import { getTranslations } from "next-intl/server";

interface ProductPageProps {
    params: Promise<{
        locale: string;
        subdomain: string;
        productId: string;
    }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
    try {
        const { subdomain, productId } = await params;
        const [store, product] = await Promise.all([
            getPublicStore(subdomain),
            getProductDetails(productId)
        ]) as [any, any];

        return {
            title: `${product.name} | ${store.name}`,
            description: product.description,
            openGraph: {
                title: product.name,
                description: product.description,
                images: product.images?.[0]?.url ? [product.images[0].url] : []
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

    try {
        store = await getPublicStore(subdomain);
        product = await getProductDetails(productId);

        // Fetch related products (from same store, same category if possible, excluding current)
        const allProducts = await getStoreProducts(store._id) as any[];
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

    return (
        <div className="container mx-auto px-4 py-12 md:py-20 animate-in fade-in duration-700">
            {/* Track product view for marketing pixels */}
            <ProductViewTracker product={product} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 pb-20">

                {/* Product Images */}
                <div className="space-y-6">
                    <div className="aspect-square bg-gray-100 rounded-[40px] overflow-hidden border shadow-sm group">
                        {product.images?.[0]?.url ? (
                            <img
                                src={product.images[0].url}
                                alt={product.name}
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
                            <div key={i} className="w-24 h-24 bg-gray-100 rounded-2xl border overflow-hidden cursor-pointer hover:border-black transition-all shrink-0">
                                <img src={img.url} alt={product.name} className="w-full h-full object-cover" />
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
                        <p className="text-3xl font-black">
                            EGP {product.price.toLocaleString()}
                        </p>
                    </div>

                    <div className="h-px bg-gray-100" />

                    <div className="space-y-4">
                        <p className="text-gray-500 font-medium leading-relaxed">
                            {product.description || t('noDescription')}
                        </p>
                    </div>

                    {/* Quantity & Add to Cart */}
                    <ProductActions product={product} />

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
                                    <div className="aspect-[4/5] bg-gray-100 rounded-3xl overflow-hidden relative border shadow-sm group-hover:shadow-xl transition-all duration-500">
                                        {p.images?.[0]?.url ? (
                                            <img
                                                src={p.images[0].url}
                                                alt={p.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <ShoppingCart size={40} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
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
