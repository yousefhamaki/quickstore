'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Card, CardContent } from '@shared/components/ui/card';
import { Trash2, Plus, Upload, X, Settings } from 'lucide-react';
import Link from 'next/link';
import { uploadImages, createProduct, updateProduct } from '@shared/services/productService';
import { getCategories, Category } from '@shared/services/categoryService';
import { toast } from 'react-hot-toast';
import { imagePreset } from '@shared/lib/cloudinaryImage';

interface ProductFormProps {
    initialData?: any;
    isEdit?: boolean;
    /**
     * Required so the product is created/updated against the RIGHT store.
     * Previously this form sent no storeId at all, so the backend's
     * resolveStore() fell back to "the merchant's first store" every time —
     * for any merchant with more than one store, every "new product" here
     * silently landed on whichever store was created first, not the one
     * whose page they were actually on, and editing a product that belongs
     * to a different store would 404.
     */
    storeId: string;
}

export default function ProductForm({ initialData, isEdit, storeId }: ProductFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const t = useTranslations("merchant.products.form");
    const tStatus = useTranslations("merchant.products.status");
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [form, setForm] = useState({
        name: '',
        description: '',
        price: '',
        compareAtPrice: '',
        category: '',
        categoryId: '',
        inventory: '0',
        images: [] as any[],
        options: [] as any[],
        status: 'active',
        sku: '',
        barcode: '',
        costPerItem: '',
        trackInventory: true,
        variants: [] as any[],
        features: [] as { label: string; value: string }[],
        extras: [] as { name: string; description: string; price: string }[],
        storeId
    });

    useEffect(() => {
        getCategories(storeId).then(setCategories).catch(() => {
            // Non-fatal — the category dropdown just shows "Uncategorized"
            // only if this fails.
        });
    }, [storeId]);

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
                inventory: initialData.inventory?.quantity?.toString() || (initialData.inventory?.quantity?.toString() || '0'),
                images: initialData.images || [],
                options: initialData.options || [],
                features: initialData.features || [],
                extras: (initialData.extras || []).map((e: any) => ({
                    name: e.name || '',
                    description: e.description || '',
                    price: e.price?.toString() || ''
                })),
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

        const toastId = toast.loading(t('uploading'));
        try {
            const uploadedImages = await uploadImages(formData);
            setForm(prev => ({ ...prev, images: [...prev.images, ...(uploadedImages as any[])] }));
            toast.success(t('uploadSuccess'), { id: toastId });
        } catch (error) {
            console.error('Upload Error:', error);
            toast.error(t('uploadError'), { id: toastId });
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

    // Helper to generate all combinations of options (Cartesian product)
    const generateVariants = (options: any[]) => {
        const cleanOptions = options
            .filter(opt => opt.name.trim() !== '')
            .map(opt => ({
                name: opt.name.trim(),
                values: Array.isArray(opt.values)
                    ? opt.values.map((v: string) => v.trim()).filter((v: string) => v !== '')
                    : (typeof opt.values === 'string'
                        ? (opt.values as string).split(/[,،]/).map(v => v.trim()).filter(v => v !== '')
                        : [])
            }))
            .filter(opt => opt.values.length > 0);

        if (cleanOptions.length === 0) return [];

        const combinations = cleanOptions.reduce((acc, opt) => {
            if (acc.length === 0) return opt.values.map((v: string) => ({ [opt.name]: v }));
            return acc.flatMap((combo: any) => opt.values.map((v: string) => ({ ...combo, [opt.name]: v })));
        }, []);

        return combinations.map((combo: any) => {
            const name = Object.values(combo).join(' / ');
            // Try to find existing variant to preserve stock
            const existing = form.variants.find(v => {
                const vOptions = v.options || {};
                return Object.entries(combo).every(([k, val]) => vOptions[k] === val);
            });

            return {
                name,
                options: combo,
                price: existing?.price || form.price || 0,
                inventory: existing?.inventory || 0,
                sku: existing?.sku || ''
            };
        });
    };

    useEffect(() => {
        if (form.options.length > 0) {
            const newVariants = generateVariants(form.options);
            if (JSON.stringify(newVariants.map(v => v.options)) !== JSON.stringify(form.variants.map(v => v.options))) {
                setForm(prev => ({ ...prev, variants: newVariants }));
            }
        } else {
            setForm(prev => ({ ...prev, variants: [] }));
        }
    }, [form.options, form.price]);

    const updateVariantInventory = (index: number, stock: string) => {
        const newVariants = [...form.variants];
        newVariants[index] = { ...newVariants[index], inventory: parseInt(stock) || 0 };
        setForm(prev => ({ ...prev, variants: newVariants }));
    };

    // Features / spec table — free-form merchant-defined label/value rows
    // (e.g. "Material" / "Cotton"), rendered as a spec table on the PDP.
    const addFeature = () => {
        setForm(prev => ({
            ...prev,
            features: [...prev.features, { label: '', value: '' }]
        }));
    };

    const updateFeature = (index: number, field: 'label' | 'value', value: string) => {
        const newFeatures = [...form.features];
        newFeatures[index] = { ...newFeatures[index], [field]: value };
        setForm(prev => ({ ...prev, features: newFeatures }));
    };

    const removeFeature = (index: number) => {
        setForm(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }));
    };

    // Extras — optional paid add-ons (e.g. "1-year extended warranty, +100
    // EGP"). Never required, never inventory-tracked, unlike variants.
    const addExtra = () => {
        setForm(prev => ({
            ...prev,
            extras: [...prev.extras, { name: '', description: '', price: '' }]
        }));
    };

    const updateExtra = (index: number, field: 'name' | 'description' | 'price', value: string) => {
        const newExtras = [...form.extras];
        newExtras[index] = { ...newExtras[index], [field]: value };
        setForm(prev => ({ ...prev, extras: newExtras }));
    };

    const removeExtra = (index: number) => {
        setForm(prev => ({
            ...prev,
            extras: prev.extras.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Cleanup options: filter out empty names and empty values
            const cleanOptions = form.options
                .filter(opt => opt.name.trim() !== '')
                .map(opt => ({
                    name: opt.name.trim(),
                    values: Array.isArray(opt.values)
                        ? opt.values.map((v: string) => v.trim()).filter((v: string) => v !== '')
                        : (typeof opt.values === 'string'
                            ? (opt.values as string).split(/[,،]/).map(v => v.trim()).filter(v => v !== '')
                            : [])
                }))
                .filter(opt => opt.values.length > 0);

            // Drop blank rows (both label and value empty) — a merchant who
            // clicked "Add Feature" then changed their mind shouldn't submit
            // an empty spec row.
            const cleanFeatures = form.features
                .map(f => ({ label: (f.label || '').trim(), value: (f.value || '').trim() }))
                .filter(f => f.label !== '' || f.value !== '');

            // Drop rows with no name (a required field) — a merchant who
            // added a row then changed their mind shouldn't submit a
            // half-filled extra.
            const cleanExtras = form.extras
                .map(e => ({ name: (e.name || '').trim(), description: (e.description || '').trim(), price: e.price }))
                .filter(e => e.name !== '')
                .map(e => ({
                    name: e.name,
                    description: e.description || undefined,
                    price: parseFloat(e.price as any) || 0
                }));

            const data = {
                ...form,
                price: parseFloat(form.price),
                compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
                costPerItem: form.costPerItem ? parseFloat(form.costPerItem) : undefined,
                inventory: form.trackInventory ? { quantity: parseInt(form.inventory), lowStockThreshold: 5 } : undefined,
                options: cleanOptions,
                features: cleanFeatures,
                extras: cleanExtras,
                variants: form.variants.map(v => ({
                    ...v,
                    price: parseFloat(v.price),
                    inventory: parseInt(v.inventory)
                }))
            };

            if (isEdit) {
                await updateProduct(initialData._id, data);
                toast.success(t('successUpdate'));
            } else {
                await createProduct(data);
                toast.success(t('success'));
            }

            // The store detail page/card shows a live product count
            // (store.stats.totalProducts) fetched via React Query under
            // ['store', storeId] / ['stores'] — those queries have nothing
            // to do with this plain axios call, so without this they keep
            // serving their cached (possibly pre-creation, e.g. "0 products")
            // snapshot for up to the client's 5-minute staleTime.
            queryClient.invalidateQueries({ queryKey: ['store', storeId] });
            queryClient.invalidateQueries({ queryKey: ['stores'] });

            router.back();
        } catch (error) {
            console.error('Save Product Error:', error);
            toast.error(t('error'));
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
                            <h2 className="text-xl font-bold">{t('general')}</h2>
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('name')}</Label>
                                <Input
                                    id="name"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder={t('namePlaceholder')}
                                    required
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">{t('description')}</Label>
                                <textarea
                                    id="description"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full min-h-[150px] p-4 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500 border bg-transparent"
                                    placeholder={t('descriptionPlaceholder')}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xl border-0 overflow-hidden glass">
                        <CardContent className="p-8 space-y-6 pt-8">
                            <h2 className="text-xl font-bold">{t('media')}</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {form.images.map((img, i) => (
                                    <div key={i} className="group relative aspect-square rounded-xl bg-gray-100 overflow-hidden border-2 border-transparent hover:border-blue-500 transition">
                                        <img src={imagePreset.thumbnail(img.url)} loading="lazy" decoding="async" width={100} height={100} className="w-full h-full object-cover" />
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
                                    <span className="text-xs font-bold text-gray-500 uppercase text-center px-2">{t('upload')}</span>
                                    <input type="file" multiple className="hidden" onChange={handleImageUpload} accept="image/*" />
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xl border-0 overflow-hidden glass">
                        <CardContent className="p-8 space-y-6 pt-8">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold">{t('variants.title')}</h2>
                                <Button type="button" variant="outline" size="sm" onClick={addOption} className="rounded-full">
                                    <Plus className="w-4 h-4 mr-2" /> {t('variants.addOption')}
                                </Button>
                            </div>

                            {form.options.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">{t('variants.empty')}</p>
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
                                                    <Label>{t('variants.name')}</Label>
                                                    <Input
                                                        value={option.name}
                                                        onChange={e => updateOption(i, 'name', e.target.value)}
                                                        placeholder={t('variants.namePlaceholder')}
                                                        className="rounded-xl border shadow-sm bg-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('variants.values')}</Label>
                                                    <Input
                                                        value={Array.isArray(option.values) ? option.values.join(', ') : option.values}
                                                        onChange={e => updateOption(i, 'values', e.target.value.split(/[,،]/).map(v => v.trimStart()))}
                                                        placeholder={t('variants.valuesPlaceholder')}
                                                        className="rounded-xl border shadow-sm bg-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {form.variants.length > 0 && (
                                <div className="mt-8 space-y-4">
                                    <h3 className="text-lg font-bold">{t('variants.title')} - Stock Management</h3>
                                    <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 uppercase text-gray-500 font-bold">
                                                <tr>
                                                    <th className="px-6 py-4">Variant</th>
                                                    <th className="px-6 py-4">Price</th>
                                                    <th className="px-6 py-4">Inventory</th>
                                                    <th className="px-6 py-4">SKU</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {form.variants.map((v, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-medium">{v.name}</td>
                                                        <td className="px-6 py-4">
                                                            <Input
                                                                type="number"
                                                                value={v.price}
                                                                onChange={e => {
                                                                    const nv = [...form.variants];
                                                                    nv[idx].price = parseFloat(e.target.value) || 0;
                                                                    setForm({ ...form, variants: nv });
                                                                }}
                                                                className="w-24 h-9 rounded-lg"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <Input
                                                                type="number"
                                                                value={v.inventory}
                                                                onChange={e => updateVariantInventory(idx, e.target.value)}
                                                                className="w-24 h-9 rounded-lg"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <Input
                                                                value={v.sku}
                                                                onChange={e => {
                                                                    const nv = [...form.variants];
                                                                    nv[idx].sku = e.target.value;
                                                                    setForm({ ...form, variants: nv });
                                                                }}
                                                                className="w-32 h-9 rounded-lg"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-xs text-muted-foreground italic">
                                        Total stock will be automatically calculated from individual variants.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-xl border-0 overflow-hidden glass">
                        <CardContent className="p-8 space-y-6 pt-8">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Features</h2>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Add spec-table rows shoppers see on the product page (e.g. Material / Cotton, Battery life / 10 hours).
                                    </p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addFeature} className="rounded-full">
                                    <Plus className="w-4 h-4 mr-2" /> Add Feature
                                </Button>
                            </div>

                            {form.features.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No features added yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {form.features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <Input
                                                value={feature.label}
                                                onChange={e => updateFeature(i, 'label', e.target.value)}
                                                placeholder="Label (e.g. Material)"
                                                maxLength={100}
                                                className="rounded-xl flex-1"
                                            />
                                            <Input
                                                value={feature.value}
                                                onChange={e => updateFeature(i, 'value', e.target.value)}
                                                placeholder="Value (e.g. Cotton)"
                                                maxLength={300}
                                                className="rounded-xl flex-1"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeFeature(i)}
                                                className="text-gray-400 hover:text-red-600 shrink-0"
                                                aria-label="Remove feature"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-xl border-0 overflow-hidden glass">
                        <CardContent className="p-8 space-y-6 pt-8">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Extras</h2>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Optional paid add-ons shoppers can choose to buy alongside this product (e.g. "1-year extended warranty, +100 EGP"). Never required, never stock-tracked.
                                    </p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addExtra} className="rounded-full">
                                    <Plus className="w-4 h-4 mr-2" /> Add Extra
                                </Button>
                            </div>

                            {form.extras.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No extras added yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {form.extras.map((extra, i) => (
                                        <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <Input
                                                    value={extra.name}
                                                    onChange={e => updateExtra(i, 'name', e.target.value)}
                                                    placeholder="Name (e.g. Extended Warranty)"
                                                    maxLength={100}
                                                    className="rounded-xl bg-white"
                                                />
                                                <Input
                                                    type="number"
                                                    value={extra.price}
                                                    onChange={e => updateExtra(i, 'price', e.target.value)}
                                                    placeholder="Price (e.g. 100)"
                                                    step="0.01"
                                                    className="rounded-xl bg-white"
                                                />
                                                <Input
                                                    value={extra.description}
                                                    onChange={e => updateExtra(i, 'description', e.target.value)}
                                                    placeholder="Description (optional)"
                                                    maxLength={300}
                                                    className="rounded-xl bg-white md:col-span-2"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeExtra(i)}
                                                className="text-gray-400 hover:text-red-600 shrink-0 mt-2"
                                                aria-label="Remove extra"
                                            >
                                                <Trash2 size={18} />
                                            </button>
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
                            <h2 className="text-xl font-bold">{t('pricing.title')}</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="price">{t('pricing.price')}</Label>
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
                                    <Label htmlFor="compareAtPrice">{t('pricing.compareAt')}</Label>
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
                                <Label htmlFor="costPerItem">{t('pricing.cost')}</Label>
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
                                    <Label htmlFor="sku">{t('pricing.sku')}</Label>
                                    <Input
                                        id="sku"
                                        value={form.sku}
                                        onChange={e => setForm({ ...form, sku: e.target.value })}
                                        placeholder={t('pricing.skuPlaceholder')}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="barcode">{t('pricing.barcode')}</Label>
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
                                <Label htmlFor="trackInventory" className="cursor-pointer mx-2">{t('pricing.trackInventory')}</Label>
                            </div>

                            {form.trackInventory && (
                                <div className="space-y-2">
                                    <Label htmlFor="inventory">{t('pricing.available')}</Label>
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
                            <h2 className="text-xl font-bold">{t('organization.title')}</h2>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="category">{t('organization.category')}</Label>
                                    <Link
                                        href={`/dashboard/stores/${storeId}/categories`}
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                    >
                                        <Settings className="w-3 h-3" /> Manage Categories
                                    </Link>
                                </div>
                                <select
                                    id="category"
                                    value={form.categoryId || ''}
                                    onChange={e => setForm({ ...form, categoryId: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Uncategorized</option>
                                    {categories.map((c) => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                                {categories.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        No categories yet — <Link href={`/dashboard/stores/${storeId}/categories`} className="underline font-bold">create one</Link> to organize your catalog.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">{t('organization.status')}</Label>
                                <select
                                    id="status"
                                    value={form.status}
                                    onChange={e => setForm({ ...form, status: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="active">{tStatus('active')}</option>
                                    <option value="draft">{tStatus('draft')}</option>
                                    <option value="archived">{tStatus('archived')}</option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 h-14 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? t('saving') : (isEdit ? t('update') : t('save'))}
                    </Button>
                </div>
            </div>
        </form>
    );
}
