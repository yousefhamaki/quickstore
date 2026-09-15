'use client';

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { usePublicStore } from "@shared/lib/hooks/usePublicStore";
import { useCustomerAuth } from "@shared/context/CustomerAuthContext";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { PasswordInput } from "@shared/components/ui/password-input";
import { Card, CardContent } from "@shared/components/ui/card";

export default function AccountRegisterPage() {
    const t = useTranslations('store.account.register');
    const params = useParams();
    const router = useRouter();
    const subdomain = params.subdomain as string;
    const { data: storeData } = usePublicStore(subdomain);
    const store = storeData as any;
    const { register } = useCustomerAuth();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const primaryColor = store?.branding?.primaryColor || "#3B82F6";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await register({ firstName, lastName, email, phone: phone || undefined, password });
            router.push('/account');
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-20 max-w-md">
            <Card className="rounded-[40px] border-2 shadow-2xl overflow-hidden">
                <CardContent className="p-8 md:p-12 space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-black tracking-tighter">{t('title')}</h1>
                        <p className="text-gray-500 font-medium text-sm">{t('subtitle')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest ml-1">{t('firstName')}</label>
                                <Input
                                    required
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="h-14 rounded-2xl border-2 focus-visible:ring-offset-0 focus-visible:ring-2"
                                    style={{ borderColor: primaryColor + '20' }}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest ml-1">{t('lastName')}</label>
                                <Input
                                    required
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="h-14 rounded-2xl border-2 focus-visible:ring-offset-0 focus-visible:ring-2"
                                    style={{ borderColor: primaryColor + '20' }}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest ml-1">{t('email')}</label>
                            <Input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-14 rounded-2xl border-2 focus-visible:ring-offset-0 focus-visible:ring-2"
                                style={{ borderColor: primaryColor + '20' }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest ml-1">{t('phone')}</label>
                            <Input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="h-14 rounded-2xl border-2 focus-visible:ring-offset-0 focus-visible:ring-2"
                                style={{ borderColor: primaryColor + '20' }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest ml-1">{t('password')}</label>
                            <PasswordInput
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-14 rounded-2xl border-2 focus-visible:ring-offset-0 focus-visible:ring-2"
                                style={{ borderColor: primaryColor + '20' }}
                            />
                            <p className="text-[10px] text-gray-400 font-medium ml-1">{t('passwordHint')}</p>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-2" /> {t('submit')}</>}
                        </Button>
                    </form>

                    <p className="text-center text-sm text-gray-500 font-medium">
                        {t('haveAccount')}{' '}
                        <Link href="/account/login" className="font-black" style={{ color: primaryColor }}>
                            {t('logIn')}
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
