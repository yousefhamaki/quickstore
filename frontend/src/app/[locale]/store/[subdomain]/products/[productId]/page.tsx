import { Metadata } from "next";
import Link from "next/link";
import { getProductDetails, getPublicStore } from "@/services/publicStoreService";
import { ShoppingCart, Heart, ShieldCheck, Truck, RotateCcw, Plus, Minus } from "lucide-react";
import { notFound } from "next/navigation";
import { ProductActions } from "@/components/storefront/ProductActions";

interface ProductPageProps {
    params: Promise<{
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
    const { subdomain, productId } = await params;

    let product: any;
    let store: any;

    try {
        store = await getPublicStore(subdomain);
        product = await getProductDetails(productId);
    } catch (error) {
        notFound();
    }

    if (!product || !store) notFound();

    const primaryColor = store.branding?.primaryColor || "#3B82F6";

    return (
        <div className="container mx-auto px-4 py-12 md:py-20 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

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
                    <div className="flex gap-4">
                        {product.images?.map((img: any, i: number) => (
                            <div key={i} className="w-24 h-24 bg-gray-100 rounded-2xl border overflow-hidden cursor-pointer hover:border-black transition-all">
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
                            {product.inventory < 10 && (
                                <span className="bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                                    Only {product.inventory} left
                                </span>
                            )}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight">
                            {product.name}
                        </h1>
                        <p className="text-3xl font-black">
                            EGP {product.price.toLocaleString()}
                        </p>
                    </div>

                    <div className="h-px bg-gray-100" />

                    <div className="space-y-4">
                        <p className="text-gray-500 font-medium leading-relaxed">
                            {product.description || "No description available for this product."}
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
                            <span className="text-xs font-bold uppercase tracking-tight">Genuine Product</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Truck size={20} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-tight">Fast Delivery</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                                <RotateCcw size={20} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-tight">Easy Returns</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Additional Sections (e.g. Related Products) can be added here */}
        </div>
    );
}
