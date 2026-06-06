import mongoose, { Schema, Document } from 'mongoose';

export interface IArticle extends Document {
    title: string;
    content: string;
    summary?: string;
    titleAr?: string;
    contentAr?: string;
    summaryAr?: string;
    tags: string[];
    isActive: boolean;
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
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Text index for search functionality in the Chatbot
// Covers both English and Arabic fields
ArticleSchema.index({ 
    title: 'text', 
    content: 'text', 
    summary: 'text',
    titleAr: 'text',
    contentAr: 'text',
    summaryAr: 'text'
}, {
    weights: {
        title: 10,
        titleAr: 10,
        summary: 5,
        summaryAr: 5,
        content: 1,
        contentAr: 1
    },
    name: "ArticleTextIndex"
});

export default mongoose.model<IArticle>('Article', ArticleSchema);
