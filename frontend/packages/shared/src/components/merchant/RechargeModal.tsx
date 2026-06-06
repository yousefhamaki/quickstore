'use client';

import { useState } from 'react';
import { useRechargeWallet } from '../../lib/hooks/useBilling';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { CreditCard, Smartphone, Store, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslations, useLocale } from 'next-intl';

interface RechargeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function RechargeModal({ open, onOpenChange }: RechargeModalProps) {
    const t = useTranslations('merchant.billing');
    const rechargeMutation = useRechargeWallet();
    
    const [amount, setAmount] = useState<string>('500');
    const [method, setMethod] = useState<'card' | 'wallet' | 'fawry'>('card');
    const [walletNumber, setWalletNumber] = useState<string>('');
    const [referenceCode, setReferenceCode] = useState<string | null>(null);

    const handleRecharge = () => {
        if (!amount || Number(amount) <= 0) return;
        
        rechargeMutation.mutate({
            amount: Number(amount),
            method,
            walletNumber: method === 'wallet' ? walletNumber : undefined
        }, {
            onSuccess: (data: any) => {
                if (data.referenceCode) {
                    setReferenceCode(data.referenceCode);
                } else if (!data.paymentUrl) {
                    // Success without redirect (e.g. demo mode)
                    handleClose();
                }
            }
        });
    };

    const handleClose = () => {
        onOpenChange(false);
        setTimeout(() => {
            setReferenceCode(null);
            setAmount('500');
            setMethod('card');
            setWalletNumber('');
            rechargeMutation.reset();
        }, 300);
    };

    const locale = useLocale();
    const isAr = locale === 'ar';

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[400px] rounded-3xl p-0 overflow-hidden border-2">
                <div className="p-8 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <Smartphone className="w-8 h-8" />
                    </div>
                    
                    <div className="space-y-2">
                        <DialogTitle className="text-2xl font-black tracking-tight">
                            {isAr ? "شحن الرصيد" : "Recharge Wallet"}
                        </DialogTitle>
                        <DialogDescription className="font-medium text-muted-foreground text-sm px-2">
                            {isAr 
                                ? "لشحن محفظتك أو إضافة رصيد، يرجى التواصل مع مركز خدمة العملاء والدعم الفني الخاص بنا." 
                                : "To recharge your wallet or add funds, please contact our Help Center/Customer Support."}
                        </DialogDescription>
                    </div>

                    <div className="bg-muted w-full p-4 rounded-2xl border-2 flex flex-col items-center justify-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                            {isAr ? "رقم الدعم الفني" : "Support Number"}
                        </p>
                        <a 
                            href="tel:+201094938462" 
                            className="text-2xl font-black tracking-tight text-primary hover:underline"
                        >
                            +201094938462
                        </a>
                    </div>

                    <Button 
                        asChild 
                        className="w-full rounded-xl h-12 font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-lg"
                    >
                        <a href="tel:+201094938462">
                            {isAr ? "اتصل الآن" : "Call Support"}
                        </a>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}


// export function RechargeModal({ open, onOpenChange }: RechargeModalProps) {
//     const t = useTranslations('merchant.billing');
//     const rechargeMutation = useRechargeWallet();
    
//     const [amount, setAmount] = useState<string>('500');
//     const [method, setMethod] = useState<'card' | 'wallet' | 'fawry'>('card');
//     const [walletNumber, setWalletNumber] = useState<string>('');
//     const [referenceCode, setReferenceCode] = useState<string | null>(null);

//     const handleRecharge = () => {
//         if (!amount || Number(amount) <= 0) return;
        
//         rechargeMutation.mutate({
//             amount: Number(amount),
//             method,
//             walletNumber: method === 'wallet' ? walletNumber : undefined
//         }, {
//             onSuccess: (data: any) => {
//                 if (data.referenceCode) {
//                     setReferenceCode(data.referenceCode);
//                 } else if (!data.paymentUrl) {
//                     // Success without redirect (e.g. demo mode)
//                     handleClose();
//                 }
//             }
//         });
//     };

//     const handleClose = () => {
//         onOpenChange(false);
//         setTimeout(() => {
//             setReferenceCode(null);
//             setAmount('500');
//             setMethod('card');
//             setWalletNumber('');
//             rechargeMutation.reset();
//         }, 300);
//     };

//     const locale = useLocale();
//     const isAr = locale === 'ar';

//     return (
//   <Dialog open={open} onOpenChange={handleClose}>
//             <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-2">
//                 <div className="p-6 pb-0">
//                     <DialogHeader>
//                         <DialogTitle className="text-2xl font-black tracking-tight">Recharge Wallet</DialogTitle>
//                         <DialogDescription className="font-medium text-muted-foreground">
//                             Choose your preferred payment method to add funds to your wallet.

