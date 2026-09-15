'use client';

import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Package, MapPin, Mail, Phone } from "lucide-react";
import { usePublicStore } from "@shared/lib/hooks/usePublicStore";
import { useCustomerAuth } from "@shared/context/CustomerAuthContext";
import { Card, CardContent } from "@shared/components/ui/card";
import { AccountNav } from "./AccountNav";
import { RequireCustomer } from "./RequireCustomer";

function AccountOverviewContent({ primaryColor }: { primaryColor: string }) {
    const t = useTranslations('store.account.overview');
    const { customer } = useCustomerAuth();
    if (!customer) return null;

    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
                <AccountNav primaryColor={primaryColor} />
            </div>
            <div className="lg:col-span-3 space-y-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tighter">{t('title')}</h1>
                    <p className="text-gray-500 font-medium">{t('welcome', { name: fullName })}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="rounded-[32px] border-2 shadow-sm">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('email')}</p>
                                <p className="font-bold text-sm">{customer.email}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-[32px] border-2 shadow-sm">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('phone')}</p>
                                <p className="font-bold text-sm">{customer.phone || t('noPhone')}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link href="/account/orders">
                        <Card className="rounded-[32px] border-2 shadow-sm hover:shadow-xl hover:border-transparent transition group h-full">
                            <CardContent className="p-8 space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                                    <Package className="w-6 h-6 text-gray-400" />
                                </div>
                                <p className="font-black text-lg group-hover:opacity-80" style={{ color: primaryColor }}>{t('viewOrders')}</p>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/account/addresses">
                        <Card className="rounded-[32px] border-2 shadow-sm hover:shadow-xl hover:border-transparent transition group h-full">
                            <CardContent className="p-8 space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                                    <MapPin className="w-6 h-6 text-gray-400" />
                                </div>
                                <p className="font-black text-lg" style={{ color: primaryColor }}>{t('manageAddresses')}</p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function AccountOverviewPage() {
    const params = useParams();
    const subdomain = params.subdomain as string;
    const { data: storeData } = usePublicStore(subdomain);
    const store = storeData as any;
    const primaryColor = store?.branding?.primaryColor || "#3B82F6";

    return (
        <div className="container mx-auto px-4 py-20 max-w-6xl">
            <RequireCustomer primaryColor={primaryColor}>
                <AccountOverviewContent primaryColor={primaryColor} />
            </RequireCustomer>
        </div>
    );
}
