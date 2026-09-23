'use client';

import { use, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import {
    Package,
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Download,
    Upload,
    Loader2,
    FileText,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import Link from "next/link";
import {
    getProducts,
    deleteProduct,
    exportProductsCsv,
    importProductsCsv,
    ImportProductsResponse,
} from "@shared/services/productService";
import { toast } from "react-hot-toast";
import { cn } from "@shared/lib/utils";
import { imagePreset } from "@shared/lib/cloudinaryImage";

export default function StoreProductsPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const queryClient = useQueryClient();
    const t = useTranslations("merchant.products");
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
    const [exporting, setExporting] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportProductsResponse | null>(null);
    const importFileInputRef = useRef<HTMLInputElement>(null);

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
            // Keep the store overview's cached product count (React Query,
            // ['store', storeId] / ['stores']) in sync — this page's own
            // list is plain local state and refetches fine on its own, but
            // that cache has no idea a product just disappeared.
            queryClient.invalidateQueries({ queryKey: ['store', storeId] });
            queryClient.invalidateQueries({ queryKey: ['stores'] });
        } catch (error) {
            toast.error(t('deleteError'));
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const { blob, filename } = await exportProductsCsv(storeId);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export products", error);
            toast.error(t('exportError'));
        } finally {
            setExporting(false);
        }
    };

    const openImportDialog = () => {
        setImportFile(null);
        setImportResult(null);
        setImportDialogOpen(true);
    };

    const handleImportSubmit = async () => {
        if (!importFile) {
            toast.error(t('import.selectFileError'));
            return;
        }
        try {
            setImporting(true);
            const result = await importProductsCsv(storeId, importFile);
            setImportResult(result);
            if (result.summary.created > 0 || result.summary.updated > 0) {
                fetchProducts();
                queryClient.invalidateQueries({ queryKey: ['store', storeId] });
                queryClient.invalidateQueries({ queryKey: ['stores'] });
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || t('import.genericError'));
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 relative">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={handleExport}
                        disabled={exporting}
                    >
                        {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                        {t('exportCsv')}
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={openImportDialog}>
                        <Upload className="w-4 h-4 mr-2" /> {t('importCsv')}
                    </Button>
                    <Button asChild className="rounded-xl shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700">
                        <Link href={`/dashboard/stores/${storeId}/products/new`}>
                            <Plus className="w-4 h-4 mr-2" /> {t('addProduct')}
                        </Link>
                    </Button>
                </div>
            </div>

            <Card className="border shadow-md hover:shadow-xl rounded-2xl overflow-hidden transition-shadow duration-300">
                <CardHeader className="bg-muted/30 border-b space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <form onSubmit={handleSearch} className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <input
                                type="text"
                                placeholder={t('searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl border-border bg-background focus:ring-2 focus:ring-primary/20 border transition text-sm outline-none"
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
                        // Shaped like the real table below (same columns, same
                        // row layout) instead of a generic spinner — the
                        // results area fills in with real rows the instant
                        // the fetch resolves, rather than the whole section
                        // going blank-then-appearing.
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
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-lg bg-muted animate-pulse flex-shrink-0" />
                                                    <div className="space-y-2">
                                                        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                                                        <div className="h-2 w-16 rounded bg-muted animate-pulse" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><div className="h-6 w-16 rounded-full bg-muted animate-pulse" /></td>
                                            <td className="px-6 py-4"><div className="h-3 w-20 rounded bg-muted animate-pulse" /></td>
                                            <td className="px-6 py-4"><div className="h-3 w-14 rounded bg-muted animate-pulse" /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                                                    <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600">
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
                                        <tr key={product._id} className="group hover:bg-blue-50/40 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0 border">
                                                        {product.images?.[0]?.url ? (
                                                            <img src={imagePreset.thumbnail(product.images[0].url)} alt="" loading="lazy" decoding="async" width={100} height={100} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                                                <Package className="w-6 h-6" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground group-hover:text-blue-600 transition-colors">{product.name}</p>
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
                                                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600">
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

            <Dialog open={importDialogOpen} onOpenChange={(open) => { if (!importing) setImportDialogOpen(open); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('import.title')}</DialogTitle>
                        <DialogDescription>{t('import.description')}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed cursor-pointer hover:bg-blue-50/40 hover:border-blue-400 transition text-sm font-medium">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                {t('import.chooseFile')}
                                <input
                                    ref={importFileInputRef}
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="hidden"
                                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    disabled={importing}
                                />
                            </label>
                            <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {importFile ? importFile.name : t('import.noFileChosen')}
                            </span>
                        </div>

                        {importResult && (
                            <div className="space-y-2">
                                <p className="text-sm font-bold">
                                    {t('import.summary', {
                                        created: importResult.summary.created,
                                        updated: importResult.summary.updated,
                                        errors: importResult.summary.errors,
                                        total: importResult.summary.total,
                                    })}
                                </p>
                                <div className="max-h-64 overflow-y-auto rounded-xl border divide-y">
                                    {importResult.results.map((r) => (
                                        <div key={r.row} className="flex items-start gap-2 px-3 py-2 text-xs">
                                            {r.status === 'error' ? (
                                                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                            )}
                                            <div className="min-w-0">
                                                <span className="font-bold">{t('import.rowLabel', { row: r.row })}: </span>
                                                <span className={cn(r.status === 'error' ? "text-rose-600" : "text-foreground")}>
                                                    {r.message}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => setImportDialogOpen(false)}
                            disabled={importing}
                        >
                            {t('import.close')}
                        </Button>
                        <Button
                            className="rounded-xl"
                            onClick={handleImportSubmit}
                            disabled={importing || !importFile}
                        >
                            {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            {importing ? t('import.importing') : t('import.submit')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