//              </DialogDescription>
//                     </DialogHeader>
//                 </div>
//                 {referenceCode ? (
//                     <div className="p-8 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
//                         <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
//                             <Store className="w-10 h-10 text-amber-600" />
//                         </div>
//                         <div className="space-y-2">
//                             <h3 className="text-xl font-black">Fawry Payment Initiated</h3>
//                             <p className="text-sm text-muted-foreground font-medium">
//                                 Please visit any Fawry kiosk and pay using this reference code.
//                             </p>
//                         </div>
//                         <div className="bg-muted w-full p-4 rounded-2xl border-2 border-dashed">
//                             <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Reference Code</p>
//                             <p className="text-3xl font-black tracking-widest">{referenceCode}</p>
//                         </div>
//                         <Button 
//                             className="w-full rounded-xl h-12 font-bold" 
//                             onClick={handleClose}
//                         >
//                             Done
//                         </Button>
//                     </div>
//                 ) : (
//                     <div className="p-6 space-y-6">
//                         <div className="space-y-3 relative">
//                             <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Amount (EGP)</Label>
//                             <Input
//                                 type="number"
//                                 value={amount}
//                                 onChange={(e) => setAmount(e.target.value)}
//                                 className="h-14 rounded-2xl text-2xl font-black pl-6 border-2"
//                                 placeholder="0.00"
//                             />
//                             <div className="absolute right-4 top-10 font-black text-muted-foreground">EGP</div>
//                         </div>
//                         <div className="space-y-3">
//                             <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Payment Method</Label>
//                             <div className="grid gap-3">
//                                 <button
//                                     onClick={() => setMethod('card')}
//                                     className={cn(
//                                         "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
//                                         method === 'card' ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-muted hover:border-primary/50"
//                                     )}
//                                 >
//                                     <div className={cn("p-2.5 rounded-xl", method === 'card' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
//                                         <CreditCard className="w-5 h-5" />
//                                     </div>
//                                     <div className="flex-1">
//                                         <h4 className="font-bold">Credit / Debit Card</h4>
//                                         <p className="text-xs text-muted-foreground font-medium">Visa, Mastercard, Meeza</p>
//                                     </div>
//                                     <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", method === 'card' ? "border-primary" : "border-muted")}>
//                                         {method === 'card' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
//                                     </div>
//                                 </button>
//                                 <button
//                                     onClick={() => setMethod('wallet')}
//                                     className={cn(
//                                         "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
//                                         method === 'wallet' ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-muted hover:border-primary/50"
//                                     )}
//                                 >
//                                     <div className={cn("p-2.5 rounded-xl", method === 'wallet' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
//                                         <Smartphone className="w-5 h-5" />
//                                     </div>
//                                     <div className="flex-1">
//                                         <h4 className="font-bold">Digital Wallet</h4>
//                                         <p className="text-xs text-muted-foreground font-medium">Vodafone Cash, etc.</p>
//                                     </div>
//                                     <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", method === 'wallet' ? "border-primary" : "border-muted")}>
//                                         {method === 'wallet' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
//                                     </div>
//                                 </button>
//                                 {method === 'wallet' && (
//                                     <div className="animate-in slide-in-from-top-2 fade-in pl-16 pr-4 pb-2">
//                                         <Input
//                                             placeholder="Enter Mobile Number"
//                                             value={walletNumber}
//                                             onChange={(e) => setWalletNumber(e.target.value)}
//                                             className="h-11 rounded-xl border-2"
//                                         />
//                                     </div>
//                                 )}
//                                 <button
//                                     onClick={() => setMethod('fawry')}
//                                     className={cn(
//                                         "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
//                                         method === 'fawry' ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-muted hover:border-primary/50"
//                                     )}
//                                 >
//                                     <div className={cn("p-2.5 rounded-xl", method === 'fawry' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
//                                         <Store className="w-5 h-5" />
//                                     </div>
//                                     <div className="flex-1">
//                                         <h4 className="font-bold">Fawry / Kiosk</h4>
//                                         <p className="text-xs text-muted-foreground font-medium">Pay with cash at any kiosk</p>
//                                     </div>
//                                     <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", method === 'fawry' ? "border-primary" : "border-muted")}>
//                                         {method === 'fawry' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
//                                     </div>
//                                 </button>
//                             </div>
//                         </div>
//                         <Button 
//                             className="w-full h-14 rounded-2xl text-base font-black group relative overflow-hidden" 
//                             disabled={!amount || Number(amount) <= 0 || (method === 'wallet' && !walletNumber) || rechargeMutation.isPending}
//                             onClick={handleRecharge}
//             >
//                             {rechargeMutation.isPending ? (
//                                 <Loader2 className="w-5 h-5 animate-spin" />
//                             ) : (
//                                 <>
//                                     <span>Continue to Payment</span>
//                                     <ChevronRight className="w-5 h-5 absolute right-6 group-hover:translate-x-1 transition-transform" />
//                                 </>
//                             )}
//                         </Button>
//                          )}
//             }