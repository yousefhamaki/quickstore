import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Assuming standard models exist or redefining them strictly for the script
const subscriptionPlanSchema = new mongoose.Schema({}, { strict: false });
const SubscriptionPlan = mongoose.models.SubscriptionPlan || mongoose.model('SubscriptionPlan', subscriptionPlanSchema, 'subscriptionplans');

const storeSchema = new mongoose.Schema({}, { strict: false });
const Store = mongoose.models.Store || mongoose.model('Store', storeSchema, 'stores');

async function migratePlansAndStores() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected successfully.\n');

        console.log('--- MIGRATING SUBSCRIPTION PLANS ---');
        const plans = await SubscriptionPlan.find({});
        let plansModifiedCount = 0;

        for (const plan of plans) {
            // Determine if the plan gets the UCD feature
            const planName = (plan.get('name') || plan.get('name_en') || '').toLowerCase();
            
            let allowUCD = false;
            // Free and Basic = false, Pro and Enterprise = true
            if (planName.includes('pro') || planName.includes('enterprise')) {
                allowUCD = true;
            }

            const currentFeatures = plan.get('features') || {};
            
            await SubscriptionPlan.updateOne(
                { _id: plan._id },
                { $set: { 'features.allowUCD': allowUCD } }
            );

            console.log(`Updated Plan: ${planName} (ID: ${plan._id}) -> allowUCD: ${allowUCD}`);
            plansModifiedCount++;
        }
        
        console.log(`\nCompleted Plans Migration. Total Plans Modified: ${plansModifiedCount}\n`);

        console.log('--- MIGRATING STORES ---');
        const stores = await Store.find({});
        let storesModifiedCount = 0;
        let storesSkippedCount = 0;

        // Create a fast lookup map for plans to avoid querying inside the loop
        const updatedPlans = await SubscriptionPlan.find({});
        const planMap = new Map();
        updatedPlans.forEach(p => {
            planMap.set(p._id.toString(), p.get('features.allowUCD') || false);
        });

        for (const store of stores) {
            const subscription = store.get('subscription');
            if (!subscription || !subscription.planId) {
                console.log(`Skipping Store: ${store.get('name')} (ID: ${store._id}) - No active subscription found.`);
                storesSkippedCount++;
                continue;
            }

            const planIdStr = subscription.planId.toString();
            const shouldAllowUCD = planMap.has(planIdStr) ? planMap.get(planIdStr) : false;

            await Store.updateOne(
                { _id: store._id },
                { $set: { 'subscription.features.allowUCD': shouldAllowUCD } }
            );

            storesModifiedCount++;
        }

        console.log(`\nCompleted Stores Migration.`);
        console.log(`Total Stores Modified: ${storesModifiedCount}`);
        console.log(`Total Stores Skipped: ${storesSkippedCount}\n`);
        
        console.log('Migration finished successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed with error:', error);
        process.exit(1);
    }
}

migratePlansAndStores();
