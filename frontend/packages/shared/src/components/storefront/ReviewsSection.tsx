'use client';

import { useState } from 'react';
import { MessageSquareText, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react';
import { StarRating } from './StarRating';
import { submitReview, submitReviewAsCustomer, PublicReview } from '@shared/services/reviewService';
import { useCustomerAuth } from '@shared/context/CustomerAuthContext';
import { format } from 'date-fns';

interface ReviewsSectionProps {
    productId: string;
    storeId: string;
    initialReviews: PublicReview[];
    total: number;
    ratingAverage: number;
    ratingCount: number;
}

export function ReviewsSection({ productId, storeId, initialReviews, total, ratingAverage, ratingCount }: ReviewsSectionProps) {
    const [reviews] = useState(initialReviews);
    const [formOpen, setFormOpen] = useState(false);
    const [submitted, setSubmitted] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Logged-in shoppers skip the manual order#+email lookup entirely —
    // the backend verifies purchase against their own order history via
    // the session token instead (see reviewController.createReview).
    const { customer } = useCustomerAuth();

    const [orderNumber, setOrderNumber] = useState('');
    const [email, setEmail] = useState('');
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!comment.trim()) {
            setError('A comment is required.');
            return;
        }
        if (!customer && (!orderNumber.trim() || !email.trim())) {
            setError('Order number and email are required.');
            return;
        }
        try {
            setSubmitting(true);
            const res = customer
                ? await submitReviewAsCustomer(productId, storeId, { rating, title, comment })
                : await submitReview(productId, { storeId, orderNumber, email, rating, title, comment });
            setSubmitted(res.message);
            setFormOpen(false);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="pt-20 border-t space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-black tracking-tighter">Customer Reviews</h2>
                    {ratingCount > 0 ? (
                        <div className="flex items-center gap-3">
                            <StarRating rating={ratingAverage} size={20} />
                            <span className="font-bold text-lg">{ratingAverage.toFixed(1)}</span>
                            <span className="text-gray-400 text-sm">({ratingCount} review{ratingCount === 1 ? '' : 's'})</span>
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm font-medium">No reviews yet — be the first to share your experience.</p>
                    )}
                </div>
                <button
                    onClick={() => { setFormOpen(!formOpen); setSubmitted(null); }}
                    className="px-6 py-3 rounded-full border border-black bg-black text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-colors w-fit"
                >
                    <MessageSquareText size={14} /> Write a Review
                    <ChevronDown size={14} className={formOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
            </div>

            {submitted && (
                <div className="flex items-center gap-3 p-5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 size={20} className="shrink-0" />
                    <p className="text-sm font-medium">{submitted}</p>
                </div>
            )}

            {formOpen && (
                <form onSubmit={handleSubmit} className="p-6 md:p-8 rounded-3xl border bg-gray-50 space-y-5 max-w-xl">
                    <p className="text-xs text-gray-500 font-medium">
                        {customer
                            ? "We'll check this against your order history for this product."
                            : 'We verify reviews against a real delivered order — enter the order number and email you used at checkout.'}
                    </p>
                    {!customer && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Order Number</label>
                                <input
                                    value={orderNumber}
                                    onChange={(e) => setOrderNumber(e.target.value)}
                                    placeholder="e.g. ORD-12345"
                                    className="w-full h-11 px-4 rounded-xl border bg-white text-sm font-medium outline-none focus:border-black"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full h-11 px-4 rounded-xl border bg-white text-sm font-medium outline-none focus:border-black"
                                />
                            </div>
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Your Rating</label>
                        <StarRating rating={rating} size={28} interactive onChange={setRating} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Title (optional)</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Sum it up in a few words"
                            className="w-full h-11 px-4 rounded-xl border bg-white text-sm font-medium outline-none focus:border-black"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Your Review</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            placeholder="What did you like or dislike?"
                            className="w-full px-4 py-3 rounded-xl border bg-white text-sm font-medium outline-none focus:border-black resize-none"
                        />
                    </div>
                    {error && <p className="text-xs font-bold text-red-600">{error}</p>}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-8 py-3 rounded-full bg-black text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={14} className="animate-spin" />}
                        Submit Review
                    </button>
                </form>
            )}

            {reviews.length > 0 && (
                <div className="space-y-6 max-w-3xl">
                    {reviews.map((review) => (
                        <div key={review._id} className="p-6 rounded-3xl border space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="font-bold text-sm">{review.customerName}</p>
                                    <StarRating rating={review.rating} size={14} />
                                </div>
                                <p className="text-xs text-gray-400 font-medium">{format(new Date(review.createdAt), 'MMM dd, yyyy')}</p>
                            </div>
                            {review.title && <p className="font-bold">{review.title}</p>}
                            <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                            {review.merchantReply && (
                                <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Store Reply</p>
                                    <p className="text-sm text-gray-600">{review.merchantReply.message}</p>
                                </div>
                            )}
                        </div>
                    ))}
                    {total > reviews.length && (
                        <p className="text-xs text-gray-400 font-medium text-center">Showing {reviews.length} of {total} reviews</p>
                    )}
                </div>
            )}
        </div>
    );
}
