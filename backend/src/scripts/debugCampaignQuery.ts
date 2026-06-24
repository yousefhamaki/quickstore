import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Campaign from '../models/Campaign';
import Customer from '../models/Customer';
import Store from '../models/Store';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
    console.log('Connected to MongoDB. Running query diagnostic...');

    const campaigns = await Campaign.find({}).lean();
    if (campaigns.length === 0) {
        console.log('No campaigns found in database.');
        process.exit();
    }

    console.log(`Found ${campaigns.length} campaign(s) in database:\n`);

    for (const campaign of campaigns) {
        const store = await Store.findById(campaign.storeId).lean();
        console.log(`Campaign Name: "${campaign.name}"`);
        console.log(`Campaign ID:   ${campaign._id}`);
        console.log(`Store:         "${store?.name}" (${campaign.storeId})`);
        console.log(`Filters:       `, JSON.stringify(campaign.segmentFilters));

        // Let's run the exact matching logic used in campaignController:
        const consentStatus = campaign.segmentFilters?.consentStatus || 'subscribed';
        const query: any = {
            storeId: campaign.storeId,
            consentStatus: consentStatus
        };

        if (campaign.segmentFilters?.tags && campaign.segmentFilters.tags.length > 0) {
            query.tags = { $in: campaign.segmentFilters.tags };
        }

        console.log(`Constructed Query:`, JSON.stringify(query));
        const matchingCount = await Customer.countDocuments(query);
        console.log(`Matching Customers Count: ${matchingCount}`);

        // Print all customers for this store to inspect them
        const allStoreCustomers = await Customer.find({ storeId: campaign.storeId }).lean();
        console.log(`Total Customers in store: ${allStoreCustomers.length}`);
        allStoreCustomers.forEach((cust, index) => {
            console.log(`  [Customer ${index + 1}] Email: ${cust.email}, Status: ${cust.consentStatus}, Tags: ${JSON.stringify(cust.tags)}`);
        });
        console.log('--------------------------------------------------\n');
    }

    process.exit();
}).catch(err => {
    console.error('Diagnostic failed:', err);
    process.exit(1);
});
