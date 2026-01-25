'use client';

import { useState, use } from "react";
import { Search, Loader2, Package, Truck, CheckCircle2, Clock, MapPin, Copy } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";
import { useParams } from "next/navigation";
import { usePublicStore } from "@/lib/hooks/usePublicStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TrackOrderPage() {
    const params = useParams();
    const subdomain = params.subdomain as string;
    const { data: store } = usePublicStore(subdomain);

    const [orderNumber, setOrderNumber] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [order, setOrder] = useState<any>(null);
    const [error, setError] = useState("");

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderNumber || !store) return;

        setIsLoading(true);
        setError("");
        setOrder(null);

        try {
            const response = await api.get(`/public/orders/track/${orderNumber}?storeId=${store._id}`);
            setOrder(response.data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Order not found. Please check the order number and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="w-5 h-5 text-amber-500" />;
            case 'confirmed': return <Package className="w-5 h-5 text-blue-500" />;
            case 'processing': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'shipped': return <Truck className="w-5 h-5 text-purple-500" />;
            case 'delivered': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            default: return <Package className="w-5 h-5 text-gray-500" />;
        }
    };

    const primaryColor = store?.branding?.primaryColor || "#3B82F6";

    return (
        <div className="container mx-auto px-4 py-20 max-w-4xl space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Track Your Order</h1>
                <p className="text-gray-500 font-medium max-w-lg mx-auto">
                    Enter your order number to check the current status and estimated delivery time.
                </p>
            </div>

            <Card className="border-2 shadow-xl rounded-[32px] overflow-hidden">
                <CardContent className="p-8 md:p-12">
                    <form onSubmit={handleTrack} className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                                placeholder="Order Number (e.g. QS-260120-8230)"
                                value={orderNumber}
                                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                                className="pl-12 h-14 rounded-2xl border-2 focus-visible:ring-offset-0 focus-visible:ring-2"
                                style={{ borderColor: primaryColor + '20' }}
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isLoading || !orderNumber}
                            className="h-14 px-10 rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Track Now"}
                        </Button>
                    </form>

                    {error && (
                        <p className="mt-4 text-center text-red-500 font-bold text-sm bg-red-50 p-4 rounded-xl border border-red-100 italic">
                            {error}
                        </p>
                    )}
                </CardContent>
            </Card>

            {order && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <span>Order {order.orderNumber}</span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(order.orderNumber);
                                        toast.success('Order Number copied!');
                                    }}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors border-2 border-transparent group"
                                    title="Copy Order Number"
                                >
                                    <Copy className="h-4 w-4 text-gray-400 group-hover:text-gray-900 transition-colors" />
                                </button>
                                <Badge className="rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest" variant="secondary">
                                    {order.status}
                                </Badge>
                            </h2>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                                Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { dateStyle: 'long' })}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Total Amount</p>
                            <p className="text-3xl font-black" style={{ color: primaryColor }}>EGP {order.total.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Order Timeline */}
                        <div className="md:col-span-2 space-y-6">
                            <Card className="rounded-[32px] border-2 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg font-black">Order Progress</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    <div className="relative space-y-8">
                                        <div className="absolute left-[10px] top-2 bottom-2 w-0.5 bg-gray-100" />

                                        {order.timeline.map((event: any, idx: number) => (
                                            <div key={idx} className="relative flex gap-6 pl-8">
                                                <div className="absolute left-0 top-1.5 w-[22px] h-[22px] rounded-full bg-white border-4 flex items-center justify-center z-10"
                                                    style={{ borderColor: idx === order.timeline.length - 1 ? primaryColor : '#E5E7EB' }}>
                                                    {idx === order.timeline.length - 1 && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-bold text-sm capitalize">{event.status}</p>
                                                    <p className="text-xs text-gray-500">{event.note}</p>
                                                    <p className="text-[10px] text-gray-400 font-medium uppercase">{new Date(event.timestamp).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Order Items */}
                            <Card className="rounded-[32px] border-2 shadow-sm overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-lg font-black">Order Contents</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y">
                                        {order.items.map((item: any, idx: number) => (
                                            <div key={idx} className="p-4 flex gap-4 items-center">
                                                <div className="w-16 h-16 bg-gray-50 rounded-2xl border overflow-hidden flex-shrink-0">
                                                    {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm">{item.name}</p>
                                                    <p className="text-xs text-gray-500">{item.quantity} x EGP {item.price.toLocaleString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-sm">EGP {(item.price * item.quantity).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-gray-50/50 p-6 space-y-2">
                                        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                                            <span>Subtotal</span>
                                            <span>EGP {order.subtotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                                            <span>Shipping</span>
                                            <span>EGP {order.shipping.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-black border-t pt-4">
                                            <span>Total</span>
                                            <span style={{ color: primaryColor }}>EGP {order.total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Shipping Info */}
                        <Card className="rounded-[32px] border-2 shadow-sm h-fit">
                            <CardHeader>
                                <CardTitle className="text-lg font-black">Delivery Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <div className="p-2 border rounded-xl bg-gray-50">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest">Shipping Address</p>
                                    </div>
                                    <div className="pl-12 text-sm font-medium space-y-1">
                                        <p className="font-black">{order.shippingAddress.fullName}</p>
                                        <p className="text-gray-600">{order.shippingAddress.address}</p>
                                        <p className="text-gray-600">{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                                        <p className="text-gray-400">{order.shippingAddress.phone}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <div className="p-2 border rounded-xl bg-gray-50">
                                            {getStatusIcon(order.status)}
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest">Current Status</p>
                                    </div>
                                    <div className="pl-12">
                                        <p className="font-black capitalize">{order.status}</p>
                                        <p className="text-xs text-gray-500">Your order is being {order.status === 'pending' ? 'reviewed' : order.status}.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
