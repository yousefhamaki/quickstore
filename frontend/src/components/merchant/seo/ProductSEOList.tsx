'use client';

import { useState } from 'react';
import { ProductSEO } from '@/types/seo';
import { Edit2, Check, X, ExternalLink } from 'lucide-react';

interface ProductSEOListProps {
    products: ProductSEO[];
    onUpdateProduct: (productId: string, seo: any) => Promise<void>;
    updating: boolean;
}

export function ProductSEOList({ products, onUpdateProduct, updating }: ProductSEOListProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});

    const startEdit = (product: ProductSEO) => {
        setEditingId(product.productId);
        setEditData(product.seo || {});
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const saveEdit = async (productId: string) => {
        await onUpdateProduct(productId, editData);
        setEditingId(null);
        setEditData({});
    };

    if (products.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-600">No products found. Add products to manage their SEO settings.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Product
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                SEO Title
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                SEO Description
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product) => (
                            <tr key={product.productId} className="hover:bg-gray-50">
                                {editingId === product.productId ? (
                                    <ProductEditRow
                                        product={product}
                                        editData={editData}
                                        setEditData={setEditData}
                                        onSave={() => saveEdit(product.productId)}
                                        onCancel={cancelEdit}
                                        saving={updating}
                                    />
                                ) : (
                                    <ProductViewRow
                                        product={product}
                                        onEdit={() => startEdit(product)}
                                    />
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ProductViewRow({ product, onEdit }: { product: ProductSEO; onEdit: () => void }) {
    const hasCustomSEO = product.seo?.title || product.seo?.description;
    const isNoindex = product.seo?.noindex;

    return (
        <>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div>
                        <div className="text-sm font-medium text-gray-900">{product.productName}</div>
                        <div className="text-sm text-gray-500">/{product.productSlug}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="text-sm text-gray-900">
                    {product.seo?.title || (
                        <span className="text-gray-400 italic">Using product name</span>
                    )}
                </div>
                {product.seo?.title && (
                    <div className="text-xs text-gray-500 mt-1">
                        {product.seo.title.length}/60 chars
                    </div>
                )}
            </td>
            <td className="px-6 py-4">
                <div className="text-sm text-gray-900 max-w-xs truncate">
                    {product.seo?.description || (
                        <span className="text-gray-400 italic">Using product description</span>
                    )}
                </div>
                {product.seo?.description && (
                    <div className="text-xs text-gray-500 mt-1">
                        {product.seo.description.length}/160 chars
                    </div>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                {isNoindex ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Noindex
                    </span>
                ) : hasCustomSEO ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Optimized
                    </span>
                ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Default
                    </span>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                    onClick={onEdit}
                    className="text-blue-600 hover:text-blue-900 flex items-center gap-1 ml-auto"
                >
                    <Edit2 size={16} />
                    Edit
                </button>
            </td>
        </>
    );
}

function ProductEditRow({
    product,
    editData,
    setEditData,
    onSave,
    onCancel,
    saving
}: {
    product: ProductSEO;
    editData: any;
    setEditData: (data: any) => void;
    onSave: () => void;
    onCancel: () => void;
    saving: boolean;
}) {
    return (
        <>
            <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">{product.productName}</div>
                <div className="text-sm text-gray-500">/{product.productSlug}</div>
            </td>
            <td className="px-6 py-4">
                <input
                    type="text"
                    value={editData.title || ''}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    placeholder={product.productName}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={100}
                />
                <div className="text-xs text-gray-500 mt-1">
                    {(editData.title || '').length}/60 chars
                </div>
            </td>
            <td className="px-6 py-4">
                <textarea
                    value={editData.description || ''}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Enter SEO description..."
                    rows={2}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={300}
                />
                <div className="text-xs text-gray-500 mt-1">
                    {(editData.description || '').length}/160 chars
                </div>
            </td>
            <td className="px-6 py-4">
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={editData.noindex || false}
                        onChange={(e) => setEditData({ ...editData, noindex: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Noindex</span>
                </label>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="flex items-center gap-2 justify-end">
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        title="Save"
                    >
                        <Check size={20} />
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={saving}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Cancel"
                    >
                        <X size={20} />
                    </button>
                </div>
            </td>
        </>
    );
}
