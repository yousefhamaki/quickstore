import mongoose, { Schema, Document } from 'mongoose';

// A fixed, curated set so the /support page can offer a stable category
// filter — translated client-side from the slug (frontend/apps/*/messages/
// */support.json's `categories.*`), not stored as free text per-locale.
export const ARTICLE_CATEGORIES = [
    'getting-started',
    'products',
    'orders',
    'payments',
    'shipping',
    'domains-theme',
    'marketing',
    'analytics',
    'account-support',
] as const;
export type ArticleCategory = typeof ARTICLE_CATEGORIES[number];

export interface IArticle extends Document {
    title: string;
    content: string;
    summary?: string;
    titleAr?: string;
    contentAr?: string;
    summaryAr?: string;
    /**
     * When set, the support page renders this as a numbered step-by-step
     * guide instead of plain paragraphs — for "how do I..." articles.
     * Informational (non-how-to) articles leave this empty and just render
     * `content` as prose.
     */
    steps: string[];
    stepsAr: string[];
    category?: ArticleCategory;
    /** Manual curation order within a category — lower shows first. Ties
     * broken by createdAt desc. */
    order: number;
    tags: string[];
    isActive: boolean;
    /** Content-quality signals from the /support page — which articles get
     * read, and whether the answer actually helped, surfaced to admins so
     * gaps/bad answers are visible instead of guessed at. */
    viewCount: number;
    helpfulCount: number;
    notHelpfulCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const ArticleSchema: Schema = new Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    summary: { type: String },
    titleAr: { type: String },
    contentAr: { type: String },
    summaryAr: { type: String },
    steps: [{ type: String }],
    stepsAr: [{ type: String }],
    category: { type: String, enum: ARTICLE_CATEGORIES },
    order: { type: Number, default: 0 },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    viewCount: { type: Number, default: 0 },
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 },
}, { timestamps: true });

ArticleSchema.index({ category: 1, order: 1, createdAt: -1 });

// Text index for search functionality in the Chatbot
// Covers both English and Arabic fields
// NOTE: changing this field set requires dropping the old
// "ArticleTextIndex" in the DB first (see scripts/rebuildArticleTextIndex.ts)
// — Mongoose's autoIndex does not migrate an existing text index in place.
ArticleSchema.index({
    title: 'text',
    content: 'text',
    summary: 'text',
    tags: 'text',
    titleAr: 'text',
    contentAr: 'text',
    summaryAr: 'text'
}, {
    weights: {
        title: 10,
        titleAr: 10,
        tags: 8, // exact keywords (e.g. "instapay") the chatbot should weigh
                 // almost as heavily as the title itself — added so chatbot
                 // search actually covers what /support's own regex search
                 // already did (it searches tags; this index didn't).
        summary: 5,
        summaryAr: 5,
        content: 1,
        contentAr: 1
    },
    name: "ArticleTextIndex"
});

export default mongoose.model<IArticle>('Article', ArticleSchema);
