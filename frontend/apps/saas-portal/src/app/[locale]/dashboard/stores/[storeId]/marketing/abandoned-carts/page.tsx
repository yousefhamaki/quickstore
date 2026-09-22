'use client';

import { use, useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import {
    ShoppingCart,
    ArrowLeft,
    Loader2,
    RefreshCw,
    Mail,
    Phone,
    CheckCircle2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getAbandonedCarts, updateAbandonedCartStatus } from "@shared/services/marketingService";

interface AbandonedCartItem {
    name?: string;
    quantity?: number;
    price?: number;
}

interface AbandonedCart {
    _id: string;
    customerEmail: string;
    customerName?: string;
    customerPhone?: string;
    items: AbandonedCartItem[];
    totalAmount: number;
    status: 'pending' | 'recovered' | 'contacted';
    recoveryEmailSentAt?: string;
    createdAt: string;
}

export default function AbandonedCartsPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const router = useRouter();

    const [carts, setCarts] = useState<AbandonedCart[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        fetchCarts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    const fetchCarts = async () => {
        try {
            setLoading(true);
            const data = await getAbandonedCarts(storeId) as any;
            setCarts(data.carts || []);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to load abandoned carts");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkContacted = async (id: string) => {
        try {
            setUpdatingId(id);
            await updateAbandonedCartStatus(id, 'contacted');
            toast.success("Marked as contacted");
            setCarts((prev) => prev.map((c) => (c._id === id ? { ...c, status: 'contacted' } : c)));
        } catch (error) {
            toast.error("Failed to update cart status");
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic text-primary">Cart Recovery</h1>
                        <p className="text-muted-foreground text-sm font-medium">Shoppers who started checkout but never completed their order.</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="rounded-2xl h-12 font-black uppercase tracking-widest text-[10px]"
                    onClick={fetchCarts}
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <p className="font-bold uppercase tracking-widest text-xs text-muted-foreground">Loading lost carts...</p>
                </div>
            ) : carts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {carts.map((cart) => (
                        <Card key={cart._id} className="border-2 shadow-sm rounded-3xl overflow-hidden group hover:border-primary transition relative">
                            <CardHeader className="bg-muted/30 border-b p-6 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Badge
                                        variant={cart.status === 'pending' ? 'secondary' : 'default'}
                                        className="rounded-full font-black text-[10px] uppercase px-3"
                                    >
                                        {cart.status}
                                    </Badge>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        {new Date(cart.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-amber-500" />
                                        {cart.customerEmail}
                                    </CardTitle>
                                    {cart.customerName && (
                                        <p className="text-xs font-bold text-muted-foreground">{cart.customerName}</p>
                                    )}
                                    {cart.customerPhone && (
                                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {cart.customerPhone}
                                        </p>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-2">
                                    {(cart.items || []).slice(0, 4).map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 border text-xs">
                                            <span className="font-bold truncate pr-2">{item.name || 'Item'} {item.quantity ? `× ${item.quantity}` : ''}</span>
                                            {typeof item.price === 'number' && (
                                                <span className="font-bold text-muted-foreground shrink-0">EGP {item.price.toLocaleString()}</span>
                                            )}
                                        </div>
                                    ))}
                                    {(cart.items || []).length > 4 && (
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase text-center">
                                            +{cart.items.length - 4} more item(s)
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between px-2 pt-2 border-t border-dashed">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cart Total</span>
                                    <span className="text-lg font-black">EGP {(cart.totalAmount || 0).toLocaleString()}</span>
                                </div>

                                <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-muted-foreground">Recovery Email</span>
                                    <span className={cart.recoveryEmailSentAt ? "text-emerald-600" : "text-muted-foreground"}>
                                        {cart.recoveryEmailSentAt ? `Sent ${new Date(cart.recoveryEmailSentAt).toLocaleDateString()}` : 'Not sent yet'}
                                    </span>
                                </div>

                                {cart.status === 'pending' && (
                                    <Button
                                        variant="outline"
                                        className="w-full rounded-2xl h-11 font-black uppercase tracking-widest text-[10px]"
                                        disabled={updatingId === cart._id}
                                        onClick={() => handleMarkContacted(cart._id)}
                                    >
                                        {updatingId === cart._id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                Mark as Contacted
                                            </>
                                        )}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-6 rounded-[40px] border-4 border-dashed bg-muted/10">
                    <div className="w-24 h-24 rounded-[32px] bg-muted flex items-center justify-center text-muted-foreground opacity-50">
                        <ShoppingCart className="w-12 h-12" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic opacity-50">No abandoned carts yet</h3>
                        <p className="text-muted-foreground text-sm font-medium max-w-sm mx-auto">
                            Once shoppers start checkout without completing it, they'll show up here.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
