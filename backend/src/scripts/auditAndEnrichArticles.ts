/**
 * One-off maintenance script for the /support Help Center content.
 *
 * The original seedArticles.ts (76 docs) mixed real Buildora features with
 * generic e-commerce-SaaS boilerplate that doesn't exist in this codebase
 * (Gift Cards, Loyalty Points, Affiliate/Referral program, Mailchimp,
 * Webhooks, Staff/Permissions, Wholesale bulk pricing, Landing Pages,
 * PayPal, Fawry, Google Merchant Center, Instagram/Facebook catalog sync,
 * CSV bulk import, custom checkout fields, a cart-drawer cross-sell widget)
 * — verified absent via repo-wide search (models/controllers/routes) before
 * being listed here. Telling a merchant to go find a menu that doesn't
 * exist is worse than saying nothing, so those are deactivated (soft —
 * isActive:false, not deleted) rather than left live.
 *
 * This script, run once against the existing collection:
 *   1. Deactivates the confirmed-fictional articles by exact title.
 *   2. Backfills `category` + `steps` (parsed from the existing numbered-
 *      list content) + `order` on every article that stays active.
 *   3. Inserts a batch of new articles for real features that had no
 *      coverage at all (hero slider, setup checklist, plans/billing,
 *      refund requests, offers/UCD, store publish lifecycle).
 *
 * Run: npx ts-node src/scripts/auditAndEnrichArticles.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Article from '../models/Article';

dotenv.config();

// Exact titles from seedArticles.ts confirmed to describe features with no
// matching model/controller/route anywhere in backend/src.
const FICTIONAL_TITLES = [
    'Accepting International Payments',       // PayPal — explicitly unfinished/blocked (paymentProviders.ts)
    'PayPal Business Verification',
    'How to use Fawry for payments?',         // Fawry service is an unfinished skeleton, not reachable
    'Generating Gift Cards',
    'Loyalty Points Program',
    'Affiliate Marketing (Referrals)',
    'Email Marketing with Mailchimp',
    'Wholesale & Bulk Pricing',
    'Creating Landing Pages for Ads',
    'What are Staff Permissions?',
    'Cross-selling in the Cart',
    'Adding Custom Order attributes',
    'What are Webhooks?',                     // only an INBOUND Paymob payment webhook exists, nothing merchant-configurable
    'What is Google Merchant Center?',
    'Bulk Import Products with CSV',
    "How to use 'WhatsApp Floating Button'?",
    'Instagram Shopping (Product Catalog)',
    "Facebook 'Shop' tab Integration",
    'Google Search Console Verification',     // no header-scripts/verification-tag field on Store.seo
];

// Per-title category assignment — more reliable than a tag/keyword
// heuristic given how mixed the original tagging is.
const CATEGORY_BY_TITLE: Record<string, string> = {
    // payments
    'How to contact Buildora Support?': 'account-support',
    'How to accept Instapay payments?': 'payments',
    'Setting up Vodafone Cash': 'payments',
    'How to integrate Paymob?': 'payments',
    'Accepting Cash on Delivery (COD)': 'payments',
    'Accepting Etisalat Cash': 'payments',
    'Orange Cash Integration': 'payments',
    'Bank Transfer Instructions': 'payments',
    'Setting up Partial Payments': 'payments',
    'How to handle payment refunds?': 'payments',
    'Transaction Fees FAQ': 'payments',
    'Minimum Order Total for Specific Payments': 'payments',
    'What is a Payment Surcharge?': 'payments',
    'How to verify manual receipts?': 'payments',
    'Integration IDs for Paymob': 'payments',
    'What is an HMAC Secret?': 'payments',
    'Currency Settings (EGP)': 'payments',
    'Handling Payment Timeouts': 'payments',
    'Accepting ValU Installments': 'payments',
    'Secure Checkout with SSL': 'domains-theme',
    'Common Paymob Integration Errors': 'payments',
    'How to withdraw Paymob funds?': 'payments',
    // domains / theme
    'Connecting a Custom Domain': 'domains-theme',
    'How to change store theme?': 'domains-theme',
    // orders / products
    'Managing Order Status': 'orders',
    'Product SKUs and Barcodes': 'products',
    'Setting up Shipping Zones': 'shipping',
    'Free Shipping Rules': 'shipping',
    'How to Weight-based Shipping works?': 'shipping',
    'Managing Product Variants': 'products',
    'How to Print Invoices?': 'orders',
    'Adding Tracking Numbers to Orders': 'orders',
    'Handling Order Cancelling': 'orders',
    'Customer Profiles and History': 'orders',
    'Dashboard Analytics overview': 'analytics',
    'Top-Selling Products Report': 'analytics',
    'Creating Discount Coupons': 'marketing',
    'Tracking Abandoned Carts': 'marketing',
    'What is the Support Ticket system?': 'account-support',
    'Email Notification options': 'account-support',
    'Revenue vs Profit reporting': 'analytics',
    'How to export Order list to Excel?': 'analytics',
    'Stock Movement Logs': 'products',
    'Printing Delivery Manifests': 'shipping',
    // marketing / growth
    'Setting up Facebook Pixel': 'marketing',
    'Setting up Google Analytics (GA4)': 'marketing',
    'TikTok Pixel Integration': 'marketing',
    'Snapchat Pixel Setup': 'marketing',
    'Submitting your Sitemap to Google': 'domains-theme',
    'Abandoned Cart Email Automations': 'marketing',
    'Pinterest Pixel for Visual Brands': 'marketing',
    'Creating \'Limited Time\' Offers': 'marketing',
    'Upselling at Checkout': 'marketing',
    'Collecting Product Reviews': 'products',
    'Dynamic Remarketing Ads': 'marketing',
    'Google Analytics Enhanced Ecommerce': 'analytics',
    'Influencer Tracking Codes': 'marketing',
};

/** Splits "...\n1. First\n2. Second\n3. Third" into ["First","Second","Third"]. */
function extractSteps(content: string): string[] {
    if (!content) return [];
    const lines = content.split('\n');
    const steps: string[] = [];
    for (const line of lines) {
        const match = line.match(/^\s*\d+\.\s+(.*)$/);
        if (match && match[1].trim()) steps.push(match[1].trim());
    }
    return steps;
}

