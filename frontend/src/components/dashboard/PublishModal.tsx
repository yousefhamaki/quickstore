'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Rocket, Share2, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeName: string;
    storeUrl: string;
    onConfirm: () => Promise<void>;
    isReady: boolean;
    missingSteps?: string[];
}

export function PublishModal({
    isOpen,
    onClose,
    storeName,
    storeUrl,
    onConfirm,
    isReady,
    missingSteps = []
}: PublishModalProps) {
    const [isPublishing, setIsPublishing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            await onConfirm();
            setIsSuccess(true);
        } catch (error) {
            // Error handled by mutation usually, but we reset here
            setIsPublishing(false);
        } finally {
            setIsPublishing(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(storeUrl);
        toast.success("Link copied to clipboard!");
    };

    const shareHandler = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: storeName,
                    text: `Check out my new store on Buildora!`,
                    url: storeUrl,
                });
            } catch (err) {
                copyToClipboard();
            }
        } else {
            copyToClipboard();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className={cn(
                "sm:max-w-[480px] transition-all duration-500",
                isSuccess && "sm:max-w-[400px]"
            )}>
                {!isSuccess ? (
                    <>
                        <DialogHeader>
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <Rocket className="w-6 h-6 text-primary" />
                            </div>
                            <DialogTitle className="text-2xl font-bold">Launch {storeName}</DialogTitle>
                            <DialogDescription className="text-base pt-2">
                                Ready to take your business live? Once published, customers can visit your store and place orders.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-6">
                            {!isReady ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                                    <p className="font-bold text-amber-800 text-sm flex items-center gap-2">
                                        Wait! Your store isn't quite ready yet:
                                    </p>
                                    <ul className="grid gap-2">
                                        {missingSteps.map((step, i) => (
                                            <li key={i} className="text-xs text-amber-700 flex items-center gap-2">
                                                <div className="w-1 h-1 bg-amber-400 rounded-full" />
                                                {step}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800">
                                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                                    <p className="text-sm font-medium">All systems go! Your store meets all requirements for launch.</p>
                                </div>
                            )}

                            <div className="mt-4 p-4 border rounded-xl bg-muted/30">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Preview URL</p>
                                <p className="text-sm font-mono truncate text-primary">{storeUrl}</p>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" onClick={onClose} disabled={isPublishing}>
                                Maybe Later
                            </Button>
                            <Button
                                onClick={handlePublish}
                                disabled={!isReady || isPublishing}
                                className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                            >
                                {isPublishing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Launching...
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="w-4 h-4 mr-2" />
                                        Go Live Now
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="py-8 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">Your Store is Live!</h2>
                            <p className="text-muted-foreground text-sm max-w-[280px]">
                                Congratulations! {storeName} is officially open for business.
                            </p>
                        </div>

                        <div className="w-full space-y-2">
                            <Button onClick={copyToClipboard} variant="outline" className="w-full flex items-center justify-center gap-2 h-12">
                                <Copy className="w-4 h-4" />
                                Copy Store URL
                            </Button>
                            <Button onClick={shareHandler} className="w-full flex items-center justify-center gap-2 h-12">
                                <Share2 className="w-4 h-4" />
                                Share Store
                            </Button>
                        </div>

                        <Button asChild variant="link" size="sm" className="font-bold text-primary">
                            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                View Live Store <ExternalLink className="w-3 h-3" />
                            </a>
                        </Button>

                        <Button onClick={onClose} variant="ghost" className="text-xs text-muted-foreground">
                            Close and continue managing
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
