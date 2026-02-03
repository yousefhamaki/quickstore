'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { getPublicStore } from '@/services/publicStoreService';
import { createOrder } from '@/services/publicOrderService';
import { ShoppingCart, Truck, CreditCard, ChevronRight, ChevronLeft, Package, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const createCheckoutSchema = (t: any) => z.object({
    firstName: z.string().min(2, t('errors.required')),
    lastName: z.string().min(2, t('errors.required')),
    email: z.string().email(t('errors.validation')),
    phone: z.string().min(10, t('errors.validation')),
    address: z.string().min(5, t('errors.required')),
    city: z.string().min(2, t('errors.required')),
    zipCode: z.string().optional(),
});

type CheckoutFormData = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode?: string;
};

export default function CheckoutPage() {
    const t = useTranslations('store.checkout');
    const commonT = useTranslations('errors');
    const { subdomain } = useParams();
    const router = useRouter();
    const { cart, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();
    const [step, setStep] = useState(1); // 1: Cart, 2: Info, 3: Payment
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<CheckoutFormData>({
        resolver: zodResolver(createCheckoutSchema(useTranslations())),
    });

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
                items: cart,
                customer: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    phone: data.phone
                },
                shippingAddress: {
                    address: data.address,
                    city: data.city,
                    zipCode: data.zipCode
                },
                paymentMethod: 'COD',
                totalAmount: getCartTotal() + 50
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
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${step >= s.n ? 'border-black bg-black text-white' : 'border-gray-200'}`}>
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
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
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
                                                <p className="text-gray-500 font-bold">EGP {item.price.toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 mt-4 md:mt-0">
                                                <div className="flex items-center bg-white rounded-full p-1 border">
                                                    <button
                                                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all"
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
                                        <input {...register('email')} className="w-full h-14 bg-gray-50 border rounded-full px-6 outline-none focus:ring-2 focus:ring-black/5" />
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
                                    <div className="p-6 bg-black text-white rounded-[32px] border flex items-center justify-between group cursor-pointer hover:scale-[1.02] transition-all">
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
                                    <span className="font-bold">EGP 50</span>
                                </div>
                                <div className="h-px bg-gray-200" />
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-lg font-black tracking-tighter uppercase">{t('total')}</span>
                                    <span className="text-2xl font-black">EGP {(getCartTotal() + 50).toLocaleString()}</span>
                                </div>
                            </div>

                            <button
                                disabled={loading}
                                onClick={step === 1 ? () => setStep(2) : () => {
                                    handleSubmit(onSubmit)();
                                }}
                                className="w-full h-16 bg-black text-white rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-900 transition-all disabled:opacity-50"
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
        </div>
    );
}

function Plus({ size }: { size: number }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
}

function Minus({ size }: { size: number }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>;
}