const NEW_ARTICLES = [
    {
        title: 'Setting up your store from scratch',
        summary: 'The exact order to follow when you first create a store, so nothing gets missed.',
        content: 'Buildora tracks your setup progress automatically and shows it as a percentage banner across your dashboard until every step is done. Complete these in order for the smoothest start.',
        titleAr: 'إعداد متجرك من الصفر',
        summaryAr: 'الترتيب الصحيح لإعداد متجرك عند إنشائه لأول مرة، حتى لا تفوتك أي خطوة.',
        contentAr: 'تتابع بيلدورا تقدم إعداد متجرك تلقائياً وتعرضه كنسبة مئوية في شريط أعلى لوحة التحكم حتى تكتمل كل الخطوات. أكمل هذه الخطوات بالترتيب لبداية سلسة.',
        steps: [
            'Create your store: give it a name, description, and category.',
            'Add your logo and brand colors in Settings > Appearance — this also generates your favicon automatically.',
            'Add at least 5 products with clear photos and prices.',
            'Configure at least one payment method (Manual/COD is enabled by default; connect Paymob for automatic card payments).',
            'Set up a shipping zone with a rate for at least one region you deliver to.',
            'Add your Return and Privacy policies under Settings > Policies.',
            'Publish your store from the store dashboard once you\'re ready to go live.',
        ],
        stepsAr: [
            'أنشئ متجرك: أضف اسماً ووصفاً وتصنيفاً.',
            'أضف شعارك وألوان علامتك التجارية في الإعدادات > المظهر — يُنشئ هذا أيقونة المتصفح (favicon) تلقائياً.',
            'أضف 5 منتجات على الأقل بصور وأسعار واضحة.',
            'فعّل وسيلة دفع واحدة على الأقل (الدفع اليدوي/عند الاستلام مفعل افتراضياً؛ اربط بي موب للدفع التلقائي بالبطاقات).',
            'أعد منطقة شحن واحدة على الأقل بسعر لمنطقة تقوم بالتوصيل إليها.',
            'أضف سياسات الإرجاع والخصوصية في الإعدادات > السياسات.',
            'انشر متجرك من صفحة لوحة تحكم المتجر عندما تكون جاهزاً للانطلاق.',
        ],
        category: 'getting-started',
        tags: ['getting-started', 'onboarding', 'checklist'],
        order: 1,
        isActive: true,
    },
    {
        title: 'Understanding your store setup progress banner',
        summary: 'A percentage banner appears on every screen of your store dashboard until setup is 100% complete.',
        content: 'This banner tracks 6 things: store info, branding, having 5+ products, a payment method, a shipping zone, and store policies. It shows on every page — not just the store overview — and disappears automatically once everything is done. Click "Finish setup" on the banner to jump straight to the full checklist with links to each remaining step.',
        titleAr: 'فهم شريط تقدم إعداد المتجر',
        summaryAr: 'يظهر شريط بنسبة مئوية في كل شاشات لوحة تحكم متجرك حتى يكتمل الإعداد 100٪.',
        contentAr: 'يتتبع هذا الشريط 6 أشياء: معلومات المتجر، الهوية البصرية، وجود 5 منتجات أو أكثر، وسيلة دفع، منطقة شحن، وسياسات المتجر. يظهر في كل صفحة — وليس فقط في نظرة عامة على المتجر — ويختفي تلقائياً بمجرد اكتمال كل شيء. اضغط "إكمال الإعداد" في الشريط للانتقال مباشرة إلى القائمة الكاملة مع روابط لكل خطوة متبقية.',
        category: 'getting-started',
        tags: ['getting-started', 'onboarding', 'checklist'],
        order: 2,
        isActive: true,
    },
    {
        title: 'Choosing and changing your subscription plan',
        summary: 'Every plan has a store limit, a product limit, and a per-order fee — upgrade any time from Billing.',
        content: 'Each plan sets: how many stores you can create, how many products per store, and a small transaction fee per order. Some plan-gated features (like custom domains or the homepage hero slider) can also be turned on or off per plan by our team.',
        titleAr: 'اختيار وتغيير باقة اشتراكك',
        summaryAr: 'لكل باقة حد للمتاجر، وحد للمنتجات، ورسوم صغيرة لكل طلب — قم بالترقية في أي وقت من صفحة الفواتير.',
        contentAr: 'تحدد كل باقة: عدد المتاجر التي يمكنك إنشاؤها، عدد المنتجات لكل متجر، ورسوماً صغيرة لكل طلب. بعض الميزات المقيدة بالباقة (مثل النطاقات المخصصة أو سلايدر الصفحة الرئيسية) يمكن أيضاً تفعيلها أو إيقافها لكل باقة من قبل فريقنا.',
        steps: [
            'Go to Billing from your account menu.',
            'Compare plans by store limit, product limit, and order fee.',
            'Click Subscribe on the plan you want.',
            'Pay from your Buildora wallet balance or top it up first if needed.',
            'Your new limits and features apply immediately after payment.',
        ],
        stepsAr: [
            'اذهب إلى الفواتير من قائمة حسابك.',
            'قارن الباقات حسب حد المتاجر، حد المنتجات، ورسوم الطلب.',
            'اضغط اشترك على الباقة التي تريدها.',
            'ادفع من رصيد محفظتك في بيلدورا أو اشحنها أولاً إذا لزم الأمر.',
            'تُطبق حدودك وميزاتك الجديدة فوراً بعد الدفع.',
        ],
        category: 'getting-started',
        tags: ['billing', 'plans', 'subscription'],
        order: 3,
        isActive: true,
    },
    {
        title: 'Adding a homepage hero slider',
        summary: 'Show a rotating banner as the first thing shoppers see — mix plain images with real, clickable products.',
        content: 'The hero slider replaces the plain welcome text on your homepage with a full carousel. Each slide is either a plain image (optionally linking anywhere) or a real product from your catalog, which always links straight to that product\'s page. It autoplays every 5 seconds and pauses whenever a shopper hovers over it.',
        titleAr: 'إضافة سلايدر للصفحة الرئيسية',
        summaryAr: 'اعرض بانراً متحركاً كأول ما يراه العملاء — امزج بين صور عادية ومنتجات حقيقية قابلة للنقر.',
        contentAr: 'يستبدل السلايدر النص الترحيبي العادي في صفحتك الرئيسية بعرض متحرك كامل. كل شريحة إما صورة عادية (يمكن ربطها بأي رابط اختيارياً) أو منتج حقيقي من كتالوجك، والذي يؤدي دائماً مباشرة إلى صفحة هذا المنتج. يتحرك تلقائياً كل 5 ثوانٍ ويتوقف عند تمرير الماوس عليه.',
        steps: [
            'Go to your store\'s Settings > Theme.',
            'Scroll to "Homepage Hero Slider" and click Add Slide.',
            'Upload an image for the slide.',
            'Choose "Image only" (optionally add a link) or "A product" and search your catalog.',
            'Add an optional caption, then click Add Slide.',
            'Reorder slides with the up/down arrows if you add more than one.',
            'Click Save Slider — it appears on your live storefront right away.',
        ],
        stepsAr: [
            'اذهب إلى إعدادات متجرك > الثيم.',
            'انزل إلى "سلايدر الصفحة الرئيسية" واضغط إضافة شريحة.',
            'ارفع صورة للشريحة.',
            'اختر "صورة فقط" (مع رابط اختياري) أو "منتج" وابحث في كتالوجك.',
            'أضف تعليقاً اختيارياً، ثم اضغط إضافة الشريحة.',
            'أعد ترتيب الشرائح بأسهم الأعلى/الأسفل إذا أضفت أكثر من شريحة.',
            'اضغط حفظ السلايدر — يظهر على متجرك الفعلي فوراً.',
        ],
        category: 'domains-theme',
        tags: ['theme', 'hero-slider', 'homepage', 'design'],
        order: 4,
        isActive: true,
    },
    {
        title: 'Handling customer refund requests',
        summary: 'Customers can request a refund from their order; you review and approve or decline it from your dashboard.',
        content: 'Refund requests are their own queue, separate from regular order management, so you can review the reason and evidence a customer provides before deciding.',
        titleAr: 'التعامل مع طلبات استرداد العملاء',
        summaryAr: 'يمكن للعملاء طلب استرداد من طلبهم؛ تقوم أنت بمراجعته والموافقة عليه أو رفضه من لوحة تحكمك.',
        contentAr: 'طلبات الاسترداد لها قائمة خاصة بها، منفصلة عن إدارة الطلبات العادية، لتتمكن من مراجعة السبب والدليل الذي يقدمه العميل قبل اتخاذ القرار.',
        steps: [
            'Open Refund Requests from your store\'s sidebar.',
            'Review the customer\'s reason and any photos they attached.',
            'Approve to process the refund, or decline with a note explaining why.',
            'If approved, refund the customer through whichever payment method they used (see "How to handle payment refunds?").',
        ],
        stepsAr: [
            'افتح طلبات الاسترداد من القائمة الجانبية لمتجرك.',
            'راجع سبب العميل وأي صور أرفقها.',
            'وافق لمعالجة الاسترداد، أو ارفض مع ملاحظة توضح السبب.',
            'إذا تمت الموافقة، استرد للعميل عبر وسيلة الدفع التي استخدمها (راجع "كيفية التعامل مع استرداد الأموال؟").',
        ],
        category: 'orders',
        tags: ['orders', 'refunds', 'customers'],
        order: 5,
        isActive: true,
    },
    {
        title: 'Upsell, cross-sell, and down-sell offers',
        summary: 'A Pro-plan feature: show shoppers a related offer right when they\'re about to check out or right after they buy.',
        content: 'Offer campaigns let you attach a related product suggestion to a trigger product — shown as an upsell/cross-sell before checkout, or a down-sell if they decline a higher offer. This is gated to specific plans; if you don\'t see "Offers" in your sidebar, your current plan doesn\'t include it yet.',
        titleAr: 'عروض البيع الإضافي والمتبادل والبديل',
        summaryAr: 'ميزة حصرية للباقات الاحترافية: اعرض للعملاء عرضاً ذا صلة لحظة إتمام الشراء أو بعده مباشرة.',
        contentAr: 'تتيح لك حملات العروض ربط اقتراح منتج ذي صلة بمنتج محفز — يُعرض كبيع إضافي/متبادل قبل الدفع، أو كعرض بديل إذا رفض العميل عرضاً أعلى. هذه الميزة مقيدة ببعض الباقات؛ إذا لم تجد "العروض" في القائمة الجانبية، فباقتك الحالية لا تتضمنها بعد.',
        steps: [
            'Go to Offers in your store\'s sidebar (only visible if your plan includes it).',
            'Create a campaign and pick a trigger product.',
            'Choose the related product(s) to offer alongside it.',
            'Set whether it shows as an upsell, cross-sell, or down-sell, and any discount.',
            'Activate the campaign — it starts showing to shoppers immediately.',
        ],
        stepsAr: [
            'اذهب إلى العروض في القائمة الجانبية لمتجرك (تظهر فقط إذا كانت باقتك تتضمنها).',
            'أنشئ حملة واختر منتجاً محفزاً.',
            'اختر المنتج (أو المنتجات) ذات الصلة لعرضها بجانبه.',
            'حدد ما إذا كانت تظهر كبيع إضافي، متبادل، أو بديل، وأي خصم.',
            'فعّل الحملة — تبدأ في الظهور للعملاء فوراً.',
        ],
        category: 'marketing',
        tags: ['offers', 'upsell', 'cross-sell', 'marketing'],
        order: 6,
        isActive: true,
    },
    {
        title: 'Publishing, pausing, and resuming your store',
        summary: 'A new store starts as a draft — nothing is visible to customers until you publish it.',
        content: 'Publishing makes your store live at its subdomain (or connected custom domain). Pausing takes it offline temporarily (e.g. during restocking) without losing any data — customers see a "currently unavailable" message instead of a 404.',
        titleAr: 'نشر وإيقاف واستئناف متجرك',
        summaryAr: 'يبدأ المتجر الجديد كمسودة — لا يظهر شيء للعملاء حتى تقوم بنشره.',
        contentAr: 'النشر يجعل متجرك مباشراً على نطاقه الفرعي (أو النطاق المخصص المربوط). الإيقاف المؤقت يخرج المتجر من الخدمة مؤقتاً (مثلاً أثناء إعادة التخزين) دون فقدان أي بيانات — يرى العملاء رسالة "غير متاح حالياً" بدلاً من صفحة غير موجودة.',
        steps: [
            'Open your store\'s dashboard overview page.',
            'Click Publish once your setup checklist looks good — you don\'t have to be at 100%, but a fully-set-up store gives customers a better first impression.',
            'Use Pause any time you need to temporarily take the storefront offline.',
            'Use Resume to bring it back live exactly as it was.',
        ],
        stepsAr: [
            'افتح صفحة نظرة عامة على متجرك في لوحة التحكم.',
            'اضغط نشر بمجرد أن تبدو قائمة الإعداد جيدة — لا يلزم الوصول لـ 100٪، لكن المتجر المكتمل الإعداد يعطي انطباعاً أولياً أفضل للعملاء.',
            'استخدم إيقاف مؤقت في أي وقت تحتاج فيه لإخراج المتجر من الخدمة مؤقتاً.',
            'استخدم استئناف لإعادته مباشراً كما كان تماماً.',
        ],
        category: 'getting-started',
        tags: ['store', 'publish', 'lifecycle'],
        order: 7,
        isActive: true,
    },
];

