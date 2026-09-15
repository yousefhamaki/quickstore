'use client';

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MapPin, Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { usePublicStore } from "@shared/lib/hooks/usePublicStore";
import { useCustomerAuth } from "@shared/context/CustomerAuthContext";
import {
    addMyAddress,
    updateMyAddress,
    deleteMyAddress,
    type CustomerAddress
} from "@shared/services/customerAuthService";
import { Card, CardContent } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@shared/components/ui/dialog";
import { AccountNav } from "../AccountNav";
import { RequireCustomer } from "../RequireCustomer";

type AddressFormState = Omit<CustomerAddress, '_id' | 'isDefault'> & { isDefault: boolean };

const emptyForm: AddressFormState = {
    fullName: '', phone: '', address: '', city: '', state: '', postalCode: '', country: 'Egypt', isDefault: false
};

function AddressesContent({ storeId, primaryColor }: { storeId: string; primaryColor: string }) {
    const t = useTranslations('store.account.addresses');
    const { customer, refresh } = useCustomerAuth();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<AddressFormState>(emptyForm);
    const [isSaving, setIsSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const addresses = customer?.addresses || [];

    const openAdd = () => {
        setEditingId(null);
        setForm(emptyForm);
        setDialogOpen(true);
    };

    const openEdit = (addr: CustomerAddress) => {
        setEditingId(addr._id || null);
        setForm({
            fullName: addr.fullName, phone: addr.phone, address: addr.address,
            city: addr.city, state: addr.state, postalCode: addr.postalCode,
            country: addr.country, isDefault: addr.isDefault
        });
        setDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingId) {
                await updateMyAddress(storeId, editingId, form);
            } else {
                await addMyAddress(storeId, form);
            }
            await refresh();
            toast.success(editingId ? t('updated') : t('added'));
            setDialogOpen(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (addressId: string) => {
        if (!confirm(t('deleteConfirm'))) return;
        setBusyId(addressId);
        try {
            await deleteMyAddress(storeId, addressId);
            await refresh();
            toast.success(t('deleted'));
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error');
        } finally {
            setBusyId(null);
        }
    };

    const handleSetDefault = async (addressId: string) => {
        setBusyId(addressId);
        try {
            await updateMyAddress(storeId, addressId, { isDefault: true });
            await refresh();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
                <AccountNav primaryColor={primaryColor} />
            </div>
            <div className="lg:col-span-3 space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-black tracking-tighter">{t('title')}</h1>
                    <Button onClick={openAdd} className="rounded-2xl font-black text-xs uppercase tracking-widest" style={{ backgroundColor: primaryColor }}>
                        <Plus className="w-4 h-4 mr-2" /> {t('addNew')}
                    </Button>
                </div>

                {addresses.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                            <MapPin size={24} />
                        </div>
                        <p className="text-gray-500 font-bold">{t('empty')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addresses.map((addr) => (
                            <Card key={addr._id} className="rounded-[32px] border-2 shadow-sm">
                                <CardContent className="p-6 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <p className="font-black">{addr.fullName}</p>
                                        {addr.isDefault && (
                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full" style={{ backgroundColor: primaryColor + '15', color: primaryColor }}>
                                                {t('default')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-0.5">
                                        <p>{addr.address}</p>
                                        <p>{addr.city}, {addr.state}</p>
                                        <p className="text-gray-400">{addr.phone}</p>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <button
                                            onClick={() => openEdit(addr)}
                                            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-black transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5" /> {t('edit')}
                                        </button>
                                        <button
                                            onClick={() => addr._id && handleDelete(addr._id)}
                                            disabled={busyId === addr._id}
                                            className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> {t('delete')}
                                        </button>
                                        {!addr.isDefault && (
                                            <button
                                                onClick={() => addr._id && handleSetDefault(addr._id)}
                                                disabled={busyId === addr._id}
                                                className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-black transition-colors ml-auto"
                                            >
                                                {busyId === addr._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />} {t('setDefault')}
                                            </button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-[32px] max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingId ? t('edit') : t('addNew')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest ml-1">{t('form.fullName')}</label>
                            <Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="rounded-xl h-11" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest ml-1">{t('form.phone')}</label>
                            <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl h-11" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest ml-1">{t('form.address')}</label>
                            <Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-xl h-11" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest ml-1">{t('form.city')}</label>
                                <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl h-11" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest ml-1">{t('form.state')}</label>
                                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-xl h-11" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isDefault"
                                checked={form.isDefault}
                                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                                className="w-4 h-4 rounded"
                            />
                            <label htmlFor="isDefault" className="text-xs font-bold text-gray-600">{t('form.isDefault')}</label>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>
                                {t('form.cancel')}
                            </Button>
                            <Button type="submit" disabled={isSaving} className="rounded-xl font-black text-xs uppercase tracking-widest" style={{ backgroundColor: primaryColor }}>
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('form.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function AccountAddressesPage() {
    const params = useParams();
    const subdomain = params.subdomain as string;
    const { data: storeData } = usePublicStore(subdomain);
    const store = storeData as any;
    const primaryColor = store?.branding?.primaryColor || "#3B82F6";
    const storeId = store?._id || store?.id;

    return (
        <div className="container mx-auto px-4 py-20 max-w-6xl">
            <RequireCustomer primaryColor={primaryColor}>
                {storeId && <AddressesContent storeId={storeId} primaryColor={primaryColor} />}
            </RequireCustomer>
        </div>
    );
}
