'use client';

import { useState } from 'react';
import { useCart } from '@shared/context/CartContext';
import { getPublicStore, validateCoupon, getAutoApplyCoupon, getShippingFeeEstimate } from '@shared/services/publicStoreService';
import { createOrder } from '@shared/services/publicOrderService';
import { captureAbandonedCart, getAbandonedCartByToken } from '@shared/services/abandonedCartService';
import { ShoppingCart, Truck, CreditCard, ChevronRight, Package, Trash2, CheckCircle2, Ticket, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useOfferEngine } from '@shared/hooks/useOfferEngine';
import { imagePreset } from '@shared/lib/cloudinaryImage';
import { OfferModal } from '@shared/components/offers/OfferModal';
import { DownSellOverlay } from '@shared/components/offers/DownSellOverlay';
import { useEffect, useRef } from 'react';
import { useCustomerAuth } from '@shared/context/CustomerAuthContext';
import { MapPin } from 'lucide-react';
import type { CustomerAddress } from '@shared/services/customerAuthService';
import { EGYPTIAN_GOVERNORATES } from '@shared/constants/egyptianGovernorates';

const createCheckoutSchema = (t: any) => z.object({
    firstName: z.string().min(2, t('errors.required')),
    lastName: z.string().min(2, t('errors.required')),
    email: z.string().email(t('errors.validation')),
    phone: z.string().min(10, t('errors.validation')),
    address: z.string().min(5, t('errors.required')),
    city: z.string().min(2, t('errors.required')),
    governorate: z.string().min(1, t('errors.required')),
    zipCode: z.string().optional(),
});

type CheckoutFormData = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    governorate: string;
    zipCode?: string;
};

