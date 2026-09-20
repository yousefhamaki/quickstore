import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Wallet from '../models/Wallet';
import Subscription from '../models/Subscription';
import SubscriptionPlan from '../models/SubscriptionPlan';
import Store from '../models/Store';
import Product from '../models/Product';
import Customer from '../models/Customer';
import Order from '../models/Order';
import { PLAN_MAPPING, PLAN_NAMES, canAccessFeature } from '../config/planFeatures';

// One-off throwaway test account for manually verifying the mobile-merchant
// app's redesign + 5 new feature areas end to end (products, refunds, store
// settings, analytics, coupons). Run with: npx tsx src/scripts/seedMobileMerchantVerification.ts
// Clean up afterward with: npx tsx src/scripts/seedMobileMerchantVerification.ts --cleanup

const TEST_EMAIL = 'mobile.verify.buildora@test.local';
const TEST_PASSWORD = 'Test1234!';

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const user = await User.findOne({ email: TEST_EMAIL });
  if (!user) {
    console.log('No test user found — nothing to clean up.');
    process.exit(0);
  }
  const stores = await Store.find({ ownerId: user._id });
  const storeIds = stores.map((s) => s._id);
  await Order.deleteMany({ storeId: { $in: storeIds } });
  await Product.deleteMany({ storeId: { $in: storeIds } });
  await Customer.deleteMany({ storeId: { $in: storeIds } });
  await Store.deleteMany({ ownerId: user._id });
  await Subscription.deleteMany({ userId: user._id });
  await Wallet.deleteMany({ userId: user._id });
  await User.deleteOne({ _id: user._id });
  console.log('Cleaned up test merchant, store, products, customer, orders, subscription, wallet.');
  process.exit(0);
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB');

  // 1. A plan that includes the 'coupons' feature (Professional+), so the
  // coupons screen isn't blocked by requireFeature('coupons').
  const candidatePlans = await SubscriptionPlan.find({});
  let plan = candidatePlans.find((p) => canAccessFeature(p.name, 'coupons'));
  if (!plan) {
    plan = await SubscriptionPlan.create({
      name: 'Professional',
      name_en: 'Professional',
      name_ar: 'احترافي',
      description_en: 'Test plan',
      description_ar: 'خطة اختبار',
      price: 500,
      currency: 'EGP',
      features_en: ['Coupons'],
      features_ar: ['كوبونات'],
    });
    console.log(`Created fallback SubscriptionPlan "${plan.name}"`);
  } else {
    console.log(`Using existing plan "${plan.name}" (maps to ${PLAN_MAPPING[plan.name] || 'unmapped'})`);
  }

  // 2. Merchant user
  let user = await User.findOne({ email: TEST_EMAIL });
  if (!user) {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    user = await User.create({
      name: 'Mobile Verify Merchant',
      email: TEST_EMAIL,
      passwordHash,
      role: 'merchant',
      authProvider: 'local',
      isVerified: true,
    });
    console.log(`Created merchant user: ${user.email}`);
  } else {
    console.log(`Using existing merchant user: ${user.email}`);
  }

  // 3. Wallet
  let wallet = await Wallet.findOne({ userId: user._id });
  if (!wallet) {
    wallet = await Wallet.create({ userId: user._id, balance: 500, currency: 'EGP' });
    console.log('Created wallet with 500 EGP.');
  }

  // 4. Active subscription on the coupons-capable plan
  let subscription = await Subscription.findOne({ userId: user._id });
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  if (!subscription) {
    subscription = await Subscription.create({
      userId: user._id,
      planId: plan._id,
      status: 'active',
      billingCycle: 'monthly',
      expiresAt,
    });
    console.log('Created active subscription.');
  } else {
    subscription.planId = plan._id as any;
    subscription.status = 'active';
    subscription.expiresAt = expiresAt;
    await subscription.save();
    console.log('Updated existing subscription to active + coupons-capable plan.');
  }

  // 5. Store
  const slug = 'mobile-verify-store';
  let store = await Store.findOne({ ownerId: user._id });
  if (!store) {
    store = await Store.create({
      ownerId: user._id,
      name: 'Mobile Verify Store',
      slug,
      description: 'Throwaway store for mobile-merchant app verification.',
      contact: { email: TEST_EMAIL, phone: '+201000000000' },
      domain: { type: 'subdomain', subdomain: slug, isVerified: true },
    });
    console.log(`Created store: ${store.name} (${store._id})`);
  } else {
    console.log(`Using existing store: ${store.name} (${store._id})`);
  }

  // 6. A couple of seed products (a "create with photo" product is added
  // separately through the real API during interactive verification).
  const existingProducts = await Product.countDocuments({ storeId: store._id });
  if (existingProducts === 0) {
    await Product.create([
      {
        storeId: store._id,
        name: 'Seed Product — Classic Tee',
        slug: 'seed-product-classic-tee',
        description: 'A seeded product for verification.',
        price: 250,
        costPerItem: 120,
        sku: 'SEED-TEE-1',
        inventory: { quantity: 40, lowStockThreshold: 5 },
        status: 'active',
        images: [],
      },
      {
        storeId: store._id,
        name: 'Seed Product — Low Stock Cap',
        slug: 'seed-product-low-stock-cap',
        description: 'A seeded low-stock product for verification.',
        price: 150,
        costPerItem: 60,
        sku: 'SEED-CAP-1',
        inventory: { quantity: 2, lowStockThreshold: 5 },
        status: 'active',
        images: [],
      },
    ]);
    console.log('Created 2 seed products.');
  } else {
    console.log(`Store already has ${existingProducts} product(s) — skipping product seed.`);
  }
  const products = await Product.find({ storeId: store._id }).limit(2);

  // 7. A customer + a paid order (so the refund flow is immediately testable).
  let customer = await Customer.findOne({ storeId: store._id, email: 'verify.customer@test.local' });
  if (!customer) {
    customer = await Customer.create({
      storeId: store._id,
      email: 'verify.customer@test.local',
      firstName: 'Verify',
      lastName: 'Customer',
      phone: '+201111111111',
    });
    console.log('Created test customer.');
  }

  const orderNumber = 'VERIFY-1001';
  let order = await Order.findOne({ storeId: store._id, orderNumber });
  if (!order) {
    const item1 = products[0];
    const subtotal = item1 ? item1.price * 2 : 500;
    const shipping = 50;
    order = await Order.create({
      storeId: store._id,
      customerId: customer._id,
      orderNumber,
      items: [
        {
          productId: item1?._id,
          name: item1?.name || 'Seed Product',
          quantity: 2,
          price: item1?.price || 250,
          costAtPurchase: item1?.costPerItem,
        },
      ],
      subtotal,
      shipping,
      tax: 0,
      discount: 0,
      total: subtotal + shipping,
      status: 'processing',
      paymentStatus: 'paid',
      paymentMethod: 'card',
      shippingAddress: {
        fullName: 'Verify Customer',
        phone: '+201111111111',
        address: '1 Test Street',
        city: 'Cairo',
        state: 'Cairo',
        postalCode: '11511',
        country: 'Egypt',
      },
      billingAddress: {
        fullName: 'Verify Customer',
        phone: '+201111111111',
        address: '1 Test Street',
        city: 'Cairo',
        state: 'Cairo',
        postalCode: '11511',
        country: 'Egypt',
      },
      transactionFee: 15,
      timeline: [{ status: 'paid', timestamp: new Date(), note: 'Seeded for verification' }],
    });
    console.log(`Created paid order ${order.orderNumber} (${order._id}), total ${order.total} EGP.`);
  } else {
    console.log(`Order ${orderNumber} already exists — skipping.`);
  }

  console.log('\n--- READY ---');
  console.log(`Login email:    ${TEST_EMAIL}`);
  console.log(`Login password: ${TEST_PASSWORD}`);
  console.log(`Store ID:       ${store._id}`);
  console.log(`Order:          #${order.orderNumber} (${order.total} EGP, paymentStatus=paid)`);
  process.exit(0);
}

if (process.argv.includes('--cleanup')) {
  cleanup().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
