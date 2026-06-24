import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Campaign from '../models/Campaign';
import Customer from '../models/Customer';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
    console.log('Connected to MongoDB. Aligning customers with campaign filters...');

    const campaigns = await Campaign.find({}).lean();
    if (campaigns.length === 0) {
        console.log('No campaigns found to align.');
        process.exit();
    }

    for (const campaign of campaigns) {
        const tags = campaign.segmentFilters?.tags || [];
        const consentStatus = campaign.segmentFilters?.consentStatus || 'subscribed';
        
        console.log(`Campaign "${campaign.name}" (${campaign._id}) expects tags: ${JSON.stringify(tags)}, status: "${consentStatus}"`);

        // Find all customers for this store
        const customers = await Customer.find({ storeId: campaign.storeId });
        
        if (customers.length === 0) {
            console.log(`No customers found for store ${campaign.storeId}. Creating a matching subscriber...`);
            await Customer.create({
                storeId: campaign.storeId,
                email: 'test-subscriber@example.com',
                firstName: 'Test',
                lastName: 'Subscriber',
                consentStatus: consentStatus,
                tags: tags,
                source: 'test-alignment',
                consentHistory: [
                    {
                        status: consentStatus,
                        action: 'opt_in_signup',
                        ipAddress: '127.0.0.1',
                        userAgent: 'Test Agent',
                        consentText: 'Test Consent Alignment'
                    }
                ]
            });
        } else {
            console.log(`Updating ${customers.length} existing customer(s) for store ${campaign.storeId} to match filters...`);
            for (const cust of customers) {
                cust.consentStatus = consentStatus as any;
                // Merge tags to preserve existing tags but ensure expected tags exist
                const mergedTags = Array.from(new Set([...(cust.tags || []), ...tags]));
                cust.tags = mergedTags;
                await cust.save();
                console.log(`  Updated Customer: ${cust.email} -> Status: ${cust.consentStatus}, Tags: ${JSON.stringify(cust.tags)}`);
            }
        }
    }

    console.log('Alignment completed successfully!');
    process.exit();
}).catch(err => {
    console.error('Failed to align customers:', err);
    process.exit(1);
});
