'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Gift, Sparkles, ArrowRight } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useLocale } from 'next-intl';

export function WelcomeGiftModal() {
    const { billing } = useWallet();
    const [open, setOpen] = useState(false);
    const locale = useLocale();
    const isAr = locale === 'ar';

    useEffect(() => {
        if (!billing) return;

        // Show modal only if they have balance, and have not dismissed it yet
        const hasSeenGift = localStorage.getItem('welcome_gift_seen_500');
        const hasBalance = billing.wallet.balance >= 500;

        if (!hasSeenGift && hasBalance) {
            // Short delay for better UX after page loads
            const timer = setTimeout(() => {
                setOpen(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [billing]);

    const handleDismiss = () => {
        localStorage.setItem('welcome_gift_seen_500', 'true');
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleDismiss}>
            <DialogContent className="sm:max-w-[450px] rounded-[32px] p-0 overflow-hidden border-2 shadow-2xl bg-white">
                {/* Stunning Gradient Header */}
                <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8 text-white text-center relative overflow-hidden flex flex-col items-center justify-center">
                    {/* Animated background glows */}
                    <div className="absolute inset-0 bg-grid-white/10" />
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse delay-700" />
                    
                    {/* Pulsing floating Gift Icon */}
                    <div className="relative z-10 w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 shadow-xl border border-white/30 animate-bounce">
                        <Gift className="w-10 h-10 text-white" />
                        <Sparkles className="w-5 h-5 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
                    </div>

                    <h2 className="relative z-10 text-3xl font-black tracking-tight leading-none">
                        {isAr ? "مبروك! هدية ترحيبية بقيمة 500 ج.م" : "Congratulations! 500 EGP Credited"}
                    </h2>
                    <p className="relative z-10 text-xs font-bold uppercase tracking-widest text-white/80 mt-2">
                        {isAr ? "تم إيداع الرصيد الترحيبي بنجاح" : "Welcome Bonus Activated"}
                    </p>
                </div>

                {/* Dialog Content */}
                <div className="p-8 space-y-6 text-center">
                    <p className="text-gray-600 font-medium leading-relaxed text-sm md:text-base px-2">
                        {isAr 
                            ? "كهدية ترحيبية لاختيارك بيلدورا، أضفنا 500 ج.م إلى محفظتك بالكامل! هذا الرصيد يكفي لتشغيل متجرك مجاناً لمدة تصل إلى شهرين أو معالجة 50 طلباً." 
                            : "As a welcome gift for choosing Buildora to launch your business, we've credited your wallet with 500 EGP! This balance fully covers your billing fees for up to 2 months or 50 orders."}
                    </p>

                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-2xl border-2">
                        <div className="text-center p-2 border-r-2 border-gray-100">
                            <p className="text-2xl font-black text-primary">500 EGP</p>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider mt-1">
                                {isAr ? "رصيد المحفظة" : "Wallet Credit"}
                            </p>
                        </div>
                        <div className="text-center p-2">
                            <p className="text-2xl font-black text-purple-600">2 Months</p>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider mt-1">
                                {isAr ? "تشغيل مجاني" : "Free Usage"}
                            </p>
                        </div>
                    </div>

                    <Button 
                        onClick={handleDismiss}
                        className="w-full h-14 rounded-2xl text-base font-black bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-95 shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 group"
                    >
                        <span>{isAr ? "لنبدأ العمل!" : "Let's Build!"}</span>
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
