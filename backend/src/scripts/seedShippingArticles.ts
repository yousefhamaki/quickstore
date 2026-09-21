/**
 * Adds Help Center coverage for the real Bosta courier integration
 * (backend/src/services/shipping/BostaShippingService.ts, wired through
 * ShippingFactory into shippingController.ts + the store settings/shipping
 * page). No prior article covered connecting/using it — "Adding Tracking
 * Numbers to Orders" only covers the separate manual-entry path.
 *
 * Idempotent: skips any title that already exists, safe to re-run.
 * Run: npx ts-node src/scripts/seedShippingArticles.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Article from '../models/Article';

dotenv.config();

const articles = [
    {
        title: "How to connect Bosta for shipping?",
        summary: "Link your own Bosta courier account to Buildora so orders can get real waybills and live tracking automatically.",
        content: "Bosta is a real courier integration — Buildora doesn't sign a shipping contract for you, it connects to an account you already have (or create) with Bosta.",
        steps: [
            "Sign up for a Bosta business account at bosta.co if you don't already have one, and get your API key from your Bosta dashboard.",
            "In Buildora, go to Store Dashboard > Settings > Shipping.",
            "Turn on 'Enable shipping', set Provider to 'Bosta'.",
            "Paste your Bosta API key and save.",
            "Your store is now connected — every new order can generate a real Bosta waybill.",
        ],
        titleAr: "كيفية ربط بوسطة للشحن؟",
        summaryAr: "اربط حساب بوسطة الخاص بك بمنصة بيلدورا للحصول على بوليصات شحن حقيقية وتتبع مباشر تلقائياً.",
        contentAr: "بوسطة تكامل حقيقي مع شركة شحن — بيلدورا لا توقع عقد شحن نيابة عنك، بل تربط حساباً لديك بالفعل مع بوسطة (أو تنشئه).",
        stepsAr: [
            "أنشئ حساب أعمال في bosta.co إذا لم يكن لديك حساب بالفعل، واحصل على مفتاح API الخاص بك من لوحة تحكم بوسطة.",
            "في بيلدورا، اذهب إلى لوحة تحكم المتجر > الإعدادات > الشحن.",
            "فعّل 'تفعيل الشحن'، واختر بوسطة كموفر الخدمة.",
            "الصق مفتاح API الخاص بك واحفظ.",
            "متجرك الآن مرتبط — يمكن لأي طلب جديد إصدار بوليصة شحن حقيقية من بوسطة.",
        ],
        category: 'shipping',
        tags: ["shipping", "bosta", "courier", "integration", "api key"],
        isActive: true,
    },
    {
        title: "How to generate and track a Bosta waybill?",
        summary: "Once Bosta is connected, generate a real waybill for an order and follow its delivery status live.",
        content: "Once your store's shipping provider is set to Bosta, every order can get a real waybill and live tracking, from your dashboard or the merchant mobile app.",
        steps: [
            "Open the order you want to ship.",
            "Click 'Generate Waybill' — Buildora creates a real shipment with Bosta and returns a tracking number and a downloadable waybill.",
            "Click 'Download Waybill' to get the PDF label to attach to the package.",
            "Use 'Track Shipment' anytime to pull Bosta's live delivery status for that order.",
        ],
        titleAr: "كيفية إصدار وتتبع بوليصة شحن بوسطة؟",
        summaryAr: "بعد ربط بوسطة، يمكنك إصدار بوليصة شحن حقيقية لأي طلب ومتابعة حالة توصيله مباشرة.",
        contentAr: "بمجرد ضبط موفر الشحن على بوسطة، يمكن لأي طلب الحصول على بوليصة شحن حقيقية وتتبع مباشر، سواء من لوحة التحكم أو من تطبيق الجوال للتجار.",
        stepsAr: [
            "افتح الطلب الذي تريد شحنه.",
            "اضغط على 'إصدار بوليصة الشحن' — سينشئ بيلدورا شحنة حقيقية مع بوسطة ويعيد رقم تتبع وبوليصة قابلة للتحميل.",
            "اضغط 'تحميل البوليصة' للحصول على ملف PDF لإرفاقه بالطرد.",
            "استخدم 'تتبع الشحنة' في أي وقت لجلب حالة التوصيل المباشرة من بوسطة لهذا الطلب.",
        ],
        category: 'shipping',
        tags: ["shipping", "bosta", "waybill", "tracking", "orders"],
        isActive: true,
    },
];

async function main() {
    await mongoose.connect(process.env.MONGODB_URI as string);

    for (const def of articles) {
        const existing = await Article.findOne({ title: def.title });
        if (existing) {
            console.log(`Skipping (already exists): ${def.title}`);
            continue;
        }
        await Article.create(def);
        console.log(`Created: ${def.title}`);
    }

    await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
