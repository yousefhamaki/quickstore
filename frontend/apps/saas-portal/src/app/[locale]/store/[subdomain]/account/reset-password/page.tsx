'use client';

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import { usePublicStore } from "@shared/lib/hooks/usePublicStore";
import { resetPassword, setCustomerToken } from "@shared/services/customerAuthService";
import { useCustomerAuth } from "@shared/context/CustomerAuthContext";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { PasswordInput } from "@shared/components/ui/password-input";
import { Card, CardContent } from "@shared/components/ui/card";

export default function ResetPasswordPage() {
    const t = useTranslations('store.account.resetPassword');
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';
    const subdomain = params.subdomain as string;
    const { data: storeData } = usePublicStore(subdomain);
    const store = storeData as any;
    const storeId = store?._id || store?.id;
    const { refresh } = useCustomerAuth();

    const [newPassword, setNewPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const primaryColor = store?.branding?.primaryColor || "#3B82F6";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId || !token) return;
        setIsSubmitting(true);
        try {
            const res = await resetPassword(storeId, token, newPassword);
            setCustomerToken(storeId, res.token);
            await refresh();
            setDone(true);
            toast.success(t('success'));
            setTimeout(() => router.push('/account'), 1500);
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('invalidToken'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!token) {
        return (
            <div className="container mx-auto px-4 py-32 max-w-md text-center space-y-6">
                <p className="text-gray-500 font-medium">{t('invalidToken')}</p>
                <Button asChild className="rounded-2xl h-12 px-8 font-black text-sm uppercase tracking-widest" style={{ backgroundColor: primaryColor }}>
                    <Link href="/account/forgot-password">{t('requestNew')}</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-20 max-w-md">
            <Card className="rounded-[40px] border-2 shadow-2xl overflow-hidden">
                <CardContent className="p-8 md:p-12 space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-black tracking-tighter">{t('title')}</h1>
                        <p className="text-gray-500 font-medium text-sm">{t('subtitle')}</p>
                    </div>

                    {done ? (
                        <p className="text-center text-sm text-gray-600 font-medium p-6 rounded-2xl bg-emerald-50">{t('success')}</p>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest ml-1">{t('newPassword')}</label>
                                <PasswordInput
                                    required
                                    minLength={6}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="h-14 rounded-2xl border-2 focus-visible:ring-offset-0 focus-visible:ring-2"
                                    style={{ borderColor: primaryColor + '20' }}
                                />
                                <p className="text-[10px] text-gray-400 font-medium ml-1">{t('passwordHint')}</p>
                            </div>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !storeId}
                                className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition hover:scale-[1.02] active:scale-[0.98]"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><KeyRound className="w-4 h-4 mr-2" /> {t('submit')}</>}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
