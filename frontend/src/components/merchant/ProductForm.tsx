'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, Upload, X } from 'lucide-react';
import { uploadImages, createProduct, updateProduct } from '@/services/productService';
import { toast } from 'react-hot-toast';

interface ProductFormProps {
    initialData?: any;
    isEdit?: boolean;
}

export default function ProductForm({ initialData, isEdit }: ProductFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        price: '',
        compareAtPrice: '',
        category: '',
        inventory: '0',
        images: [] as any[],
        options: [] as any[],
        status: 'active',
        sku: '',
        barcode: '',
        costPerItem: '',
        trackInventory: true
    });

    useEffect(() => {
        if (initialData) {
            setForm({
                ...initialData,
                price: initialData.price?.toString() || '',
                compareAtPrice: initialData.compareAtPrice?.toString() || '',
                costPerItem: initialData.costPerItem?.toString() || '',
                sku: initialData.sku || '',
                barcode: initialData.barcode || '',
                trackInventory: initialData.trackInventory !== false,
                inventory: initialData.inventory?.toString() || (initialData.inventory?.quantity?.toString() || '0'),
                images: initialData.images || [],
                options: initialData.options || [],
                status: initialData.status || 'active'
            });
        }
    }, [initialData]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const formData = new FormData();
        Array.from(e.target.files).forEach(file => {
            formData.append('images', file);
        });

        const toastId = toast.loading('Uploading images...');
        try {
            const uploadedImages = await uploadImages(formData);
            setForm(prev => ({ ...prev, images: [...prev.images, ...(uploadedImages as any[])] }));
            toast.success('Images uploaded', { id: toastId });
        } catch (error) {
            console.error('Upload Error:', error);
            toast.error('Failed to upload images', { id: toastId });
        }
    };

    const removeImage = (index: number) => {
        setForm(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const addOption = () => {
        setForm(prev => ({
            ...prev,
            options: [...prev.options, { name: '', values: [] }]
        }));
    };

    const updateOption = (index: number, field: string, value: any) => {
        const newOptions = [...form.options];
        newOptions[index] = { ...newOptions[index], [field]: value };
        setForm(prev => ({ ...prev, options: newOptions }));
    };

    const removeOption = (index: number) => {
        setForm(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = {
                ...form,
                price: parseFloat(form.price),
                compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
                costPerItem: form.costPerItem ? parseFloat(form.costPerItem) : undefined,
                inventory: form.trackInventory ? { quantity: parseInt(form.inventory), lowStockThreshold: 5 } : undefined
            };

            if (isEdit) {
                await updateProduct(initialData._id, data);
                toast.success('Product updated');
            } else {
                await createProduct(data);
                toast.success('Product created');
            }
            router.push('/merchant/products');
        } catch (error) {
            console.error('Save Product Error:', error);
            toast.error('Failed to save product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="shadow-xl border-0 overflow-hidden glass">
                        <CardContent className="p-8 space-y-6 pt-8">
                            <h2 className="text-xl font-bold">General Information</h2>
                            <div className="space-y-2">
                                <Label htmlFor="name">Product Name</Label>
                                <Input
                                    id="name"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="Blue Denim Jacket"
                                    required
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full min-h-[150px] p-4 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 border bg-transparent"
                                    placeholder="Describe your product..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xl border-0 overflow-hidden glass">
                        <CardContent className="p-8 space-y-6 pt-8">
                            <h2 className="text-xl font-bold">Media</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {form.images.map((img, i) => (
                                    <div key={i} className="group relative aspect-square rounded-xl bg-gray-100 overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all">
                                        <img src={img.url} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(i)}
                                            className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                    <Upload className="text-gray-400 mb-2" />
                                    <span className="text-xs font-bold text-gray-500 uppercase text-center px-2">Click to Upload</span>
                                    <input type="file" multiple className="hidden" onChange={handleImageUpload} accept="image/*" />
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xl border-0 overflow-hidden glass">
                        <CardContent className="p-8 space-y-6 pt-8">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold">Variants</h2>
                                <Button type="button" variant="outline" size="sm" onClick={addOption} className="rounded-full">
                                    <Plus className="w-4 h-4 mr-2" /> Add Option
                                </Button>
                            </div>

                            {form.options.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No variants for this product yet. Add options like Size or Color.</p>
                            ) : (
                                <div className="space-y-6">
                                    {form.options.map((option, i) => (
                                        <div key={i} className="p-6 bg-gray-50/50 rounded-2xl relative border border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() => removeOption(i)}
                                                className="absolute top-4 right-4 text-gray-400 hover:text-red-600"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label>Option Name</Label>
                                                    <Input
                                                        value={option.name}
                                                        onChange={e => updateOption(i, 'name', e.target.value)}
                                                        placeholder="e.g. Color"
                                                        className="rounded-xl border shadow-sm bg-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Options Values (comma separated)</Label>
                                                    <Input
                                                        value={option.values.join(', ')}
                                                        onChange={e => updateOption(i, 'values', e.target.value.split(',').map((v: string) => v.trim()).filter((v: string) => v !== ''))}
                                                        placeholder="e.g. Red, Blue, Green"
                                                        className="rounded-xl border shadow-sm bg-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    <Card className="shadow-xl border-0 overflow-hidden glass">
                        <CardContent className="p-8 space-y-6 pt-8">
                            <h2 className="text-xl font-bold">Pricing & Inventory</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price">Price (EGP)</Label>
                                    <Input
                                        id="price"
                                        value={form.price}
                                        onChange={e => setForm({ ...form, price: e.target.value })}
                                        placeholder="0.00"
                                        type="number"
                                        step="0.01"
                                        required
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="compareAtPrice">Compare at Price</Label>
                                    <Input
                                        id="compareAtPrice"
                                        value={form.compareAtPrice}
                                        onChange={e => setForm({ ...form, compareAtPrice: e.target.value })}
                                        placeholder="0.00"
                                        type="number"
                                        step="0.01"
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="costPerItem">Cost per Item (for profit calc)</Label>
                                <Input
                                    id="costPerItem"
                                    value={form.costPerItem}
                                    onChange={e => setForm({ ...form, costPerItem: e.target.value })}
                                    placeholder="0.00"
                                    type="number"
                                    step="0.01"
                                    className="rounded-xl"
                                />
                            </div>

                            <hr className="border-gray-100" />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                                    <Input
                                        id="sku"
                                        value={form.sku}
                                        onChange={e => setForm({ ...form, sku: e.target.value })}
                                        placeholder="e.g. SHIRT-BLU-S"
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="barcode">Barcode (ISBN, UPC, GTIN)</Label>
                                    <Input
                                        id="barcode"
                                        value={form.barcode}
                                        onChange={e => setForm({ ...form, barcode: e.target.value })}
                                        placeholder=""
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 my-2">
                                <input
                                    type="checkbox"
                                    id="trackInventory"
                                    checked={form.trackInventory}
                                    onChange={e => setForm({ ...form, trackInventory: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="trackInventory" className="cursor-pointer">Track Inventory Quantity</Label>
                            </div>

                            {form.trackInventory && (
                                <div className="space-y-2">
                                    <Label htmlFor="inventory">Available Quantity</Label>
                                    <Input
                                        id="inventory"
                                        value={form.inventory}
                                        onChange={e => setForm({ ...form, inventory: e.target.value })}
                                        placeholder="0"
                                        type="number"
                                        className="rounded-xl"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-xl border-0 overflow-hidden glass">
                        <CardContent className="p-8 space-y-6 pt-8">
                            <h2 className="text-xl font-bold">Organization</h2>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Input
                                    id="category"
                                    value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                    placeholder="Clothing"
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Product Status</Label>
                                <select
                                    id="status"
                                    value={form.status}
                                    onChange={e => setForm({ ...form, status: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="active">Active</option>
                                    <option value="draft">Draft</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 h-14 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : (isEdit ? 'Update Product' : 'Publish Product')}
                    </Button>
                </div>
            </div>
        </form>
    );
}
