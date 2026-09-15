import mongoose, { Schema, Document } from 'mongoose';

export interface ICategoryImage {
    url: string;
    publicId: string;
}

/**
 * Real per-store product taxonomy — replaces the old freeform
 * `Product.category` string (kept only as a denormalized display copy, see
 * Product.ts). A merchant creates these explicitly instead of typing
 * whatever they want into a text box, which is what let two products end
 * up in "Shoes" and "shoes " as different categories before this existed.
 */
export interface ICategory extends Document {
    storeId: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
    image?: ICategoryImage;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true },
        description: { type: String },
        image: {
            url: { type: String },
            publicId: { type: String },
        },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

CategorySchema.index({ storeId: 1, slug: 1 }, { unique: true });
CategorySchema.index({ storeId: 1, isActive: 1, sortOrder: 1 });

export default mongoose.model<ICategory>('Category', CategorySchema);
