'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { getProducts, deleteProduct, getCategories, bulkUpdateStatus } from '@/services/productService';
import { toast } from 'react-hot-toast';

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [stockFilter, setStockFilter] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await getProducts({
                page: pagination.page,
                limit: pagination.limit,
                status: statusFilter || undefined,
                category: categoryFilter || undefined,
                search: searchTerm || undefined,
                stockLevel: stockFilter as any || undefined
            });
            setProducts((data as any).products || []);
            setPagination((data as any).pagination || { page: 1, limit: 20, total: 0, pages: 0 });
        } catch (error) {
            console.error('Failed to fetch products', error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const cats = await getCategories();
            setCategories(cats as string[]);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [pagination.page, statusFilter, categoryFilter, stockFilter]);

    const handleSearch = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchProducts();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            await deleteProduct(id);
            fetchProducts();
            toast.success('Product deleted');
        } catch (error) {
            console.error('Failed to delete product', error);
            toast.error('Failed to delete product');
        }
    };

    const handleBulkUpdate = async (status: string) => {
        if (selectedProducts.length === 0) {
            toast.error('Please select products first');
            return;
        }

        try {
            await bulkUpdateStatus(selectedProducts, status);
            setSelectedProducts([]);
            fetchProducts();
            toast.success(`${selectedProducts.length} products updated`);
        } catch (error) {
            console.error('Failed to update products', error);
            toast.error('Failed to update products');
        }
    };

    const toggleProductSelection = (id: string) => {
        setSelectedProducts(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedProducts.length === products.length) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(products.map(p => p._id));
        }
    };

    if (loading && products.length === 0) return <div className="p-8 text-center text-xl font-medium">Loading products...</div>;

    return (
        <div className="p-8 space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900">Products</h1>
                    <p className="text-gray-500 font-medium mt-1">Manage your store inventory ({pagination.total} total)</p>
                </div>
                <Link href="/merchant/products/new">
                    <Button className="bg-blue-600 hover:bg-blue-700 rounded-full px-6 font-bold shadow-lg shadow-blue-200">
                        <Plus className="w-5 h-5 mr-2" /> Add Product
                    </Button>
                </Link>
            </header>

            <Card className="shadow-xl border-0 overflow-hidden glass">
                <CardHeader className="bg-white/50 border-b px-8 py-6 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by name or SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 border transition-all"
                            />
                        </div>
                        <Button onClick={handleSearch} className="rounded-xl">
                            <Search className="w-4 h-4 mr-2" /> Search
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="draft">Draft</option>
                            <option value="archived">Archived</option>
                        </select>

                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        <select
                            value={stockFilter}
                            onChange={(e) => setStockFilter(e.target.value)}
                            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                        >
                            <option value="">All Stock Levels</option>
                            <option value="low">Low Stock</option>
                            <option value="out">Out of Stock</option>
                        </select>

                        {(statusFilter || categoryFilter || stockFilter) && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setStatusFilter('');
                                    setCategoryFilter('');
                                    setStockFilter('');
                                }}
                                className="text-sm"
                            >
                                Clear Filters
                            </Button>
                        )}
                    </div>

                    {selectedProducts.length > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                            <span className="text-sm font-medium">{selectedProducts.length} selected</span>
                            <Button size="sm" onClick={() => handleBulkUpdate('active')} variant="outline">
                                Mark Active
                            </Button>
                            <Button size="sm" onClick={() => handleBulkUpdate('draft')} variant="outline">
                                Mark Draft
                            </Button>
                            <Button size="sm" onClick={() => handleBulkUpdate('archived')} variant="outline">
                                Archive
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {products.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">No products found</h3>
                            <p className="mt-1">Try adjusting your filters or add a new product.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50/50 border-b">
                                        <tr>
                                            <th className="px-8 py-4 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProducts.length === products.length}
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-gray-300"
                                                />
                                            </th>
                                            <th className="px-8 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                                            <th className="px-8 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-8 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-8 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Inventory</th>
                                            <th className="px-8 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                                            <th className="px-8 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {products.map((product) => (
                                            <tr key={product._id} className="group hover:bg-blue-50/30 transition-colors">
                                                <td className="px-8 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProducts.includes(product._id)}
                                                        onChange={() => toggleProductSelection(product._id)}
                                                        className="rounded border-gray-300"
                                                    />
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                                                            {product.images?.[0]?.url ? (
                                                                <img src={product.images[0].url} alt={product.name} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                                    <Plus size={20} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{product.name}</p>
                                                            {product.sku && <p className="text-xs text-gray-500">SKU: {product.sku}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        {product.category || 'Uncategorized'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <Badge className={`
                                                        ${product.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}
                                                        ${product.status === 'draft' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : ''}
                                                        ${product.status === 'archived' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : ''}
                                                        border-0
                                                    `}>
                                                        {product.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <span className={`font-medium ${product.inventory?.quantity === 0 ? 'text-red-500' : product.inventory?.quantity <= 5 ? 'text-yellow-600' : 'text-gray-700'}`}>
                                                        {product.inventory?.quantity || 0} in stock
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <span className="font-bold text-gray-900">
                                                        {new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(product.price)}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <Link href={`/merchant/products/${product._id}`}>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600">
                                                                <Edit size={16} />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 rounded-full hover:bg-red-100 hover:text-red-600"
                                                            onClick={() => handleDelete(product._id)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination.pages > 1 && (
                                <div className="flex items-center justify-between px-8 py-4 border-t">
                                    <p className="text-sm text-gray-600">
                                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                            disabled={pagination.page === 1}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <span className="px-4 py-2 text-sm font-medium">
                                            Page {pagination.page} of {pagination.pages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                            disabled={pagination.page === pagination.pages}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
