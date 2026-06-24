import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SubscriptionPlan from './models/SubscriptionPlan';

dotenv.config();

const plans = [
    {
        name: 'Free',
        name_en: 'Starter',
        name_ar: 'البداية',
        description_en: 'Perfect for testing your idea and small creators starting out.',
        description_ar: 'مثالي لاختبار فكرتك وصناع المحتوى الصغار الذين يبدأون رحلتهم.',
        type: 'free',
        price: 0,
        monthlyPrice: 0,
        currency: 'EGP',
        maxStores: 1,
        storeLimit: 1,
        productLimit: 10,
        orderFee: 5,
        duration: 3650, // 10 years for free plan
        features_en: [
            '1 Online Store',
            'Up to 10 Products',
            'Community Support',
            'Buildora Subdomain (.buildora.com)',
            'Standard Themes',
            '0 monthly marketing emails'
        ],
        features_ar: [
            'متجر واحد على الإنترنت',
            'حتى 10 منتجات',
            'دعم المجتمع',
            'نطاق فرعي من بيلدورا (.buildora.com)',
            'قوالب قياسية',
            '0 رسائل بريد إلكتروني تسويقية شهرياً'
        ],
        features: {
            dropshipping: false,
            customDomain: false,
            allowUCD: false,   // UCD is a Pro+ feature
        },
        emailLimit: 0,
        isActive: true
    },
    {
        name: 'Basic',
        name_en: 'Professional',
        name_ar: 'الاحترافي',
        description_en: 'Best for growing businesses needing custom branding and advanced tools.',
        description_ar: 'الأفضل للشركات المتنامية التي تحتاج إلى علامة تجارية مخصصة وأدوات متقدمة.',
        type: 'paid',
        price: 499,
        monthlyPrice: 499,
        currency: 'EGP',
        maxStores: 3,
        storeLimit: 3,
        productLimit: -1, // Unlimited
        orderFee: 0,
        duration: 30,
        features_en: [
            '3 Online Stores',
            'Unlimited Products',
            'Priority Email Support',
            'Custom Domain Support',
            'Premium Themes & Builder',
            'Instapay & VCash Integration',
            'Advanced Analytics',
            '500 free monthly emails'
        ],
        features_ar: [
            '3 متاجر إلكترونية',
            'منتجات غير محدودة',
            'دعم بريد إلكتروني ذو أولوية',
            'دعم النطاق المخصص',
            'قوالب ممتازة ومنشئ قوالب',
            'تكامل إنستاباي وفودافون كاش',
            'تحليلات متقدمة',
            '500 رسائل بريد إلكتروني مجانية شهرياً'
        ],
        features: {
            dropshipping: true,
            customDomain: true,
            allowUCD: false,   // UCD is a Pro+ feature
        },
        emailLimit: 500,
        isActive: true
    },
    {
        name: 'Pro',
        name_en: 'Professional Plus',
        name_ar: 'الاحترافي بلس',
        description_en: 'Best for growing businesses needing custom branding and advanced tools.',
        description_ar: 'الأفضل للشركات المتنامية التي تحتاج إلى علامة تجارية مخصصة وأدوات متقدمة.',
        type: 'paid',
        price: 999,
        monthlyPrice: 999,
        currency: 'EGP',
        maxStores: 10,
        storeLimit: 10,
        productLimit: -1, // Unlimited
        orderFee: 0,
        duration: 30,
        features_en: [
            '10 Online Stores',
            'Unlimited Products',
            'Priority Email Support',
            'Custom Domain Support',
            'Premium Themes & Builder',
            'Instapay & VCash Integration',
            'Advanced Analytics',
            '1000 free monthly emails'
        ],
        features_ar: [
            '10 متاجر إلكترونية',
            'منتجات غير محدودة',
            'دعم بريد إلكتروني ذو أولوية',
            'دعم النطاق المخصص',
            'قوالب ممتازة ومنشئ قوالب',
            'تكامل إنستاباي وفودافون كاش',
            'تحليلات متقدمة',
            '1000 رسائل بريد إلكتروني مجانية شهرياً'
        ],
        features: {
            dropshipping: true,
            customDomain: true,
            allowUCD: true,    // Upsell / Cross-sell / Down-sell engine enabled
        },
        emailLimit: 1000,
        isActive: true
    },
    {
        name: 'Enterprise',
        name_en: 'Enterprise',
        name_ar: 'المؤسسات',
        description_en: 'For high-volume merchants needing dedicated resources and custom solutions.',
        description_ar: 'للتجار ذوي الحجم الكبير الذين يحتاجون إلى موارد مخصصة وحلول مخصصة.',
        type: 'paid',
        price: 1499,
        monthlyPrice: 1499,
        currency: 'EGP',
        maxStores: 50,
        storeLimit: 50,
        productLimit: -1, // Unlimited
        orderFee: 0,
        duration: 30,
        features_en: [
            '50 Online Stores',
            'Dedicated Account Manager',
            'Custom Integration Support',
            'SLA & Priority Chat Support',
            'Advanced Security Features',
            'Custom Feature Development',
            'Highest Performance Servers',
            '1500 free monthly emails'
        ],
        features_ar: [
            '50 متجر إلكتروني',
            'مدير حساب مخصص',
            'دعم التكامل المخصص',
            'اتفاقية مستوى الخدمة ودعم الدردشة ذو الأولوية',
            'ميزات أمنية متقدمة',
            'تطوير ميزات مخصصة',
            'أعلى أداء للخواتم',
            '1500 رسائل بريد إلكتروني مجانية شهرياً'
        ],
        features: {
            dropshipping: true,
            customDomain: true,
            allowUCD: true,    // Upsell / Cross-sell / Down-sell engine enabled
        },
        emailLimit: 1500,
        isActive: true
    }
];

const seedPlans = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB');

        await SubscriptionPlan.deleteMany();
        console.log('Cleared existing plans');

        await SubscriptionPlan.insertMany(plans);
        console.log('Subscription plans seeded successfully');

        process.exit();
    } catch (error) {
        console.error('Error seeding plans:', error);
        process.exit(1);
    }
};

seedPlans();
