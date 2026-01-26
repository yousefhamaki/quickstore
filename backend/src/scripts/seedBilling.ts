import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Plan from '../models/SubscriptionPlan';
import Wallet from '../models/Wallet';
import User from '../models/User';

dotenv.config();

const plans = [
    {
        name: 'Free',
        type: 'free',
        monthlyPrice: 0,
        storeLimit: 1,
        productLimit: 50,
        orderFee: 0.5,
        features: { dropshipping: false, customDomain: false },
        isActive: true
    },
    {
        name: 'Basic',
        type: 'paid',
        monthlyPrice: 499,
        storeLimit: 2,
        productLimit: 500,
        orderFee: 0.5,
        features: { dropshipping: false, customDomain: true },
        isActive: true
    },
    {
        name: 'Pro',
        type: 'paid',
        monthlyPrice: 999,
        storeLimit: 5,
        productLimit: 2000,
        orderFee: 0.5,
        features: { dropshipping: true, customDomain: true },
        isActive: true
    },
    {
        name: 'Enterprise',
        type: 'paid',
        monthlyPrice: 2499,
        storeLimit: -1, // Unlimited
        productLimit: -1, // Unlimited
        orderFee: 0.5,
        features: { dropshipping: true, customDomain: true },
        isActive: true
    }
];

const seedBilling = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB');

        // Seed Plans
        await Plan.deleteMany({});
        const createdPlans = await Plan.insertMany(plans);
        console.log(`Seeded ${createdPlans.length} plans`);

        // Seed Wallets for existing users if missing
        const users = await User.find({});
        let walletsCreated = 0;

        for (const user of users) {
            const existingWallet = await Wallet.findOne({ userId: user._id });
            if (!existingWallet) {
                await Wallet.create({
                    userId: user._id,
                    balance: 250, // Give some starting balance for testing
                    currency: 'EGP'
                });
                walletsCreated++;
            }
        }
        console.log(`Created ${walletsCreated} wallets for existing users`);

        process.exit();
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedBilling();
