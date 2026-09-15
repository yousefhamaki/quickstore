/**
 * One-time migration: turns each store's existing freeform
 * `Product.category` string values into real `Category` documents, then
 * backfills `Product.categoryId` on every matching product.
 *
 * Safe to re-run: it looks up an existing Category by (storeId, slug)
 * before creating a new one, and only backfills products that don't
 * already have a categoryId set.
 *
 * Run with: npx tsx src/scripts/migrateCategoriesFromFreeText.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../models/Product';
import Category from '../models/Category';
import { clearStoreProductCaches } from '../controllers/productController';

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const storeIds: mongoose.Types.ObjectId[] = await Product.distinct('storeId', {
        category: { $exists: true, $ne: null, $nin: [''] },
        categoryId: { $exists: false }
    });

    console.log(`Found ${storeIds.length} store(s) with uncategorized-by-reference products.`);

    let categoriesCreated = 0;
    let productsBackfilled = 0;

    for (const storeId of storeIds) {
        const distinctNames: string[] = await Product.distinct('category', {
            storeId,
            category: { $exists: true, $ne: null, $nin: [''] },
            categoryId: { $exists: false }
        });

        for (const rawName of distinctNames) {
            const name = rawName.trim();
            if (!name) continue;

            const baseSlug = slugify(name);
            let slug = baseSlug;
            let category = await Category.findOne({ storeId, slug });

            // A different name could slugify to the same value (e.g. "T-Shirts"
            // vs "T Shirts") — only reuse an existing category if the name
            // actually matches too, otherwise disambiguate the slug.
            if (category && category.name !== name) {
                let counter = 1;
                while (await Category.findOne({ storeId, slug: `${baseSlug}-${counter}` })) counter++;
                slug = `${baseSlug}-${counter}`;
                category = null;
            }

            if (!category) {
                category = await Category.create({ storeId, name, slug, isActive: true });
                categoriesCreated++;
                console.log(`  Created category "${name}" for store ${storeId}`);
            }

            const result = await Product.updateMany(
                { storeId, category: rawName, categoryId: { $exists: false } },
                { $set: { categoryId: category._id } }
            );
            productsBackfilled += result.modifiedCount;
        }

        // The public storefront caches its product list for 30 minutes
        // (see publicController.getStoreProducts) — without busting it here,
        // a merchant who just ran this migration would see their storefront
        // still showing the old, un-migrated category names/pills for up to
        // half an hour.
        await clearStoreProductCaches(storeId.toString());
    }

    console.log('\n--- Migration summary ---');
    console.log(`Categories created: ${categoriesCreated}`);
    console.log(`Products backfilled with categoryId: ${productsBackfilled}`);
    console.log(`Storefront caches cleared for ${storeIds.length} store(s).`);

    await mongoose.disconnect();
    process.exit(0);
};

run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