const auditAndEnrichArticles = async () => {
    try {
        await mongoose.connect((process.env.MONGO_URI || process.env.MONGODB_URI) as string);
        console.log('Connected to MongoDB.');

        const deactivated = await Article.updateMany(
            { title: { $in: FICTIONAL_TITLES } },
            { $set: { isActive: false } }
        );
        console.log(`Deactivated ${deactivated.modifiedCount} articles describing features that don't exist in this codebase.`);

        const existing = await Article.find({ isActive: true, title: { $nin: FICTIONAL_TITLES } });
        let enriched = 0;
        for (const article of existing) {
            const category = CATEGORY_BY_TITLE[article.title];
            const steps = extractSteps(article.content);
            const stepsAr = article.contentAr ? extractSteps(article.contentAr) : [];
            const update: any = {};
            if (category) update.category = category;
            if (steps.length >= 2) update.steps = steps; // require 2+ to count as a real "steps" article
            if (stepsAr.length >= 2) update.stepsAr = stepsAr;
            if (Object.keys(update).length > 0) {
                await Article.updateOne({ _id: article._id }, { $set: update });
                enriched++;
            }
        }
        console.log(`Enriched ${enriched} existing articles with category/steps.`);

        for (const doc of NEW_ARTICLES) {
            const already = await Article.findOne({ title: doc.title });
            if (already) {
                await Article.updateOne({ _id: already._id }, { $set: doc });
            } else {
                await Article.create(doc);
            }
        }
        console.log(`Upserted ${NEW_ARTICLES.length} new real-feature articles.`);

        const finalActiveCount = await Article.countDocuments({ isActive: true });
        console.log(`Done. ${finalActiveCount} active articles remain.`);

        process.exit(0);
    } catch (error) {
        console.error('Error auditing articles:', error);
        process.exit(1);
    }
};

auditAndEnrichArticles();
