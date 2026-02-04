'use client';

import { use, useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Ticket,
    Plus,
    Trash2,
    Edit,
    Calendar,
    Users,
    ArrowLeft,
    Loader2,
    RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getCoupons, createCoupon, updateCoupon, deleteCoupon, Coupon } from "@/services/marketingService";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function CouponsPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const router = useRouter();
    const t = useTranslations("merchant.marketing.coupons");

    console.log(t("title"))
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        code: '',
        type: 'percentage' as 'percentage' | 'fixed' | 'free_shipping',
        value: 0,
        maxUsage: -1,
        minOrderAmount: 0,
        expiresAt: '',
        isActive: true
    });

    useEffect(() => {
        fetchCoupons();
    }, [storeId]);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const data = await getCoupons(storeId) as any;
            setCoupons(data.coupons || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load coupons");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (coupon: Coupon | null = null) => {
        if (coupon) {
            setEditingCoupon(coupon);
            setFormData({
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
                maxUsage: coupon.maxUsage,
                minOrderAmount: coupon.minOrderAmount || 0,
                expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '',
                isActive: coupon.isActive
            });
        } else {
            setEditingCoupon(null);
            setFormData({
                code: '',
                type: 'percentage',
                value: 0,
                maxUsage: -1,
                minOrderAmount: 0,
                expiresAt: '',
                isActive: true
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingCoupon) {
                await updateCoupon(editingCoupon._id, {
                    ...formData,
                    expiresAt: formData.expiresAt || undefined
                });
                toast.success(t("successUpdate"));
            } else {
                await createCoupon({
                    ...formData,
                    storeId,
                    expiresAt: formData.expiresAt || undefined
                });
                toast.success(t("successCreate"));
            }
            fetchCoupons();
            setModalOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Error saving coupon");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t("confirmDelete"))) return;
        try {
            await deleteCoupon(id);
            toast.success(t("successDelete"));
            fetchCoupons();
        } catch (error) {
            toast.error("Error deleting coupon");
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
                        <h1 className="text-3xl font-black tracking-tighter uppercase italic text-primary">{t("title")}</h1>
                        <p className="text-muted-foreground text-sm font-medium">{t("subtitle")}</p>
                    </div>
                </div>
                <Button
                    className="rounded-2xl px-6 h-12 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                    onClick={() => handleOpenModal()}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("create")}
                </Button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <p className="font-bold uppercase tracking-widest text-xs text-muted-foreground">{t("syncing")}</p>
                </div>
            ) : coupons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coupons.map((coupon) => (
                        <Card key={coupon._id} className="border-2 shadow-sm rounded-3xl overflow-hidden group hover:border-primary transition-all relative glass">
                            <CardHeader className="bg-muted/30 border-b p-6 flex flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <Badge variant={coupon.isActive ? "default" : "secondary"} className="rounded-full font-black text-[10px] uppercase px-3">
                                        {coupon.isActive ? t("active") : t("inactive")}
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                        <Ticket className="w-5 h-5 text-orange-500" />
                                        <CardTitle className="text-xl font-black uppercase tracking-tight">{coupon.code}</CardTitle>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary" onClick={() => handleOpenModal(coupon)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-red-50 hover:text-red-500" onClick={() => handleDelete(coupon._id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-muted/30 space-y-1 border">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{t("type")}</p>
                                        <p className="font-black text-sm uppercase">{t(coupon.type)}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-muted/30 space-y-1 border">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{t("value")}</p>
                                        <p className="font-black text-sm uppercase">
                                            {coupon.type === 'percentage' ? `${coupon.value}%` : `EGP ${coupon.value}`}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs font-bold px-2">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Users className="w-3 h-3" />
                                            <span className="uppercase tracking-widest">{t("usage")}</span>
                                        </div>
                                        <span>{coupon.usageCount} / {coupon.maxUsage === -1 ? '∞' : coupon.maxUsage}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-bold px-2">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="w-3 h-3" />
                                            <span className="uppercase tracking-widest">{t("expiresAt")}</span>
                                        </div>
                                        <span className="uppercase tracking-tighter">
                                            {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : t("unlimited")}
                                        </span>
                                    </div>
                                    {coupon.minOrderAmount !== undefined && coupon.minOrderAmount > 0 && (
                                        <div className="flex items-center justify-between text-xs font-bold px-2 text-primary pt-1 border-t border-dashed">
                                            <span className="uppercase tracking-widest text-[10px]">{t("minAmountRequirement", { amount: coupon.minOrderAmount })}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-6 rounded-[40px] border-4 border-dashed bg-muted/10">
                    <div className="w-24 h-24 rounded-[32px] bg-muted flex items-center justify-center text-muted-foreground opacity-50">
                        <RefreshCw className="w-12 h-12" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic opacity-50">{t("noCoupons")}</h3>
                    </div>
                    <Button
                        size="lg"
                        className="rounded-2xl px-12 h-14 font-black uppercase tracking-widest text-xs"
                        onClick={() => handleOpenModal()}
                    >
                        {t("create")}
                    </Button>
                </div>
            )}

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[32px] p-0 border-0 overflow-hidden glass">
                    <div className="bg-primary/5 p-8 border-b">
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">
                            {editingCoupon ? t("edit") : t("create")}
                        </DialogTitle>
                        <DialogDescription className="font-medium">
                            {t("modalSubtitle")}
                        </DialogDescription>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">{t("code")}</Label>
                                <Input
                                    className="h-14 rounded-2xl font-black uppercase tracking-widest border-2 focus:ring-primary"
                                    placeholder="SUMMER25"
                                    required
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">{t("type")}</Label>
                                    <select
                                        className="w-full h-14 rounded-2xl p-3 border-2 font-black uppercase tracking-widest text-[10px] bg-background focus:ring-primary outline-none"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                    >
                                        <option value="percentage">{t("percentage")}</option>
                                        <option value="fixed">{t("fixed")}</option>
                                        <option value="free_shipping">{t("free_shipping")}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">{t("value")}</Label>
                                    <Input
                                        type="number"
                                        className="h-14 rounded-2xl font-black border-2 focus:ring-primary"
                                        required
                                        disabled={formData.type === 'free_shipping'}
                                        value={formData.value}
                                        onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">{t("maxUsage")}</Label>
                                    <Input
                                        type="number"
                                        className="h-14 rounded-2xl font-black border-2 focus:ring-primary"
                                        required
                                        value={formData.maxUsage}
                                        onChange={e => setFormData({ ...formData, maxUsage: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">{t("expiresAt")}</Label>
                                    <Input
                                        type="date"
                                        className="h-14 rounded-2xl font-black border-2 focus:ring-primary"
                                        value={formData.expiresAt}
                                        onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">{t("minOrderAmount")}</Label>
                                <Input
                                    type="number"
                                    className="h-14 rounded-2xl font-black border-2 focus:ring-primary"
                                    required
                                    value={formData.minOrderAmount}
                                    onChange={e => setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) })}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border">
                                <div className="space-y-0.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest">{t("status")}</Label>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase">{t("statusSubtitle")}</p>
                                </div>
                                <Switch
                                    checked={formData.isActive}
                                    onCheckedChange={checked => setFormData({ ...formData, isActive: checked })}
                                />
                            </div>
                        </div>

                        <DialogFooter className="p-8 pt-0 gap-3 sm:gap-0">
                            <Button type="button" variant="outline" className="rounded-2xl h-14 font-black uppercase tracking-widest text-[10px] border-2" onClick={() => setModalOpen(false)}>
                                {t("cancel")}
                            </Button>
                            <Button type="submit" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingCoupon ? t("update") : t("create"))}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
