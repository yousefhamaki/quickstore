import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Product from '../models/Product';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('Connected to MongoDB');

        const products = await Product.find({ 'variants.0': { $exists: true } });
        console.log(`Found ${products.length} products with variants to migrate.`);

        for (const product of products) {
            let updated = false;

            // If product has variants but the variants have 0 stock 
            // and the product has global stock, we backfill the first variant
            if (product.inventory.quantity > 0) {
                const totalVariantStock = product.variants.reduce((sum, v) => sum + (v.inventory || 0), 0);

                if (totalVariantStock === 0) {
                    console.log(`Backfilling stock for ${product.name}: ${product.inventory.quantity} -> Variant[0]`);
                    product.variants[0].inventory = product.inventory.quantity;
                    updated = true;
                }
            }

            if (updated) {
                await product.save();
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
