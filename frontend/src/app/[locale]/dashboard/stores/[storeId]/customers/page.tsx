'use client';

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    Search,
    Filter,
    UserPlus,
    Loader2,
    Calendar,
    Mail,
    Phone,
    ExternalLink
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { getCustomers } from "@/services/customerService";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export default function StoreCustomersPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const t = useTranslations('merchant.customers');
    const localeString = useLocale();
    const dateLocale = localeString === 'ar' ? ar : enUS;

    const [searchTerm, setSearchTerm] = useState("");
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    const fetchCustomers = async (page = 1) => {
        try {
            setLoading(true);
            const data = await getCustomers(storeId, searchTerm, page) as any;
            setCustomers(data.customers);
            setPagination({
                page: data.page,
                pages: data.pages,
                total: data.total
            });
        } catch (error) {
            toast.error(t('loadError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchCustomers(1);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, storeId]);

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${localeString === 'ar' ? 'text-right' : 'text-left'}`}>
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight uppercase">{t('title')}</h1>
                    <p className="text-muted-foreground text-sm font-medium">{t('subtitle')}</p>
                </div>
                <Button className="rounded-2xl shadow-lg shadow-primary/20 h-12 px-6 font-bold uppercase tracking-widest text-xs">
                    <UserPlus className={`w-4 h-4 ${localeString === 'ar' ? 'ml-2' : 'mr-2'}`} /> {t('addCustomer')}
                </Button>
            </div>

            <Card className="border-2 shadow-sm rounded-[32px] overflow-hidden">
                <CardHeader className="bg-muted/30 border-b p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className={`absolute ${localeString === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4`} />
                            <input
                                type="text"
                                placeholder={t('searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full ${localeString === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} h-12 rounded-2xl border-border bg-background focus:ring-4 focus:ring-primary/10 border-2 transition-all text-sm font-bold outline-none`}
                            />
                        </div>
                        <Button variant="outline" className="h-12 px-6 rounded-2xl border-2 font-bold uppercase tracking-widest text-xs">
                            <Filter className={`w-4 h-4 ${localeString === 'ar' ? 'ml-2' : 'mr-2'}`} /> {t('filters')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-24 space-y-4">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Loading Customers...</p>
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center space-y-6">
                            <div className="w-20 h-20 rounded-[32px] bg-primary/10 flex items-center justify-center text-primary">
                                <Users className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black uppercase tracking-tight">{t('noCustomersFound')}</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium">
                                    {t('noCustomersSubtitle')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/30 border-b">
                                        <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground ${localeString === 'ar' ? 'text-right' : 'text-left'}`}>{t('table.name')}</th>
                                        <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground ${localeString === 'ar' ? 'text-right' : 'text-left'}`}>{t('table.orders')}</th>
                                        <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground ${localeString === 'ar' ? 'text-right' : 'text-left'}`}>{t('table.joined')}</th>
                                        <th className={`px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground ${localeString === 'ar' ? 'text-left' : 'text-right'}`}>{t('table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {customers.map((customer) => (
                                        <tr key={customer._id} className="hover:bg-muted/10 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs">
                                                        {customer.firstName[0]}{customer.lastName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold">{customer.firstName} {customer.lastName}</p>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Mail className="w-3 h-3" /> {customer.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                                                    {customer.orders?.length || 0} Orders
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-muted-foreground font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {format(new Date(customer.createdAt), 'MMM dd, yyyy', { locale: dateLocale })}
                                                </div>
                                            </td>
                                            <td className={`px-6 py-5 ${localeString === 'ar' ? 'text-left' : 'text-right'}`}>
                                                <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
