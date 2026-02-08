import mongoose, { Schema, Document } from 'mongoose';

export interface ISEOIssue {
    type: 'missing_title' | 'missing_description' | 'duplicate_title' | 'duplicate_description' | 'noindex_important' | 'broken_canonical' | 'missing_og_image' | 'title_too_long' | 'description_too_long';
    severity: 'critical' | 'warning' | 'suggestion';
    message: string;
    affectedPages: {
        pageType: string;
        pageId?: string;
        url: string;
    }[];
    fix: string;
}

export interface ISEOMetrics {
    totalPages: number;
    indexedPages: number;
    pagesWithMissingTitles: number;
    pagesWithMissingDescriptions: number;
    pagesWithDuplicateTitles: number;
    pagesWithDuplicateDescriptions: number;
    averageTitleLength: number;
    averageDescriptionLength: number;
}

export interface ISEOHealth extends Document {
    storeId: mongoose.Types.ObjectId;

    // Overall Score
    score: number;                    // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';

    // Issues
    issues: {
        critical: ISEOIssue[];
        warnings: ISEOIssue[];
        suggestions: ISEOIssue[];
    };

    // Metrics
    metrics: ISEOMetrics;

    // Last Check
    lastCheckedAt: Date;
    nextCheckAt: Date;

    createdAt: Date;
    updatedAt: Date;
}

const SEOHealthSchema: Schema = new Schema(
    {
        storeId: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
            unique: true
        },

        score: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },

        grade: {
            type: String,
            enum: ['A', 'B', 'C', 'D', 'F'],
            required: true
        },

        issues: {
            critical: [{
                type: {
                    type: String,
                    enum: ['missing_title', 'missing_description', 'duplicate_title', 'duplicate_description', 'noindex_important', 'broken_canonical', 'missing_og_image', 'title_too_long', 'description_too_long']
                },
                severity: { type: String, enum: ['critical', 'warning', 'suggestion'] },
                message: { type: String },
                affectedPages: [{
                    pageType: { type: String },
                    pageId: { type: String },
                    url: { type: String }
                }],
                fix: { type: String }
            }],
            warnings: [{
                type: {
                    type: String,
                    enum: ['missing_title', 'missing_description', 'duplicate_title', 'duplicate_description', 'noindex_important', 'broken_canonical', 'missing_og_image', 'title_too_long', 'description_too_long']
                },
                severity: { type: String, enum: ['critical', 'warning', 'suggestion'] },
                message: { type: String },
                affectedPages: [{
                    pageType: { type: String },
                    pageId: { type: String },
                    url: { type: String }
                }],
                fix: { type: String }
            }],
            suggestions: [{
                type: {
                    type: String,
                    enum: ['missing_title', 'missing_description', 'duplicate_title', 'duplicate_description', 'noindex_important', 'broken_canonical', 'missing_og_image', 'title_too_long', 'description_too_long']
                },
                severity: { type: String, enum: ['critical', 'warning', 'suggestion'] },
                message: { type: String },
                affectedPages: [{
                    pageType: { type: String },
                    pageId: { type: String },
                    url: { type: String }
                }],
                fix: { type: String }
            }]
        },

        metrics: {
            totalPages: { type: Number, default: 0 },
            indexedPages: { type: Number, default: 0 },
            pagesWithMissingTitles: { type: Number, default: 0 },
            pagesWithMissingDescriptions: { type: Number, default: 0 },
            pagesWithDuplicateTitles: { type: Number, default: 0 },
            pagesWithDuplicateDescriptions: { type: Number, default: 0 },
            averageTitleLength: { type: Number, default: 0 },
            averageDescriptionLength: { type: Number, default: 0 }
        },

        lastCheckedAt: { type: Date, required: true },
        nextCheckAt: { type: Date, required: true }
    },
    { timestamps: true }
);

// Indexes
SEOHealthSchema.index({ storeId: 1 }, { unique: true });
SEOHealthSchema.index({ lastCheckedAt: 1 });
SEOHealthSchema.index({ score: 1 });
SEOHealthSchema.index({ grade: 1 });

export default mongoose.model<ISEOHealth>('SEOHealth', SEOHealthSchema);
