import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Plan from './models/Plan';

dotenv.config();

const plans = [
    {
        name: 'Free Trial',
        description: 'Perfect for testing the waters.',
        price: 0,
        currency: 'EGP',
        interval: 'month',
        limits: {
            maxStores: 1,
            maxProductsPerStore: 10,
            transactionFeePercent: 5.0
        },
        isActive: true
    },
    {
        name: 'Basic Plan',
        description: 'For growing businesses.',
        price: 299,
        currency: 'EGP',
        interval: 'month',
        limits: {
            maxStores: 1,
            maxProductsPerStore: 100,
            transactionFeePercent: 2.5
        },
        isActive: true
    },
    {
        name: 'Pro Plan',
        description: 'For professional merchants and scaling brands.',
        price: 599,
        currency: 'EGP',
        interval: 'month',
        limits: {
            maxStores: 3,
            maxProductsPerStore: 1000,
            transactionFeePercent: 1.0
        },
        isActive: true
    },
    {
        name: 'Enterprise Plan',
        description: 'Maximum power for large operations.',
        price: 1499,
        currency: 'EGP',
        interval: 'month',
        limits: {
            maxStores: 10,
            maxProductsPerStore: 10000,
            transactionFeePercent: 0.5
        },
        isActive: true
    },
];

const seedPlans = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB');

        await Plan.deleteMany();
        console.log('Cleared existing plans');

        await Plan.insertMany(plans);
        console.log('Subscription plans seeded successfully');

        process.exit();
    } catch (error) {
        console.error('Error seeding plans:', error);
        process.exit(1);
    }
};

seedPlans();
