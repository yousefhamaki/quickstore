import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Store from '../models/Store';
import Customer from '../models/Customer';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
    console.log('Connected to MongoDB. Scanning stores for subscribers...');
    
    const stores = await Store.find({});
    if (stores.length === 0) {
        console.log('No stores found in database. Create a store first.');
        process.exit();
    }

    console.log(`Found ${stores.length} store(s) in database.`);

    for (const store of stores) {
        const count = await Customer.countDocuments({ storeId: store._id, consentStatus: 'subscribed' });
        console.log(`Store "${store.name}" (${store._id}) has ${count} subscribed contacts.`);

        if (count === 0) {
            console.log(`Seeding 3 mock subscribers for store "${store.name}"...`);
            
            const mockSubscribers = [
                {
                    storeId: store._id,
                    email: `alex.jones@example.com`,
                    firstName: 'Alex',
                    lastName: 'Jones',
                    consentStatus: 'subscribed',
                    tags: ['VIP', 'newsletter'],
                    source: 'test-seed',
                    consentHistory: [
                        {
                            status: 'subscribed',
                            action: 'opt_in_signup',
                            ipAddress: '127.0.0.1',
                            userAgent: 'Test Agent',
                            consentText: 'I agree to receive newsletter updates.'
                        }
                    ]
                },
                {
                    storeId: store._id,
                    email: `maria.silva@example.com`,
                    firstName: 'Maria',
                    lastName: 'Silva',
                    consentStatus: 'subscribed',
                    tags: ['active-buyer', 'newsletter'],
                    source: 'test-seed',
                    consentHistory: [
                        {
                            status: 'subscribed',
                            action: 'opt_in_signup',
                            ipAddress: '127.0.0.1',
                            userAgent: 'Test Agent',
                            consentText: 'I agree to receive newsletter updates.'
                        }
                    ]
                },
                {
                    storeId: store._id,
                    email: `yousef.h@example.com`,
                    firstName: 'Yousef',
                    lastName: 'Hamaki',
                    consentStatus: 'subscribed',
                    tags: ['VIP', 'newsletter'],
                    source: 'test-seed',
                    consentHistory: [
                        {
                            status: 'subscribed',
                            action: 'opt_in_signup',
                            ipAddress: '127.0.0.1',
                            userAgent: 'Test Agent',
                            consentText: 'I agree to receive newsletter updates.'
                        }
                    ]
                }
            ];

            await Customer.insertMany(mockSubscribers);
            console.log(`Seeded mock subscribers successfully.`);
        }
    }

    console.log('Seeding process finished.');
    process.exit();
}).catch(err => {
    console.error('Failed to run subscriber seeder:', err);
    process.exit(1);
});
