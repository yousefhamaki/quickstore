'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPublicStore } from '@shared/services/publicStoreService';
import { getPublicCampaign } from '@shared/lib/api/offers';
import { createOrder } from '@shared/services/publicOrderService';
import { ShoppingBag, Truck, Check, Loader2, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

// Bilingual UI Fallback Dictionary
const translations = {
    en: {
        headline: "Direct Checkout Offer",
        shippingInfo: "Delivery Information",
        firstName: "First Name",
        lastName: "Last Name",
        email: "Email Address",
        phone: "Phone Number",
        address: "Shipping Address",
        city: "City / Governorate",
        orderSummary: "Order Summary",
        subtotal: "Subtotal",
        shipping: "Shipping Fee",
        total: "Total",
        confirmBtn: "Confirm Shipping & Order",
        placingOrder: "Placing your order...",
        buyTiers: "Select Quantity Bundle",
        bestValue: "Best Value!",
        each: "each",
        totalLabel: "Total",
        errorEmptyFields: "Please fill in all required fields.",
        errorInvalidEmail: "Please enter a valid email address.",
        errorInvalidPhone: "Invalid phone number. Must be 11 digits starting with 010, 011, 012, or 015.",
        options: "Options",
        outOfStock: "Out of Stock",
        limitedTime: "Limited time offer expires in:",
        backToStore: "Back to store",
        paymentCod: "Cash on Delivery (COD)"
    },
    ar: {
        headline: "عرض الشراء المباشر",
        shippingInfo: "معلومات الشحن والتوصيل",
        firstName: "الاسم الأول",
        lastName: "الاسم الأخير",
        email: "البريد الإلكتروني",
        phone: "رقم الهاتف",
        address: "عنوان التوصيل",
        city: "المدينة / المحافظة",
        orderSummary: "ملخص الطلب",
        subtotal: "المجموع الفرعي",
        shipping: "مصاريف الشحن",
        total: "المجموع الكلي",
        confirmBtn: "تأكيد الطلب والتوصيل السريع",
        placingOrder: "جاري إرسال الطلب...",
        buyTiers: "اختر الكمية المناسبة",
        bestValue: "أفضل قيمة!",
        each: "لكل قطعة",
        totalLabel: "الإجمالي",
        errorEmptyFields: "يرجى ملء جميع الحقول المطلوبة.",
        errorInvalidEmail: "يرجى إدخال بريد إلكتروني صحيح.",
        errorInvalidPhone: "رقم هاتف غير صحيح. يجب أن يكون 11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015.",
        options: "الخيارات",
        outOfStock: "نفذت الكمية",
        limitedTime: "العرض ينتهي خلال:",
        backToStore: "العودة للمتجر",
        paymentCod: "الدفع عند الاستلام"
    }
};

export default function OfferPageCheckout() {
    const { subdomain, campaignId, locale } = useParams();
    const router = useRouter();
    
    const isAr = locale === 'ar';
    const dict = isAr ? translations.ar : translations.en;

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [store, setStore] = useState<any>(null);
    const [campaign, setCampaign] = useState<any>(null);
    const [product, setProduct] = useState<any>(null);
    
    // Configurable state
    const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
    const [selections, setSelections] = useState<Record<string, string>[]>([]);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
    
    // Shipping Form
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: ''
    });

    useEffect(() => {
        if (!subdomain || !campaignId) return;

        const loadData = async () => {
            try {
                const storeData = await getPublicStore(subdomain as string);
                setStore(storeData);
                
                const campaignData = await getPublicCampaign(campaignId as string, storeData._id);
                setCampaign(campaignData);

                const offerProduct = campaignData.offerProducts?.[0];
                if (offerProduct && offerProduct.productId) {
                    const prod = offerProduct.productId;
                    setProduct(prod);
                    
                    // Initialize default quantity to the first pricing tier
                    let initialQty = 1;
                    if (campaignData.pricingTiers && campaignData.pricingTiers.length > 0) {
                        initialQty = campaignData.pricingTiers[0].quantity;
                        setSelectedQuantity(initialQty);
                    }

                    // Initialize default options/variants if present
                    if (prod.options && prod.options.length > 0) {
                        const defaultOpts: Record<string, string> = {};
                        prod.options.forEach((opt: any) => {
                            if (opt.values && opt.values.length > 0) {
                                defaultOpts[opt.name] = opt.values[0];
                            }
                        });
                        setSelections(Array.from({ length: initialQty }).map(() => ({ ...defaultOpts })));
                    }
                }
                
                // Countdown Timer Setup
                if (campaignData.display?.countdownSeconds) {
                    setTimeLeft(campaignData.display.countdownSeconds);
                }
            } catch (err: any) {
                console.error(err);
                toast.error(isAr ? 'فشل تحميل العرض.' : 'Failed to load offer details.');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [subdomain, campaignId]);

    const handleQuantityChange = (newQty: number) => {
        setSelectedQuantity(newQty);
        if (product && product.options && product.options.length > 0) {
            const defaultOpts: Record<string, string> = {};
            product.options.forEach((opt: any) => {
                if (opt.values && opt.values.length > 0) {
                    defaultOpts[opt.name] = opt.values[0];
                }
            });
            setSelections(prev => {
                if (prev.length === newQty) return prev;
                if (prev.length < newQty) {
                    const extra = Array.from({ length: newQty - prev.length }).map(() => ({ ...defaultOpts }));
                    return [...prev, ...extra];
                } else {
                    return prev.slice(0, newQty);
                }
            });
        }
    };

    // Timer Tick
    useEffect(() => {
        if (timeLeft <= 0) return;
        const interval = setInterval(() => {
            setTimeLeft(p => p - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [timeLeft]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-black" />
                    <span className="text-sm font-bold tracking-widest uppercase text-gray-400">Loading Offer...</span>
                </div>
            </div>
        );
    }

    if (!campaign || !product) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-4 bg-white border p-8 rounded-[32px] shadow-sm">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <h1 className="text-2xl font-black tracking-tight text-gray-900">Offer Unavailable</h1>
                    <p className="text-gray-500 font-medium">This campaign is inactive, scheduled for a different date, or has been archived.</p>
                </div>
            </div>
        );
    }

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    };

    // Calculate dynamic pricing
    const matchedTier = campaign.pricingTiers?.find((t: any) => t.quantity === selectedQuantity) || { totalPrice: product.price * selectedQuantity };
    const subtotal = matchedTier.totalPrice;
    const resolvedUnitPrice = Number((subtotal / selectedQuantity).toFixed(2));
    
    // Resolve client-side shipping fee override or zone default matching
    let shippingFee = 50;
    if (campaign.shippingFee !== undefined && campaign.shippingFee !== null) {
        shippingFee = campaign.shippingFee;
    } else {
        const zones = store?.settings?.shipping?.zones || [];
        if (zones.length > 0) {
            const matchedZone = zones.find((z: any) => z.cities.includes(form.city));
            shippingFee = matchedZone ? matchedZone.rate : zones[0].rate;
        }
    }
    const finalTotal = subtotal + shippingFee;

    // Match variants and check stock
    const matchedVariants = selections.map(itemOpts => {
        if (!product || !product.variants) return null;
        return product.variants.find((v: any) => {
            return Object.entries(itemOpts).every(([name, value]) => {
                return v.options && v.options[name] === value;
            });
        });
    });

    const isCurrentVariantOutOfStock = matchedVariants.some(v => v && !v.inStock);

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Simple client form validation
        if (!form.firstName || !form.lastName || !form.phone || !form.address || !form.city) {
            toast.error(dict.errorEmptyFields);
            return;
        }

        // Email regex
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            toast.error(dict.errorInvalidEmail);
            return;
        }

        // Phone regex
        const phoneRegex = /^01[0125]\d{8}$/;
        if (!phoneRegex.test(form.phone)) {
            toast.error(dict.errorInvalidPhone);
            return;
        }

        if (isCurrentVariantOutOfStock) {
            toast.error(isAr ? 'نفذت كمية هذا المنتج.' : 'Selected product variant is out of stock.');
            return;
        }

        setIsSubmitting(true);
        try {
            const selectedVariantsMap: Record<string, number> = {};
            matchedVariants.forEach(v => {
                const vid = v ? v._id : 'base';
                selectedVariantsMap[vid] = (selectedVariantsMap[vid] || 0) + 1;
            });

            const selectedVariants = Object.entries(selectedVariantsMap).map(([vid, quantity]) => ({
                variantId: vid === 'base' ? undefined : vid,
                quantity
            }));

            const orderPayload = {
                storeId: store._id,
                campaignId: campaign._id,
                selectedQuantity,
                variantId: matchedVariants[0]?._id || undefined,
                selectedVariants,
                customer: {
                    firstName: form.firstName,
                    lastName: form.lastName,
                    email: form.email || `${form.phone}@guest.quickstore.live`,
                    phone: form.phone
                },
                shippingAddress: {
                    address: form.address,
                    city: form.city,
                    zipCode: '00000'
                },
                paymentMethod: 'COD',
                discountAmount: 0
            };

            const response = await createOrder(orderPayload) as any;
            if (response.success) {
                toast.success(isAr ? 'تم تسجيل طلبك بنجاح!' : 'Order confirmed successfully!');
                router.push(`/order/success/${response.orderNumber}`);
            } else {
                toast.error(response.message || 'Failed to place order.');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || dict.errorEmptyFields);
        } finally {
            setIsSubmitting(false);
        }
    };

    const primaryColor = store.branding?.primaryColor || '#000000';

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20 font-sans" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
            {/* Header branding */}
            <header className="bg-white border-b sticky top-0 z-40 backdrop-blur-md bg-white/80 h-16 flex items-center px-4 md:px-8 justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    {store.logo?.url ? (
                        <img src={store.logo.url} alt={store.name} className="h-8 max-w-[120px] object-contain" />
                    ) : (
                        <span className="font-black text-xl tracking-tight uppercase">{store.name}</span>
                    )}
                </div>
                <button
                    onClick={() => router.push('/')}
                    className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
                >
                    {dict.backToStore}
                </button>
            </header>

            <main className="container mx-auto max-w-5xl px-4 py-8 md:py-12 space-y-8 animate-in fade-in duration-500">
                
                {/* Promo timer */}
                {timeLeft > 0 && (
                    <div className="bg-red-50 text-red-700 border border-red-100 rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm animate-pulse">
                        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
                            <Clock className="w-5 h-5 shrink-0" />
                            <span>{dict.limitedTime}</span>
                        </div>
                        <span className="text-xl font-mono font-black tracking-widest">{formatTime(timeLeft)}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column: Product Info & Tier Selector */}
                    <div className="lg:col-span-7 space-y-8">
                        <div className="bg-white border rounded-[32px] p-6 md:p-8 space-y-6 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-4">
                                {/* Product Gallery */}
                                <div className="md:col-span-6 space-y-4">
                                    <div className="w-full aspect-square bg-gray-50 rounded-3xl border overflow-hidden shadow-sm relative group">
                                        {product.images?.[activeImageIndex]?.url ? (
                                            <img 
                                                src={product.images[activeImageIndex].url} 
                                                alt={product.name} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <ShoppingBag size={48} />
                                            </div>
                                        )}
                                        {isCurrentVariantOutOfStock && (
                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white font-bold text-xs uppercase tracking-widest">{dict.outOfStock}</div>
                                        )}
                                    </div>

                                    {/* Thumbnails list if multiple images exist */}
                                    {product.images && product.images.length > 1 && (
                                        <div className="flex gap-2 overflow-x-auto py-1 scrollbar-thin">
                                            {product.images.map((img: any, idx: number) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setActiveImageIndex(idx)}
                                                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
                                                        activeImageIndex === idx 
                                                            ? 'border-black scale-105 shadow-sm' 
                                                            : 'border-gray-200 hover:border-gray-400'
                                                    }`}
                                                >
                                                    <img src={img.url} alt={`${product.name} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Product Info */}
                                <div className="md:col-span-6 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-gray-900">
                                            {campaign.display?.headline || product.name}
                                        </h1>
                                        {product.compareAtPrice > product.price && (
                                            <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wide">
                                                <span className="text-red-500 line-through">{product.compareAtPrice} EGP</span>
                                                <span className="text-emerald-600">{product.price} EGP</span>
                                            </div>
                                        )}
                                        <div className="h-px bg-gray-100 animate-pulse" />
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</span>
                                            <p className="text-gray-600 font-medium text-sm leading-relaxed whitespace-pre-line">
                                                {campaign.display?.description || product.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Option selections if variants exist */}
                            {product.options && product.options.length > 0 && selections.length > 0 && (
                                <div className="border-t pt-6 space-y-6">
                                    <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400">{dict.options}</h3>
                                    <div className="space-y-4">
                                        {selections.map((itemOpts, idx) => (
                                            <div key={idx} className="p-4 bg-gray-50/50 border rounded-2xl space-y-3">
                                                {selectedQuantity > 1 && (
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                        {isAr ? `القطعة #${idx + 1}` : `Item #${idx + 1}`}
                                                    </span>
                                                )}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {product.options.map((opt: any) => (
                                                        <div key={opt.name} className="space-y-1">
                                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{opt.name}</label>
                                                            <select
                                                                value={itemOpts[opt.name] || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setSelections(prev => prev.map((s, i) => i === idx ? { ...s, [opt.name]: val } : s));
                                                                }}
                                                                className="w-full h-11 border bg-white rounded-xl px-3 outline-none font-bold text-sm shadow-xs"
                                                            >
                                                                {opt.values.map((val: string) => (
                                                                    <option key={val} value={val}>{val}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quantity Tier Selector */}
                            <div className="border-t pt-6 space-y-4">
                                <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400">{dict.buyTiers}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {campaign.pricingTiers?.map((tier: any) => {
                                        const isSelected = selectedQuantity === tier.quantity;
                                        const unitPrice = tier.totalPrice / tier.quantity;
                                        const savingsPercent = Math.round(((product.price * tier.quantity - tier.totalPrice) / (product.price * tier.quantity)) * 100);
                                        
                                        return (
                                            <div
                                                key={tier.quantity}
                                                onClick={() => handleQuantityChange(tier.quantity)}
                                                className={`border-2 rounded-2xl p-5 cursor-pointer relative transition-all duration-300 flex flex-col justify-between min-h-[140px] hover:scale-[1.02] shadow-xs ${
                                                    isSelected 
                                                        ? 'bg-black text-white border-black scale-[1.01] shadow-md' 
                                                        : 'bg-gray-50 hover:bg-gray-100/50 border-gray-200 text-black'
                                                }`}
                                            >
                                                {savingsPercent > 0 && (
                                                    <span className={`absolute -top-3 left-4 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        isSelected ? 'bg-white text-black' : 'bg-red-500 text-white'
                                                    }`}>
                                                        {isAr ? `وفر ${savingsPercent}%` : `Save ${savingsPercent}%`}
                                                    </span>
                                                )}
                                                <div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-lg font-black">{isAr ? `${tier.quantity} قطع` : `${tier.quantity} Unit${tier.quantity > 1 ? 's' : ''}`}</span>
                                                        {isSelected && <Check className="w-5 h-5" style={{ color: isSelected ? '#FFFFFF' : primaryColor }} />}
                                                    </div>
                                                    {tier.quantity > 1 && (
                                                        <p className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>
                                                            {resolvedUnitPrice} EGP {dict.each}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="mt-4 border-t border-dashed border-gray-300/40 pt-2 flex justify-between items-end">
                                                    <span className="text-xs uppercase font-bold text-gray-400">{dict.totalLabel}</span>
                                                    <span className="text-xl font-black">EGP {tier.totalPrice}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Checkout Form & Total Box */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="bg-white border rounded-[32px] p-6 md:p-8 space-y-6 shadow-sm">
                            <h2 className="text-xl font-black tracking-tight text-gray-900 border-b pb-4">{dict.shippingInfo}</h2>
                            
                            <form onSubmit={handlePlaceOrder} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{dict.firstName}</label>
                                        <input
                                            name="firstName"
                                            value={form.firstName}
                                            onChange={handleFormChange}
                                            required
                                            className="w-full h-11 bg-gray-50 border rounded-xl px-4 outline-none focus:ring-2 focus:ring-black/5 text-sm font-semibold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{dict.lastName}</label>
                                        <input
                                            name="lastName"
                                            value={form.lastName}
                                            onChange={handleFormChange}
                                            required
                                            className="w-full h-11 bg-gray-50 border rounded-xl px-4 outline-none focus:ring-2 focus:ring-black/5 text-sm font-semibold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{dict.phone}</label>
                                    <input
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleFormChange}
                                        required
                                        placeholder="e.g. 01012345678"
                                        className="w-full h-11 bg-gray-50 border rounded-xl px-4 outline-none focus:ring-2 focus:ring-black/5 text-sm font-semibold"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{dict.address}</label>
                                    <input
                                        name="address"
                                        value={form.address}
                                        onChange={handleFormChange}
                                        required
                                        placeholder="Street details, building, flat number"
                                        className="w-full h-11 bg-gray-50 border rounded-xl px-4 outline-none focus:ring-2 focus:ring-black/5 text-sm font-semibold"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{dict.city}</label>
                                    <input
                                        name="city"
                                        value={form.city}
                                        onChange={handleFormChange}
                                        required
                                        placeholder="Cairo, Giza, Alexandria..."
                                        className="w-full h-11 bg-gray-50 border rounded-xl px-4 outline-none focus:ring-2 focus:ring-black/5 text-sm font-semibold"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{dict.email} ({isAr ? 'اختياري' : 'Optional'})</label>
                                    <input
                                        name="email"
                                        value={form.email}
                                        onChange={handleFormChange}
                                        className="w-full h-11 bg-gray-50 border rounded-xl px-4 outline-none focus:ring-2 focus:ring-black/5 text-sm font-semibold"
                                    />
                                </div>

                                {/* Order pricing summary */}
                                <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100">
                                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-gray-400">
                                        <span>{dict.subtotal}</span>
                                        <span className="text-black font-extrabold">EGP {subtotal}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-gray-400">
                                        <span>{dict.shipping}</span>
                                        <span className="text-black font-extrabold">{shippingFee === 0 ? (isAr ? 'شحن مجاني' : 'FREE') : `EGP ${shippingFee}`}</span>
                                    </div>
                                    <div className="h-px bg-gray-200 border-dashed" />
                                    <div className="flex justify-between items-center pt-1">
                                        <span className="text-sm font-black uppercase tracking-wider">{dict.total}</span>
                                        <span className="text-2xl font-black text-black">EGP {finalTotal}</span>
                                    </div>
                                    <div className="pt-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5 justify-center">
                                        <Truck className="w-4 h-4 text-green-500" />
                                        <span>{dict.paymentCod}</span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || isCurrentVariantOutOfStock}
                                    className="w-full h-14 bg-black text-white hover:bg-gray-900 transition-all font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>{dict.placingOrder}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>{isCurrentVariantOutOfStock ? dict.outOfStock : dict.confirmBtn}</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
