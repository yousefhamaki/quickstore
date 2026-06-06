'use client';

import { use, useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ShoppingBag, Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { getOrderDetails } from "@/services/publicOrderService";
import { OrderSuccessTracker } from "@/components/storefront/OrderSuccessTracker";

interface PageProps {
    params: Promise<{
        orderNumber: string;
    }>;
}

export default function OrderSuccessPage({ params }: PageProps) {
    const { orderNumber } = use(params);
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const response = await getOrderDetails(orderNumber) as any;
                if (response.success) {
                    setOrder(response.order);
                }
            } catch (error) {
                console.error('Failed to fetch order details:', error);
                // Still show success page even if fetch fails
            } finally {
                setLoading(false);
            }
        };

        if (orderNumber) {
            fetchOrder();
        }
    }, [orderNumber]);

    return (
        <div className="container mx-auto px-4 py-20 text-center space-y-12 animate-in fade-in zoom-in duration-700">
            {/* Track purchase event for marketing pixels */}
            {order && (
                <OrderSuccessTracker
                    orderId={order._id}
                    orderTotal={order.totalAmount}
                    orderItems={order.items}
                />
            )}

            <div className="space-y-6">
                <div className="w-24 h-24 bg-green-50 text-green-500 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-green-500/10">
                    <CheckCircle2 size={48} />
                </div>
                <div className="space-y-4">
                    <h1 className="text-5xl font-black tracking-tighter">Order Placed!</h1>
                    <p className="text-gray-500 text-lg font-medium max-w-sm mx-auto">
                        Thank you for your purchase. Your order has been received and is being processed.
                    </p>
                </div>
            </div>

            <div className="bg-gray-50 rounded-[40px] p-8 max-w-md mx-auto border relative">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Order Number</p>
                    <div className="flex items-center justify-center gap-2">
                        <p className="text-xl font-mono font-black select-all">{orderNumber}</p>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(orderNumber);
                                toast.success('Order Number copied!');
                            }}
                            className="p-1.5 hover:bg-white/80 rounded-lg transition-colors border-2 border-transparent group"
                            title="Copy Order Number"
                        >
                            <Copy className="h-4 w-4 text-gray-400 group-hover:text-black transition-colors" />
                        </button>
                    </div>
                </div>
                {/* Decorative cutouts for ticket look */}
                <div className="absolute top-1/2 -left-3 w-6 h-6 bg-white rounded-full -translate-y-1/2" />
                <div className="absolute top-1/2 -right-3 w-6 h-6 bg-white rounded-full -translate-y-1/2" />
            </div>

            {/* Order Summary (if loaded) */}
            {loading && (
                <div className="flex items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Loading order details...</span>
                </div>
            )}

            {order && !loading && (
                <div className="bg-white rounded-[32px] p-6 max-w-md mx-auto border space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Order Summary</h3>
                    <div className="space-y-2">
                        {order.items?.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                    {item.quantity}x {item.name}
                                </span>
                                <span className="font-bold">EGP {(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <div className="h-px bg-gray-200" />
                    <div className="flex justify-between items-center">
                        <span className="font-black uppercase tracking-widest">Total</span>
                        <span className="text-xl font-black">EGP {order.totalAmount?.toLocaleString()}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col items-center gap-4">
                <Link
                    href="/"
                    className="store-button px-12 h-16 flex items-center gap-3 shadow-xl"
                >
                    <ShoppingBag size={20} /> Continue Shopping
                </Link>
                <Link
                    href="/"
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors flex items-center gap-2"
                >
                    <ChevronLeft size={14} /> Back to Store
                </Link>
            </div>

            <div className="pt-20">
                <p className="text-[10px] font-black tracking-[0.2em] text-gray-300 uppercase">
                    A confirmation details will be sent to your email.
                </p>
            </div>

            {/* Background decoration */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 text-green-500/5">
                <div className="absolute top-[10%] left-[-10%] w-[40%] aspect-square bg-current blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] aspect-square bg-current blur-[120px] rounded-full" />
            </div>
        </div>
    );
}
