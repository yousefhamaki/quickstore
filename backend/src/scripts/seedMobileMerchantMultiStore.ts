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
import Notification from '../models/Notification';
import { PLAN_MAPPING, canAccessFeature } from '../config/planFeatures';

// One-off throwaway test account for manually verifying the mobile-merchant
// app's multi-store support: a single merchant that owns TWO stores, each
// with its own product/order, plus a notification tagged to each store.
// Run with:   npx tsx src/scripts/seedMobileMerchantMultiStore.ts
// Clean up:   npx tsx src/scripts/seedMobileMerchantMultiStore.ts --cleanup

const TEST_EMAIL = 'mobile.multistore.buildora@test.local';
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
  await Notification.deleteMany({ userId: user._id });
  await Order.deleteMany({ storeId: { $in: storeIds } });
  await Product.deleteMany({ storeId: { $in: storeIds } });
  await Customer.deleteMany({ storeId: { $in: storeIds } });
  await Store.deleteMany({ ownerId: user._id });
  await Subscription.deleteMany({ userId: user._id });
  await Wallet.deleteMany({ userId: user._id });
  await User.deleteOne({ _id: user._id });
  console.log('Cleaned up multi-store test merchant, stores, products, customers, orders, notifications, subscription, wallet.');
  process.exit(0);
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB');

  // 1. A plan with a store limit >= 2 (this platform sells "up to N stores" /
  // "unlimited stores" plans) so nothing about the account looks contrived —
  // just reuse whatever real plan already allows multiple stores, falling
  // back to a throwaway one if none exists.
  const candidatePlans = await SubscriptionPlan.find({});
  let plan = candidatePlans.find((p) => (p.maxStores ?? p.storeLimit ?? 1) >= 2 || (p.maxStores ?? p.storeLimit) === -1);
  if (!plan) {
    plan = await SubscriptionPlan.create({
      name: 'Business',
      name_en: 'Business',
      name_ar: 'أعمال',
      description_en: 'Test plan',
      description_ar: 'خطة اختبار',
      price: 1000,
      currency: 'EGP',
      features_en: ['Multiple stores', 'Coupons'],
      features_ar: ['متاجر متعددة', 'كوبونات'],
      maxStores: 5,
      productLimit: -1,
    });
    console.log(`Created fallback SubscriptionPlan "${plan.name}" (maxStores=5)`);
  } else {
    console.log(`Using existing plan "${plan.name}" (maxStores=${plan.maxStores ?? plan.storeLimit}, maps to ${PLAN_MAPPING[plan.name] || 'unmapped'})`);
  }

  // 2. Merchant user
  let user = await User.findOne({ email: TEST_EMAIL });
  if (!user) {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    user = await User.create({
      name: 'Multi Store Merchant',
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
    wallet = await Wallet.create({ userId: user._id, balance: 750, currency: 'EGP' });
    console.log('Created wallet with 750 EGP.');
  }

  // 4. Active subscription on the multi-store-capable plan
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
    console.log('Updated existing subscription to active + multi-store-capable plan.');
  }

  // 5. TWO stores owned by the same merchant.
  const storeDefs = [
    { slug: 'multi-verify-store-alpha', name: 'Alpha Boutique' },
    { slug: 'multi-verify-store-beta', name: 'Beta Electronics' },
  ];
  const stores = [];
  for (const def of storeDefs) {
    let store = await Store.findOne({ ownerId: user._id, slug: def.slug });
    if (!store) {
      store = await Store.create({
        ownerId: user._id,
        name: def.name,
        slug: def.slug,
        description: `Throwaway store ("${def.name}") for mobile-merchant multi-store verification.`,
        contact: { email: TEST_EMAIL, phone: '+201000000000' },
        domain: { type: 'subdomain', subdomain: def.slug, isVerified: true },
      });
      console.log(`Created store: ${store.name} (${store._id})`);
    } else {
      console.log(`Using existing store: ${store.name} (${store._id})`);
    }
    stores.push(store);
  }
  const [storeA, storeB] = stores;

  // 6. One product + one customer + one paid order per store, plus a
  // store-tagged notification — so switching the active store in the app
  // visibly changes Orders/Products/Analytics/Notifications.
  const perStoreData = [
    { store: storeA, productName: 'Alpha Signature Jacket', sku: 'ALPHA-JKT-1', price: 899, orderNumber: 'ALPHA-1001' },
    { store: storeB, productName: 'Beta Wireless Earbuds', sku: 'BETA-EAR-1', price: 1299, orderNumber: 'BETA-2001' },
  ];

  for (const data of perStoreData) {
    const { store, productName, sku, price, orderNumber } = data;

    let product = await Product.findOne({ storeId: store._id, sku });
    if (!product) {
      product = await Product.create({
        storeId: store._id,
        name: productName,
        slug: productName.toLowerCase().replace(/\s+/g, '-'),
        description: `Seed product for ${store.name}.`,
        price,
        costPerItem: Math.round(price * 0.5),
        sku,
        inventory: { quantity: 25, lowStockThreshold: 5 },
        status: 'active',
        images: [],
      });
      console.log(`Created product "${product.name}" (${product._id}) for ${store.name}.`);
    } else {
      console.log(`Product "${product.name}" already exists for ${store.name} — skipping.`);
    }

    let customer = await Customer.findOne({ storeId: store._id, email: `verify.customer.${store.slug}@test.local` });
    if (!customer) {
      customer = await Customer.create({
        storeId: store._id,
        email: `verify.customer.${store.slug}@test.local`,
        firstName: 'Verify',
        lastName: store.name.split(' ')[0],
        phone: '+201111111111',
      });
      console.log(`Created customer for ${store.name}.`);
    }

    let order = await Order.findOne({ storeId: store._id, orderNumber });
    if (!order) {
      const subtotal = product.price;
      const shipping = 50;
      order = await Order.create({
        storeId: store._id,
        customerId: customer._id,
        orderNumber,
        items: [
          {
            productId: product._id,
            name: product.name,
            quantity: 1,
            price: product.price,
            costAtPurchase: product.costPerItem,
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
        timeline: [{ status: 'paid', timestamp: new Date(), note: 'Seeded for multi-store verification' }],
      });
      console.log(`Created paid order ${order.orderNumber} (${order.total} EGP) for ${store.name}.`);
    } else {
      console.log(`Order ${orderNumber} already exists for ${store.name} — skipping.`);
    }

    const existingNotif = await Notification.findOne({ userId: user._id, storeId: store._id, type: 'order_created' });
    if (!existingNotif) {
      await Notification.create({
        userId: user._id,
        storeId: store._id,
        type: 'order_created',
        title: 'New order received',
        message: `Order #${order.orderNumber} was placed on ${store.name}.`,
        link: `/dashboard/stores/${store._id}/orders/${order._id}`,
      });
      console.log(`Created a store-tagged notification for ${store.name}.`);
    }
  }

  console.log('\n--- READY ---');
  console.log(`Login email:    ${TEST_EMAIL}`);
  console.log(`Login password: ${TEST_PASSWORD}`);
  console.log(`Store A:        ${storeA.name} (${storeA._id})`);
  console.log(`Store B:        ${storeB.name} (${storeB._id})`);
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
