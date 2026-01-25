'use client';

import { Receipt } from "@/lib/api/billing";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Printer, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export function ReceiptModal({
    receipt,
    open,
    onOpenChange
}: {
    receipt: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    if (!receipt) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl rounded-[40px] p-0 overflow-hidden border-2 shadow-2xl">
                <div className="bg-primary p-10 text-primary-foreground relative overflow-hidden">
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div>
                            <div className="p-3 bg-white/20 rounded-2xl w-fit mb-4">
                                <FileText className="w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-black tracking-tight">Receipt</h2>
                            <p className="opacity-70 font-bold uppercase tracking-widest text-[10px] mt-1">Ref: #TX-{receipt._id.slice(-8).toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                            <Badge className="bg-white text-primary rounded-full px-4 py-1 font-black mb-2 border-none hover:bg-white shadow-lg">
                                VERIFIED
                            </Badge>
                            <p className="text-sm font-bold opacity-70">{format(new Date(receipt.issuedAt || receipt.createdAt), 'MMMM dd, yyyy')}</p>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2 relative z-10">
                        <span className="text-6xl font-black tracking-tighter">{receipt.amount.toFixed(2)}</span>
                        <span className="text-2xl font-bold opacity-70">{receipt.currency || 'EGP'}</span>
                    </div>

                    {/* Decorative pattern */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                </div>

                <div className="p-10 space-y-8 bg-background">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Service Description</p>
                            <p className="font-bold text-sm leading-relaxed">
                                {receipt.type === 'order' ? 'Store Transaction Fee for Managed Orders' : 'Prepaid Wallet Recharge via Secure Gateway'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Settlement Type</p>
                            <p className="font-bold text-sm">Buildora Wallet</p>
                        </div>
                    </div>

                    <div className="border-t-2 border-dashed pt-8">
                        <div className="flex items-start gap-3 text-emerald-600 bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-black leading-relaxed">This receipt serves as a digital proof of transaction from your Buildora Merchant Wallet and is valid for reconciliation.</p>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest gap-2 shadow-xl">
                            <Download className="w-4 h-4" /> Download
                        </Button>
                        <Button variant="outline" className="h-14 rounded-2xl font-black uppercase tracking-widest gap-2 border-2" onClick={handlePrint}>
                            <Printer className="w-4 h-4" /> Print
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
