'use client';

import { use, useEffect, useState } from "react";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function StoreProductsPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
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
            toast.error("Failed to load products");
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
        if (!confirm("Are you sure you want to delete this product?")) return;
        try {
            await deleteProduct(id);
            toast.success("Product deleted successfully");
            fetchProducts();
        } catch (error) {
            toast.error("Failed to delete product");
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Products</h1>
                    <p className="text-muted-foreground text-sm">Manage your inventory, prices and variants.</p>
                </div>
                <Button asChild className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                    <Link href={`/dashboard/stores/${storeId}/products/new`}>
                        <Plus className="w-4 h-4 mr-2" /> Add Product
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
                                placeholder="Search products by name or SKU..."
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
                                <option value="">All Status</option>
                                <option value="active">Active</option>
                                <option value="draft">Draft</option>
                                <option value="archived">Archived</option>
                            </select>
                            <Button variant="outline" size="sm" className="rounded-lg h-9" onClick={fetchProducts}>
                                <Filter className="w-4 h-4 mr-2" /> Refresh
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            <p className="text-muted-foreground animate-pulse">Fetching your catalog...</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                                <Package className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold">No products found</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                    {searchTerm || statusFilter
                                        ? "No products match your current filters. Try clearing them."
                                        : "Start by adding your first product to your store catalog."}
                                </p>
                            </div>
                            {!searchTerm && !statusFilter && (
                                <Button asChild variant="outline" className="rounded-xl border-2">
                                    <Link href={`/dashboard/stores/${storeId}/products/new`}>
                                        Create Product
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20 border-b">
                                    <tr>
                                        <th className="px-6 py-4">Product</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Inventory</th>
                                        <th className="px-6 py-4">Price</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
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
                                                    {product.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <p className={cn(
                                                        "font-medium",
                                                        product.inventory?.quantity <= 5 ? "text-rose-500" : "text-foreground"
                                                    )}>
                                                        {product.inventory?.quantity || 0} in stock
                                                    </p>
                                                    {product.inventory?.quantity <= 5 && (
                                                        <p className="text-[10px] text-rose-400 font-bold uppercase tracking-tight">Low Stock</p>
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
                            Showing <span className="text-foreground">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="text-foreground">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-foreground">{pagination.total}</span> products
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
                            <span className="text-xs font-bold px-2">Page {pagination.page} of {pagination.pages}</span>
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
