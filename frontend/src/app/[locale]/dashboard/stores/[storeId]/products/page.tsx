'use client';

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Package,
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    MoreHorizontal,
    ExternalLink
} from "lucide-react";
import Link from "next/link";
import { getProducts, deleteProduct } from "@/services/productService";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function StoreProductsPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const t = useTranslations("merchant.products");
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await getProducts({
                page: pagination.page,
                limit: pagination.limit,
                search: searchTerm || undefined,
                status: statusFilter || undefined,
                storeId: storeId // Multi-store support
            }) as any;
            setProducts(data.products || []);
            setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
        } catch (error) {
            console.error("Failed to fetch products", error);
            toast.error(t('loadError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [pagination.page, statusFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchProducts();
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return;
        try {
            await deleteProduct(id);
            toast.success(t('deleteSuccess'));
            fetchProducts();
        } catch (error) {
            toast.error(t('deleteError'));
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
                </div>
                <Button asChild className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                    <Link href={`/dashboard/stores/${storeId}/products/new`}>
                        <Plus className="w-4 h-4 mr-2" /> {t('addProduct')}
                    </Link>
                </Button>
            </div>

            <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <form onSubmit={handleSearch} className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <input
                                type="text"
                                placeholder={t('searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl border-border bg-background focus:ring-2 focus:ring-primary/20 border transition-all text-sm outline-none"
                            />
                        </form>
                        <div className="flex items-center gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-9 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="">{t('allStatus')}</option>
                                <option value="active">{t('status.active')}</option>
                                <option value="draft">{t('status.draft')}</option>
                                <option value="archived">{t('status.archived')}</option>
                            </select>
                            <Button variant="outline" size="sm" className="rounded-lg h-9" onClick={fetchProducts}>
                                <Filter className="w-4 h-4 mr-2" /> {t('refresh')}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            <p className="text-muted-foreground animate-pulse">{t('loading')}</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                                <Package className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold">{t('empty.title')}</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                    {searchTerm || statusFilter
                                        ? t('empty.filterResults')
                                        : t('empty.getStarted')}
                                </p>
                            </div>
                            {!searchTerm && !statusFilter && (
                                <Button asChild variant="outline" className="rounded-xl border-2">
                                    <Link href={`/dashboard/stores/${storeId}/products/new`}>
                                        {t('empty.createBtn')}
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20 border-b">
                                    <tr>
                                        <th className="px-6 py-4">{t('table.product')}</th>
                                        <th className="px-6 py-4">{t('table.status')}</th>
                                        <th className="px-6 py-4">{t('table.inventory')}</th>
                                        <th className="px-6 py-4">{t('table.price')}</th>
                                        <th className="px-6 py-4 text-right">{t('table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {products.map((product) => (
                                        <tr key={product._id} className="group hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0 border">
                                                        {product.images?.[0]?.url ? (
                                                            <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                                                <Package className="w-6 h-6" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground group-hover:text-primary transition-colors">{product.name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono">{product.sku || 'NO-SKU'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge className={cn(
                                                    "capitalize",
                                                    product.status === 'active' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                                        product.status === 'draft' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                                            "bg-muted text-muted-foreground"
                                                )}>
                                                    {t(`status.${product.status}`)}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <p className={cn(
                                                        "font-medium",
                                                        product.inventory?.quantity <= 5 ? "text-rose-500" : "text-foreground"
                                                    )}>
                                                        {t('table.inStock', { count: product.inventory?.quantity || 0 })}
                                                    </p>
                                                    {product.inventory?.quantity <= 5 && (
                                                        <p className="text-[10px] text-rose-400 font-bold uppercase tracking-tight">{t('table.lowStock')}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold">{product.price.toLocaleString()} EGP</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                                                        <Link href={`/dashboard/stores/${storeId}/products/${product._id}`}>
                                                            <Edit className="w-4 h-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg hover:bg-rose-50 hover:text-rose-500"
                                                        onClick={() => handleDelete(product._id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="p-4 border-t bg-muted/5 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-medium">
                            {t('pagination.showing', {
                                start: (pagination.page - 1) * pagination.limit + 1,
                                end: Math.min(pagination.page * pagination.limit, pagination.total),
                                total: pagination.total
                            })}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                disabled={pagination.page === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-xs font-bold px-2">{t('pagination.page', { current: pagination.page, total: pagination.pages })}</span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                disabled={pagination.page === pagination.pages}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
