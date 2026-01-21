import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product';

dotenv.config();

const fixInventoryTypes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB');

        console.log('Searching for products with non-numeric inventory...');

        // Find all products where inventory.quantity is NOT a number
        const result = await Product.collection.updateMany(
            { "inventory.quantity": { $not: { $type: "number" } } },
            { $set: { "inventory.quantity": 0 } }
        );

        console.log(`Successfully fixed ${result.modifiedCount} products.`);

        // Also check for nulls explicitly
        const resultNulls = await Product.collection.updateMany(
            { "inventory.quantity": null },
            { $set: { "inventory.quantity": 0 } }
        );

        console.log(`Successfully fixed ${resultNulls.modifiedCount} null inventory values.`);

        process.exit(0);
    } catch (error) {
        console.error('Error fixing inventory types:', error);
        process.exit(1);
    }
};

fixInventoryTypes();
