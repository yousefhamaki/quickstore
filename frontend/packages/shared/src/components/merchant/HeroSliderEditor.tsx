'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
    ImageIcon,
    Package,
    Loader2,
    Search,
    Save,
    GripVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@shared/components/ui/dialog';
import { cn } from '@shared/lib/utils';
import { useStore, useUpdateStore } from '@shared/lib/hooks/useStore';
import { uploadImages, getProducts } from '@shared/services/productService';
import type { HeroSlide } from '@shared/types/store';

interface HeroSliderEditorProps {
    storeId: string;
}

/**
 * Homepage hero slider — a merchant-configurable carousel that renders as
 * the first section of the storefront homepage. Each slide is either a
 * plain image (with an optional link) or a real product from the store's
 * catalog (always clickable through to that product's page).
 *
 * Kept deliberately separate from the main theme react-hook-form: its state
 * is an array with per-slide async image uploads, which doesn't fit that
 * form's flat `values`-controlled fields cleanly. It saves independently via
 * the same generic `PUT /stores/:id` (theme.customizations.heroSlider),
 * which is plan-gated server-side — see storeController.updateStore.
 */
export function HeroSliderEditor({ storeId }: HeroSliderEditorProps) {
    const { data: store } = useStore(storeId);
    const updateMutation = useUpdateStore(storeId);

    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (store && !initialized) {
            setSlides(store.theme?.customizations?.heroSlider?.slides || []);
            setInitialized(true);
        }
    }, [store, initialized]);

    const savedSlides = store?.theme?.customizations?.heroSlider?.slides || [];
    const isDirty = JSON.stringify(savedSlides) !== JSON.stringify(slides);

    // --- Add-slide dialog state ---
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [slideType, setSlideType] = useState<'image' | 'product'>('image');
    const [uploading, setUploading] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<{ url: string; publicId: string } | null>(null);
    const [link, setLink] = useState('');
    const [caption, setCaption] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [searching, setSearching] = useState(false);

    const resetDialog = () => {
        setSlideType('image');
        setUploadedImage(null);
        setLink('');
        setCaption('');
        setProductSearch('');
        setProductResults([]);
        setSelectedProduct(null);
    };

    const openAddDialog = () => {
        resetDialog();
        setIsDialogOpen(true);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('images', file);
            const uploaded = await uploadImages(formData);
            const first = Array.isArray(uploaded) ? uploaded[0] : null;
            if (first) {
                setUploadedImage({ url: first.url, publicId: first.publicId });
            } else {
                toast.error('Upload did not return an image');
            }
        } catch {
            toast.error('Image upload failed');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const runProductSearch = async (term: string) => {
        setProductSearch(term);
        setSearching(true);
        try {
            const data = await getProducts({ storeId, search: term || undefined, limit: 8 }) as any;
            setProductResults(data.products || []);
        } catch {
            setProductResults([]);
        } finally {
            setSearching(false);
        }
    };

    // Load an initial batch of products as soon as "Product" is picked, so
    // the merchant sees choices immediately instead of an empty search box.
    const handleSlideTypeChange = (type: 'image' | 'product') => {
        setSlideType(type);
        if (type === 'product' && productResults.length === 0 && !productSearch) {
            runProductSearch('');
        }
    };

    const handleAddSlide = () => {
        if (!uploadedImage) {
            toast.error('Please upload an image for this slide');
            return;
        }
        if (slideType === 'product' && !selectedProduct) {
            toast.error('Please choose a product');
            return;
        }

        const newSlide: HeroSlide = {
            id: `slide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type: slideType,
            imageUrl: uploadedImage.url,
            imagePublicId: uploadedImage.publicId,
            caption: caption || undefined,
            ...(slideType === 'image'
                ? { link: link || undefined }
                : {
                    productId: selectedProduct._id,
                    productSlug: selectedProduct.slug,
                    productName: selectedProduct.name,
                }),
        };

        setSlides((prev) => [...prev, newSlide]);
        setIsDialogOpen(false);
    };

    const removeSlide = (id: string) => setSlides((prev) => prev.filter((s) => s.id !== id));

    const moveSlide = (index: number, direction: -1 | 1) => {
        setSlides((prev) => {
            const next = [...prev];
            const target = index + direction;
            if (target < 0 || target >= next.length) return prev;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const handleSave = async () => {
        await updateMutation.mutateAsync({
            theme: {
                name: store?.theme?.name || 'modern',
                customizations: {
                    ...(store?.theme?.customizations || {}),
                    heroSlider: { slides },
                },
            },
        });
    };

    return (
        <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary" /> Homepage Hero Slider
                </CardTitle>
                <CardDescription>
                    The first thing shoppers see. Mix plain image banners with clickable products, in any order.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                {slides.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                        No slides yet — add your first one below.
                    </div>
                )}

                <div className="space-y-3">
                    {slides.map((slide, index) => (
                        <div
                            key={slide.id}
                            className="flex items-center gap-3 p-3 rounded-xl border bg-background"
                        >
                            <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                            <img
                                src={slide.imageUrl}
                                alt={slide.caption || slide.productName || 'Slide'}
                                className="w-16 h-16 rounded-lg object-cover border shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={cn(
                                            'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full',
                                            slide.type === 'product'
                                                ? 'bg-primary/10 text-primary'
                                                : 'bg-muted text-muted-foreground'
                                        )}
                                    >
                                        {slide.type === 'product' ? 'Product' : 'Image'}
                                    </span>
                                    {slide.type === 'product' && (
                                        <span className="text-sm font-bold truncate">{slide.productName}</span>
                                    )}
                                </div>
                                {slide.caption && (
                                    <p className="text-xs text-muted-foreground truncate mt-1">{slide.caption}</p>
                                )}
                                {slide.type === 'image' && slide.link && (
                                    <p className="text-xs text-muted-foreground truncate mt-1">→ {slide.link}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={index === 0}
                                    onClick={() => moveSlide(index, -1)}
                                >
                                    <ArrowUp className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={index === slides.length - 1}
                                    onClick={() => moveSlide(index, 1)}
                                >
                                    <ArrowDown className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => removeSlide(slide.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <Button type="button" variant="outline" className="w-full rounded-xl" onClick={openAddDialog}>
                    <Plus className="w-4 h-4 mr-2" /> Add Slide
                </Button>

                <Button
                    type="button"
                    className="w-full rounded-xl"
                    disabled={!isDirty || updateMutation.isPending}
                    onClick={handleSave}
                >
                    {updateMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" /> Save Slider
                        </>
                    )}
                </Button>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Slide</DialogTitle>
                        <DialogDescription>Upload an image, then optionally attach it to a product.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5">
                        {/* Slide type */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleSlideTypeChange('image')}
                                className={cn(
                                    'p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition',
                                    slideType === 'image' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30 hover:bg-muted'
                                )}
                            >
                                <ImageIcon className="w-5 h-5" />
                                <span className="text-xs font-bold">Image only</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSlideTypeChange('product')}
                                className={cn(
                                    'p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition',
                                    slideType === 'product' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30 hover:bg-muted'
                                )}
                            >
                                <Package className="w-5 h-5" />
                                <span className="text-xs font-bold">A product</span>
                            </button>
                        </div>

                        {/* Image upload */}
                        <div className="space-y-2">
                            <Label>Slide image</Label>
                            <label
                                className={cn(
                                    'flex items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden relative',
                                    uploadedImage ? 'border-primary' : 'border-muted-foreground/30 hover:border-primary/50'
                                )}
                            >
                                {uploadedImage ? (
                                    <img src={uploadedImage.url} alt="" className="w-full h-full object-cover" />
                                ) : uploading ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                ) : (
                                    <span className="text-xs text-muted-foreground">Click to upload an image</span>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                />
                            </label>
                        </div>

                        {slideType === 'product' ? (
                            <div className="space-y-2">
                                <Label>Choose a product</Label>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={productSearch}
                                        onChange={(e) => runProductSearch(e.target.value)}
                                        placeholder="Search products..."
                                        className="rounded-xl pl-9"
                                    />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border p-1">
                                    {searching ? (
                                        <div className="flex justify-center py-4">
                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : productResults.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-4">No products found</p>
                                    ) : (
                                        productResults.map((p) => (
                                            <button
                                                key={p._id}
                                                type="button"
                                                onClick={() => setSelectedProduct(p)}
                                                className={cn(
                                                    'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors',
                                                    selectedProduct?._id === p._id ? 'bg-primary/10' : 'hover:bg-muted/50'
                                                )}
                                            >
                                                <img
                                                    src={p.images?.[0]?.url || '/placeholder-product.png'}
                                                    alt=""
                                                    className="w-9 h-9 rounded-md object-cover border shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{p.name}</p>
                                                    <p className="text-xs text-muted-foreground">{p.price} EGP</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Link (optional)</Label>
                                <Input
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    placeholder="/products/some-product or https://..."
                                    className="rounded-xl"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Caption (optional)</Label>
                            <Input
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Summer Sale — up to 50% off"
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleAddSlide} disabled={uploading} className="rounded-xl">
                            Add Slide
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
