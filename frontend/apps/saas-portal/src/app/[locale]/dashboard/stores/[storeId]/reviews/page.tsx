'use client';

import { use, useEffect, useState } from "react";
import { Card, CardContent } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { Textarea } from "@shared/components/ui/textarea";
import { StarRating } from "@shared/components/storefront/StarRating";
import { MessageSquareText, Check, X, Trash2, Loader2, Star, Reply } from "lucide-react";
import { toast } from "sonner";
import {
    getMerchantReviews,
    updateReviewStatus,
    replyToReview,
    deleteReview,
    MerchantReview
} from "@shared/services/reviewService";

const TABS = ['pending', 'approved', 'rejected'] as const;

export default function ReviewsPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const [tab, setTab] = useState<typeof TABS[number]>('pending');
    const [reviews, setReviews] = useState<MerchantReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyDialogId, setReplyDialogId] = useState<string | null>(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const data = await getMerchantReviews({ storeId, status: tab });
            setReviews(data.reviews);
        } catch (error) {
            toast.error('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [storeId, tab]);

    const handleModerate = async (id: string, status: 'approved' | 'rejected') => {
        try {
            setBusyId(id);
            await updateReviewStatus(id, storeId, status);
            toast.success(`Review ${status}`);
            fetchReviews();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to update review');
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this review permanently?')) return;
        try {
            setBusyId(id);
            await deleteReview(id, storeId);
            toast.success('Review deleted');
            fetchReviews();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to delete review');
        } finally {
            setBusyId(null);
        }
    };

    const handleReply = async () => {
        if (!replyDialogId || !replyMessage.trim()) return;
        try {
            setBusyId(replyDialogId);
            await replyToReview(replyDialogId, storeId, replyMessage.trim());
            toast.success('Reply posted');
            setReplyDialogId(null);
            setReplyMessage('');
            fetchReviews();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to post reply');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Star className="w-7 h-7 text-primary" /> Reviews
                </h1>
                <p className="text-muted-foreground text-sm">
                    Moderate customer reviews — only approved reviews (and your replies) are shown on your storefront.
                </p>
            </div>

            <div className="flex gap-2">
                {TABS.map((t) => (
                    <Button
                        key={t}
                        variant={tab === t ? 'default' : 'outline'}
                        size="sm"
                        className="rounded-xl capitalize"
                        onClick={() => setTab(t)}
                    >
                        {t}
                    </Button>
                ))}
            </div>

            <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-16 space-y-2">
                            <MessageSquareText className="w-10 h-10 text-muted-foreground mx-auto" />
                            <p className="font-bold">No {tab} reviews</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {reviews.map((review) => (
                                <div key={review._id} className="p-5 space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-sm">{review.customerName}</p>
                                                <Badge variant="outline" className="text-xs">{review.productId?.name}</Badge>
                                            </div>
                                            <StarRating rating={review.rating} size={14} className="mt-1" />
                                        </div>
                                        <p className="text-xs text-muted-foreground shrink-0">
                                            {new Date(review.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    {review.title && <p className="font-bold text-sm">{review.title}</p>}
                                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                                    {review.merchantReply && (
                                        <div className="ml-4 pl-4 border-l-2 space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your Reply</p>
                                            <p className="text-sm">{review.merchantReply.message}</p>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 pt-1">
                                        {tab === 'pending' && (
                                            <>
                                                <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={busyId === review._id} onClick={() => handleModerate(review._id, 'approved')}>
                                                    <Check className="w-3.5 h-3.5 mr-1" /> Approve
                                                </Button>
                                                <Button size="sm" variant="outline" className="rounded-xl" disabled={busyId === review._id} onClick={() => handleModerate(review._id, 'rejected')}>
                                                    <X className="w-3.5 h-3.5 mr-1" /> Reject
                                                </Button>
                                            </>
                                        )}
                                        {!review.merchantReply && (
                                            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setReplyDialogId(review._id); setReplyMessage(''); }}>
                                                <Reply className="w-3.5 h-3.5 mr-1" /> Reply
                                            </Button>
                                        )}
                                        <Button size="sm" variant="outline" className="rounded-xl text-destructive hover:text-destructive ml-auto" disabled={busyId === review._id} onClick={() => handleDelete(review._id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!replyDialogId} onOpenChange={(open) => !open && setReplyDialogId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reply to Review</DialogTitle>
                        <DialogDescription>Your reply is shown publicly under this review.</DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Thank you for your feedback..."
                        className="rounded-xl border-2 min-h-[100px]"
                    />
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => setReplyDialogId(null)}>Cancel</Button>
                        <Button className="rounded-xl" disabled={!replyMessage.trim() || busyId === replyDialogId} onClick={handleReply}>
                            {busyId === replyDialogId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Post Reply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