export default function CheckoutPage() {
    const t = useTranslations('store.checkout');
    const commonT = useTranslations('errors');
    const locale = useLocale();
    const { subdomain } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { cart, removeFromCart, updateQuantity, getCartTotal, clearCart, addToCart, loadCart } = useCart();
    // Declared early (moved up from below the coupon section) so its
    // `customer` binding is already initialized wherever the auto-apply
    // coupon effect and handleApplyCoupon reference it further down.
    const { customer } = useCustomerAuth();
    const [step, setStep] = useState(1); // 1: Cart, 2: Info, 3: Payment
    const [loading, setLoading] = useState(false);
    const [storeId, setStoreId] = useState<string | null>(null);

    // Fetch storeId on mount for offers
    useEffect(() => {
        getPublicStore(subdomain as string).then((store: any) => setStoreId(store._id));
    }, [subdomain]);

    const handleOfferAccept = (result: any) => {
        if (result.localAccept && result.offer) {
            const offer = result.offer;
            // Add all offer products to cart
            offer.offerProducts.forEach((op: any) => {
                addToCart(
                    {
                        _id: op.productId,
                        name: op.name,
                        price: op.offerPrice,
                        originalPrice: op.basePrice,
                        images: [{ url: op.image }],
                        storeId: storeId,
                    },
                    op.quantity,
                    op.selectedOptions || {},
                    op.variantId
                );
            });

            // If it replaces a product, we should remove the old one.
            if (offer.type === 'upsell' && offer.replacesProductId) {
                const itemToRemove = cart.find(i => i._id === offer.replacesProductId);
                if (itemToRemove) {
                    removeFromCart(itemToRemove.cartItemId);
                }
            }
            toast.success(t('messages.success'));
        }
    };

    const { currentOffer, isProcessing, triggerEvaluation, handleAccept, handleDecline } = useOfferEngine(handleOfferAccept);

    // Stable per-browser-session identity, reused everywhere this page needs
    // one: offer-engine evaluations (below), abandoned-cart capture, and
    // eventually order creation (see onSubmit) so a real order can be
    // matched back to its abandoned-cart record (see
    // publicOrderController.createPublicOrder).
    const getOrCreateSessionId = (): string => {
        if (typeof window === 'undefined') return '';
        let sessionId = localStorage.getItem('storefront_session') || '';
        if (!sessionId) {
            sessionId = Math.random().toString(36).substring(2, 15);
            localStorage.setItem('storefront_session', sessionId);
        }
        return sessionId;
    };

    useEffect(() => {
        if (!storeId || cart.length === 0) return;

        const sessionId = getOrCreateSessionId();

        const event = step === 1 ? 'cart_view' : 'checkout_start';

        triggerEvaluation({
            storeId,
            event: event as any,
            sessionId,
            cartItems: cart.map(item => ({
                productId: item._id,
                variantId: item.variantId,
                quantity: item.quantity,
                price: item.price,
                category: (item as any).category
            })),
            cartSubtotal: getCartTotal()
        });
    }, [step, storeId]);

    const handleExitIntent = () => {
        if (!storeId || cart.length === 0 || currentOffer) return;

        const sessionId = getOrCreateSessionId();
        triggerEvaluation({
            storeId,
            event: 'checkout_abandon_intent',
            sessionId,
            cartItems: cart.map(item => ({
                productId: item._id,
                variantId: item.variantId,
                quantity: item.quantity,
                price: item.price,
                category: (item as any).category
            })),
            cartSubtotal: getCartTotal()
        });
    };

    // Coupon States
    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [verifyingCoupon, setVerifyingCoupon] = useState(false);
    // Set once the shopper explicitly removes an auto-applied coupon, so the
    // effect below doesn't just silently re-apply the same one right back.
    const [autoApplyDismissed, setAutoApplyDismissed] = useState(false);

    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) return;

        setVerifyingCoupon(true);
        try {
            const store = await getPublicStore(subdomain as string) as any;
            const response = await validateCoupon(store._id, couponInput.toUpperCase(), getCartTotal(), customer?.email) as any;

            if (response.success) {
                setAppliedCoupon(response.coupon);
                toast.success(t('messages.couponApplied'));
                setCouponInput('');
            }
        } catch (error: any) {
            const data = error.response?.data;
            if (data?.code === 'MIN_ORDER_AMOUNT') {
                toast.error(t('messages.minAmount', { amount: data.minOrderAmount }));
            } else {
                toast.error(data?.message || t('messages.error'));
            }
        } finally {
            setVerifyingCoupon(false);
        }
    };

    const removeCoupon = () => {
        // Only suppress re-applying when the shopper removed an
        // AUTOMATICALLY-applied coupon — removing a manually-typed one
        // should still let a genuinely-eligible auto-apply coupon step in.
        if (appliedCoupon?.isAutoApplied) setAutoApplyDismissed(true);
        setAppliedCoupon(null);
        toast.info(t('messages.couponRemoved'));
    };

    // Auto-applied cart-threshold discount: no code required. Finds and
    // shows the store's best eligible auto-apply coupon (see
    // publicController.getAutoApplyCoupon) as soon as the cart subtotal
    // qualifies — BEFORE the order is placed, same visibility a
    // manually-typed code gets. Never overrides a coupon the shopper is
    // already actively using (manual or previously auto-applied), and never
    // reappears once explicitly dismissed. The server independently
    // re-derives and re-validates whichever coupon actually applies at
    // order-creation time — this is display/UX only.
    useEffect(() => {
        if (!storeId || cart.length === 0 || appliedCoupon || autoApplyDismissed) return;
        const subtotal = getCartTotal();
        if (subtotal <= 0) return;

        getAutoApplyCoupon(storeId, subtotal, customer?.email)
            .then((response: any) => {
                if (response?.success && response.coupon) {
                    setAppliedCoupon({ ...response.coupon, isAutoApplied: true });
                }
            })
            .catch(() => {
                // No eligible auto-apply coupon right now (404) — nothing to show.
            });
    }, [storeId, cart, appliedCoupon, autoApplyDismissed, customer?.email]);

    const getDiscountAmount = () => {
        if (!appliedCoupon) return 0;
        const subtotal = getCartTotal();

        if (appliedCoupon.type === 'percentage') {
            return (subtotal * appliedCoupon.value) / 100;
        } else if (appliedCoupon.type === 'fixed') {
            return appliedCoupon.value;
        } else if (appliedCoupon.type === 'free_shipping') {
            return shippingFee;
        }
        return 0;
    };

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CheckoutFormData>({
        resolver: zodResolver(createCheckoutSchema(useTranslations())),
    });

    // ================================================================
    // Abandoned-cart capture: the ONLY place that ever calls the
    // capture-abandoned-cart endpoint. Fires once the shopper has typed a
    // plausible email AND has >=1 cart item, debounced so it doesn't fire on
    // every keystroke/quantity click. Triggered from two places below: the
    // email field's onBlur, and a step>=2 effect that re-fires whenever the
    // cart contents change (quantity/removal) while the email is already
    // known. Entirely best-effort — a failure here must never interrupt or
    // surface to the shopper mid-checkout.
    // ================================================================
    const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastCaptureSignatureRef = useRef<string>('');

    const captureCartNow = () => {
        if (!storeId || cart.length === 0) return;
        const email = watch('email');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

        const sessionId = getOrCreateSessionId();
        if (!sessionId) return;

        const signature = JSON.stringify({ email, cart: cart.map(i => `${i.cartItemId}:${i.quantity}`) });
        if (signature === lastCaptureSignatureRef.current) return;
        lastCaptureSignatureRef.current = signature;

        const customerName = `${watch('firstName') || ''} ${watch('lastName') || ''}`.trim();
        captureAbandonedCart(storeId, {
            sessionId,
            customerEmail: email,
            customerName: customerName || undefined,
            customerPhone: watch('phone') || undefined,
            items: cart,
            totalAmount: getCartTotal() + shippingFee,
        }).catch(() => {
            // Best-effort — the shopper's checkout flow must never be
            // interrupted by a failure to save the abandoned-cart snapshot.
        });
    };

    const scheduleCartCapture = () => {
        if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
        captureTimeoutRef.current = setTimeout(captureCartNow, 1000);
    };

    useEffect(() => {
        if (step < 2) return;
        scheduleCartCapture();
        return () => {
            if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, cart, storeId]);

    // ================================================================
    // Abandoned-cart recovery: restores a cart from a recovery email's
    // `?recover=<token>` link (see AbandonedCartRecoveryService.ts /
    // abandonedCartController.getAbandonedCartByToken). The shopper's own
    // browser localStorage cart may be long gone by the time they click an
    // email days later, so this repopulates the cart context directly from
    // the saved AbandonedCart record and jumps straight to the info step.
    // ================================================================
    const recoverAttemptedRef = useRef(false);
    useEffect(() => {
        if (!storeId || recoverAttemptedRef.current) return;
        const token = searchParams.get('recover');
        if (!token) return;
        recoverAttemptedRef.current = true;

        getAbandonedCartByToken(storeId, token)
            .then((data) => {
                if (data?.success && Array.isArray(data.items) && data.items.length > 0) {
                    loadCart(data.items);
                    if (data.customerEmail) setValue('email', data.customerEmail);
                    if (data.customerPhone) setValue('phone', data.customerPhone);
                    setStep(2);
                    toast.success(t('messages.cartRestored'));
                }
            })
            .catch(() => {
                // Invalid/expired token — silently ignore, shopper just sees
                // whatever (if anything) is already in their local cart.
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    // Live shipping-fee estimate, kept in sync with whichever governorate is
    // currently selected — shares resolveShippingFee with the real charge
    // server-side (see getShippingFeeEstimate/publicOrderController.ts) so
    // this can never drift from what the customer is actually charged. Falls
    // back to the store's standardRate (via the same endpoint, called with
    // no governorate) before one is picked, rather than a stale guess.
    const [shippingFee, setShippingFee] = useState(0);
    const selectedGovernorate = watch('governorate');
    useEffect(() => {
        if (!storeId) return;
        let cancelled = false;
        getShippingFeeEstimate(storeId, selectedGovernorate || undefined)
            .then((fee) => { if (!cancelled) setShippingFee(fee); })
            .catch(() => {
                // Leave the last known estimate on a transient failure —
                // the server independently re-resolves the real charge at
                // order-creation time regardless of what's displayed here.
            });
        return () => { cancelled = true; };
    }, [storeId, selectedGovernorate]);

    // Logged-in customer prefill: check out faster by not retyping contact
    // info and a saved address every time. Guarded by a ref so it only
    // fires once — a bare `reset()` on every `customer` change would wipe
    // out whatever the shopper is actively typing. (`customer` itself comes
    // from useCustomerAuth() near the top of this component.)
    const hasPrefilled = useRef(false);
    useEffect(() => {
        if (!customer || hasPrefilled.current) return;
        hasPrefilled.current = true;
        const defaultAddress = customer.addresses?.find((a) => a.isDefault) || customer.addresses?.[0];
        reset({
            firstName: customer.firstName || '',
            lastName: customer.lastName || '',
            email: customer.email || '',
            phone: customer.phone || defaultAddress?.phone || '',
            address: defaultAddress?.address || '',
            city: defaultAddress?.city || '',
            // A saved address's `state` only reliably maps to one of our
            // canonical governorate keys if it was itself saved through this
            // same governorate selector — older/free-text values (or a
            // state that was ever defaulted to city, see
            // publicOrderController.ts) won't match any option, so fall
            // back to blank rather than silently selecting the wrong thing.
            governorate: EGYPTIAN_GOVERNORATES.some(g => g.key === defaultAddress?.state) ? (defaultAddress?.state as string) : '',
            zipCode: defaultAddress?.postalCode !== '00000' ? defaultAddress?.postalCode : '',
        });
    }, [customer, reset]);

    const applySavedAddress = (addr: CustomerAddress) => {
        setValue('address', addr.address, { shouldValidate: true });
        setValue('city', addr.city, { shouldValidate: true });
        setValue('phone', addr.phone, { shouldValidate: true });
        if (EGYPTIAN_GOVERNORATES.some(g => g.key === addr.state)) {
            setValue('governorate', addr.state, { shouldValidate: true });
        }
        if (addr.postalCode && addr.postalCode !== '00000') setValue('zipCode', addr.postalCode);
    };

    const onSubmit = async (data: CheckoutFormData) => {
        if (step < 3) {
            setStep(step + 1);
            return;
        }

        setLoading(true);
        try {
            const store = await getPublicStore(subdomain as string) as any;

            const orderData = {
                storeId: store._id,
                // Lets the backend match this real order back to the
                // abandoned-cart record captured during this same browser
                // session (see AbandonedCart.sessionId / captureCartNow
                // above) and mark it 'recovered' instead of leaving it to
                // linger as pending / get emailed about later.
                sessionId: getOrCreateSessionId(),
                items: cart.map(item => ({
                    ...item,
                    variantId: item.variantId
                })),
                customer: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    phone: data.phone
                },
                shippingAddress: {
                    address: data.address,
                    city: data.city,
                    // Canonical governorate key (see
                    // @shared/constants/egyptianGovernorates) — matched
                    // against store.settings.shipping.zones[].governorate
                    // server-side to resolve the real shipping fee (see
                    // publicOrderController.ts's resolveShippingFee).
                    state: data.governorate,
                    zipCode: data.zipCode
                },
                paymentMethod: 'COD',
                // Display-only — the server independently recomputes the
                // real shipping fee (and total) via resolveShippingFee at
                // order-creation time, so a stale/tampered value here can
                // never change what's actually charged.
                totalAmount: getCartTotal() + shippingFee - getDiscountAmount(),
                couponCode: appliedCoupon?.code,
                discountAmount: getDiscountAmount()
            };

            const response = await createOrder(orderData) as any;
            if (response.success) {
                clearCart();
                toast.success(t('messages.success'));
                router.push(`/order/success/${response.orderNumber}`);
            } else {
                toast.error(response.message || t('messages.error'));
            }
        } catch (error) {
            toast.error(t('messages.error'));
        } finally {
            setLoading(false);
        }
    };

    if (cart.length === 0 && step !== 4) {
        return (
            <div className="container mx-auto px-4 py-20 text-center space-y-8 animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                    <ShoppingCart size={40} />
                </div>
                <h1 className="text-4xl font-black tracking-tighter">{t('empty')}</h1>
                <p className="text-gray-500 max-w-sm mx-auto font-medium">
                    {t('emptySubtitle')}
                </p>
                <Link href="/" className="inline-block store-button">
                    {t('startShopping')}
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto">

                {/* Steps Indicator */}
                <div className="flex items-center justify-center mb-12">
                    {[
                        { n: 1, l: t('steps.cart'), i: <ShoppingCart size={16} /> },
                        { n: 2, l: t('steps.info'), i: <Truck size={16} /> },
                        { n: 3, l: t('steps.payment'), i: <CreditCard size={16} /> }
                    ].map((s, i) => (
                        <div key={s.n} className="flex items-center">
                            <div className={`flex flex-col items-center gap-2 ${step >= s.n ? 'text-black' : 'text-gray-300'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${step >= s.n ? 'border-black bg-black text-white' : 'border-gray-200'}`}>
                                    {step > s.n ? <CheckCircle2 size={16} /> : s.i}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{s.l}</span>
                            </div>
                            {i < 2 && (
                                <div className={`w-20 h-px mx-4 ${step > s.n ? 'bg-black' : 'bg-gray-200'}`} />
                            )}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Left Side: Form/List */}
                    <div className="lg:col-span-8 space-y-8">
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                                <h2 className="text-3xl font-black tracking-tighter">{t('reviewTitle')}</h2>
                                <div className="space-y-4">
                                    {cart.map((item) => (
                                        <div key={item.cartItemId} className="flex flex-col md:flex-row md:items-center gap-6 p-6 bg-gray-50 rounded-[32px] border relative group">
                                            <div className="w-24 h-24 bg-white rounded-2xl overflow-hidden border shrink-0">
                                                {item.image ? (
                                                    <img src={imagePreset.thumbnail(item.image)} alt={item.name} loading="lazy" decoding="async" width={100} height={100} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-200"><Package size={32} /></div>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <h3 className="font-bold text-lg">{item.name}</h3>
                                                {item.selectedOptions && Object.entries(item.selectedOptions).length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {Object.entries(item.selectedOptions).map(([key, value]) => (
                                                            <span key={key} className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border text-gray-400 uppercase tracking-tight">
                                                                {key}: {value}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {item.selectedExtras && item.selectedExtras.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {item.selectedExtras.map((extra) => (
                                                            <span key={extra._id} className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border text-gray-400 uppercase tracking-tight">
                                                                + {extra.name} (EGP {extra.price.toLocaleString()})
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex flex-col md:items-start items-end mt-1">
                                                    {(() => {
                                                        const extrasTotal = (item.selectedExtras || []).reduce((sum, ex) => sum + (Number(ex.price) || 0), 0);
                                                        const lineUnitPrice = item.price + extrasTotal;
                                                        return item.originalPrice && item.originalPrice > lineUnitPrice ? (
                                                            <>
                                                                <span className="font-bold text-green-600">EGP {lineUnitPrice.toLocaleString()}</span>
                                                                <span className="text-xs text-muted-foreground line-through">EGP {item.originalPrice.toLocaleString()}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-gray-500 font-bold">EGP {lineUnitPrice.toLocaleString()}</span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 mt-4 md:mt-0">
                                                <div className="flex items-center bg-white rounded-full p-1 border">
                                                    <button
                                                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.cartItemId)}
                                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <h2 className="text-3xl font-black tracking-tighter">{t('shippingTitle')}</h2>

                                {customer && customer.addresses.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {customer.addresses.map((addr) => (
                                            <button
                                                key={addr._id}
                                                type="button"
                                                onClick={() => applySavedAddress(addr)}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border rounded-full text-xs font-bold text-gray-600 transition-colors"
                                            >
                                                <MapPin size={14} className="text-gray-400" />
                                                {addr.city} — {addr.address.slice(0, 24)}{addr.address.length > 24 ? '…' : ''}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">{t('form.firstName')}</label>
                                        <input {...register('firstName')} className="w-full h-14 bg-gray-50 border rounded-full px-6 outline-none focus:ring-2 focus:ring-black/5" />
                                        {errors.firstName && <p className="text-red-500 text-[10px] font-bold ml-4 uppercase">{errors.firstName.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">{t('form.lastName')}</label>
                                        <input {...register('lastName')} className="w-full h-14 bg-gray-50 border rounded-full px-6 outline-none focus:ring-2 focus:ring-black/5" />
                                        {errors.lastName && <p className="text-red-500 text-[10px] font-bold ml-4 uppercase">{errors.lastName.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">{t('form.email')}</label>
                                        <input {...register('email', { onBlur: scheduleCartCapture })} className="w-full h-14 bg-gray-50 border rounded-full px-6 outline-none focus:ring-2 focus:ring-black/5" />
                                        {errors.email && <p className="text-red-500 text-[10px] font-bold ml-4 uppercase">{errors.email.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">{t('form.phone')}</label>
                                        <input {...register('phone')} className="w-full h-14 bg-gray-50 border rounded-full px-6 outline-none focus:ring-2 focus:ring-black/5" />
                                        {errors.phone && <p className="text-red-500 text-[10px] font-bold ml-4 uppercase">{errors.phone.message}</p>}
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">{t('form.address')}</label>
                                        <input {...register('address')} className="w-full h-14 bg-gray-50 border rounded-full px-6 outline-none focus:ring-2 focus:ring-black/5" />
                                        {errors.address && <p className="text-red-500 text-[10px] font-bold ml-4 uppercase">{errors.address.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">{t('form.city')}</label>
                                        <input {...register('city')} className="w-full h-14 bg-gray-50 border rounded-full px-6 outline-none focus:ring-2 focus:ring-black/5" />
                                        {errors.city && <p className="text-red-500 text-[10px] font-bold ml-4 uppercase">{errors.city.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">{t('form.governorate')}</label>
                                        <select
                                            {...register('governorate')}
                                            defaultValue=""
                                            className="w-full h-14 bg-gray-50 border rounded-full px-6 outline-none focus:ring-2 focus:ring-black/5 appearance-none"
                                        >
                                            <option value="" disabled>{t('form.governoratePlaceholder')}</option>
                                            {EGYPTIAN_GOVERNORATES.map((g) => (
                                                <option key={g.key} value={g.key}>
                                                    {locale === 'ar' ? g.nameAr : g.nameEn}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.governorate && <p className="text-red-500 text-[10px] font-bold ml-4 uppercase">{errors.governorate.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">{t('form.zipCode')}</label>
                                        <input {...register('zipCode')} className="w-full h-14 bg-gray-50 border rounded-full px-6 outline-none focus:ring-2 focus:ring-black/5" />
                                    </div>
                                </form>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <h2 className="text-3xl font-black tracking-tighter">{t('paymentTitle')}</h2>
                                <div className="space-y-4">
                                    <div className="p-6 bg-black text-white rounded-[32px] border flex items-center justify-between group cursor-pointer hover:scale-[1.02] transition">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                                <CreditCard size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold">{t('payment.cod')}</h3>
                                                <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">{t('payment.codSubtitle')}</p>
                                            </div>
                                        </div>
                                        <CheckCircle2 className="text-white" size={24} />
                                    </div>

                                    <div className="p-6 bg-gray-50 text-gray-400 rounded-[32px] border flex items-center justify-between opacity-50 cursor-not-allowed">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                                                <CreditCard size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold">{t('payment.card')}</h3>
                                                <p className="text-[10px] font-black uppercase tracking-widest">{t('payment.cardSubtitle')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Summary */}
                    <div className="lg:col-span-4">
                        <div className="bg-gray-50 rounded-[40px] p-8 border sticky top-24 space-y-8">
                            <h2 className="text-xl font-black tracking-tighter uppercase">{t('orderSummary')}</h2>

                            <div className="space-y-4">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-gray-400 uppercase tracking-widest">{t('subtotal')}</span>
                                    <span className="font-bold">EGP {getCartTotal().toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-gray-400 uppercase tracking-widest">{t('shipping')}</span>
                                    <span className="font-bold">EGP {shippingFee.toLocaleString()}</span>
                                </div>

                                {/* Coupon Section */}
                                <div className="space-y-4 pt-4 border-t border-dashed">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponInput}
                                            onChange={(e) => setCouponInput(e.target.value)}
                                            placeholder={t('couponPlaceholder')}
                                            className="flex-1 h-12 bg-white border rounded-full px-6 outline-none text-sm font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5"
                                            disabled={(!!appliedCoupon && !appliedCoupon.isAutoApplied) || verifyingCoupon}
                                        />
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={!couponInput || (!!appliedCoupon && !appliedCoupon.isAutoApplied) || verifyingCoupon}
                                            className="h-12 px-6 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 transition disabled:opacity-50"
                                        >
                                            {verifyingCoupon ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('applyCoupon')}
                                        </button>
                                    </div>
                                    {appliedCoupon && (
                                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-2xl border border-green-100 text-green-700 animate-in zoom-in-95 duration-300">
                                            <div className="flex items-center gap-2">
                                                <Ticket size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">
                                                    {appliedCoupon.code} {appliedCoupon.isAutoApplied ? (t('autoApplied') || 'auto-applied') : t('applied')}
                                                </span>
                                            </div>
                                            <button onClick={removeCoupon} className="p-1 hover:bg-green-100 rounded-full transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {appliedCoupon && (
                                    <div className="flex justify-between text-sm font-medium text-green-600">
                                        <span className="uppercase tracking-widest">{t('discount')}</span>
                                        <span className="font-bold">- EGP {getDiscountAmount().toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="h-px bg-gray-200" />
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-lg font-black tracking-tighter uppercase">{t('total')}</span>
                                    <span className="text-2xl font-black">EGP {(getCartTotal() + shippingFee - getDiscountAmount()).toLocaleString()}</span>
                                </div>
                            </div>

                            <button
                                disabled={loading}
                                onClick={step === 1 ? () => setStep(2) : () => {
                                    handleSubmit(onSubmit)();
                                }}
                                className="w-full h-16 bg-black text-white rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-900 transition disabled:opacity-50"
                            >
                                {loading ? t('processing') : step === 3 ? t('placeOrder') : t('continue')} <ChevronRight size={18} />
                            </button>

                            {step > 1 && (
                                <button
                                    onClick={() => setStep(step - 1)}
                                    className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors"
                                >
                                    {t('goBack')}
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Offer Modals & Triggers */}
            <OfferModal 
                offer={currentOffer}
                isOpen={!!currentOffer && (currentOffer.type === 'cross_sell' || currentOffer.type === 'down_sell')}
                isProcessing={isProcessing}
                onAccept={handleAccept}
                onDecline={handleDecline}
            />
            {step > 1 && <DownSellOverlay onExitIntent={handleExitIntent} disabled={!!currentOffer} />}
        </div>
    );
}

function Plus({ size }: { size: number }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
}

function Minus({ size }: { size: number }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>;
}
