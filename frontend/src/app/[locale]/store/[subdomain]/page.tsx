import { getPublicStore, getStoreProducts } from "@/services/publicStoreService";
import { Plus, ShoppingCart, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function StoreHome({ params }: { params: Promise<{ locale: string; subdomain: string }> }) {
    const { subdomain, locale } = await params;
    const t = await getTranslations({ locale, namespace: 'store.home' });
    const store = await getPublicStore(subdomain) as any;
    const products = await getStoreProducts(store._id) as any[];

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

                {/* Decorative BG element */}
                <div
                    className="absolute -top-[20%] -right-[10%] w-[60%] aspect-square rounded-full opacity-10 blur-[120px]"
                    style={{ backgroundColor: primaryColor }}
                />
            </section>

            {/* Product Grid */}
            <section className="container mx-auto px-4 py-20 animate-in fade-in duration-1000 delay-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <h2 className="text-3xl font-black tracking-tighter">{t('ourCollection')}</h2>
                    <div className="flex flex-wrap gap-2">
                        {[{ name: t('all'), id: 'all' }, ...[...new Set(products.map(p => p.category))].map(c => ({ name: c, id: c }))].map((cat: any) => (
                            <button
                                key={cat.id}
                                className="px-6 py-2 rounded-full border text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all bg-white"
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products.length === 0 ? (
                        <div className="col-span-full py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                                <ShoppingCart size={24} />
                            </div>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">{t('emptyCatalog')}</p>
                        </div>
                    ) : (
                        products.map((product: any) => (
                            <Link
                                key={product._id}
                                href={`/products/${product._id}`}
                                className="group cursor-pointer space-y-4"
                            >
                                <div className="aspect-[4/5] bg-gray-100 rounded-3xl overflow-hidden relative border shadow-sm group-hover:shadow-xl transition-all duration-500">
                                    {product.images?.[0]?.url ? (
                                        <img
                                            src={product.images[0].url}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <ShoppingCart size={40} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                                    {/* Action button on hover */}
                                    <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                        <div className="w-full bg-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl">
                                            <Plus size={16} /> View Details
                                        </div>
                                    </div>
                                </div>
                                <div className="px-2 space-y-1">
                                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors duration-300">{product.name}</h3>
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{product.category}</p>
                                    <p className="text-lg font-black mt-2">EGP {product.price.toLocaleString()}</p>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </section>

            {/* Newsletter or Social Section */}
            <section className="container mx-auto px-4 pb-20">
                <div className="bg-black rounded-[40px] p-12 md:p-20 text-white relative overflow-hidden text-center space-y-8">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight whitespace-pre-line">
                        {t('newsletterTitle')}
                    </h2>
                    <p className="text-gray-400 font-medium text-lg max-w-lg mx-auto">
                        {t('newsletterSubtitle')}
                    </p>
                    <div className="flex flex-col md:flex-row gap-4 max-w-md mx-auto">
                        <input
                            type="email"
                            placeholder={t('emailPlaceholder')}
                            className="flex-1 bg-white/10 border-white/20 rounded-full px-6 h-14 outline-none focus:ring-2 focus:ring-white/30 transition-all font-medium"
                        />
                        <button className="bg-white text-black px-10 h-14 rounded-full font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-colors">
                            {t('subscribe')}
                        </button>
                    </div>
                    <div
                        className="absolute -bottom-[50%] -left-[10%] w-[60%] aspect-square rounded-full opacity-20 blur-[100px]"
                        style={{ backgroundColor: primaryColor }}
                    />
                </div>
            </section>
        </div>
    );
}
