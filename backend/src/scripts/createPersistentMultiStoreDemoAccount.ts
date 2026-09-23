// Creates (or reports, if already present) a PERSISTENT demo merchant
// account with two stores, for manually testing the mobile app's
// multi-store switcher. Unlike this repo's usual __test_*.ts scripts, this
// one is deliberately idempotent and does NOT clean up after itself — it's
// meant to be run once and left in the dev database on purpose.
import dotenv from 'dotenv';
dotenv.config({ path: 'C:/Users/Home/Documents/GitHub/QuickStore/backend/.env' });
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Store from '../models/Store';
import Subscription from '../models/Subscription';
import SubscriptionPlan from '../models/SubscriptionPlan';
import Wallet from '../models/Wallet';
import Product from '../models/Product';
import Customer from '../models/Customer';
import Order from '../models/Order';
import { createNotification } from '../services/notificationService';

const EMAIL = 'demo.multistore@buildora.test';
const PASSWORD = 'Demo12345!';

async function main() {
    await mongoose.connect(process.env.MONGODB_URI as string);

    let user = await User.findOne({ email: EMAIL });
    if (user) {
        const stores = await Store.find({ ownerId: user._id }).select('name domain.subdomain').lean();
        console.log('Demo account already exists — reusing it.');
        console.log(JSON.stringify({ email: EMAIL, password: PASSWORD, userId: user._id.toString(), stores }, null, 2));
        await mongoose.disconnect();
        return;
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    user = await User.create({
        name: 'Demo Merchant (2 Stores)',
        email: EMAIL,
        passwordHash,
        role: 'merchant',
        authProvider: 'local',
        isVerified: true,
    });

    const plan = await SubscriptionPlan.findOne({}).lean();
    const subscription = await Subscription.create({
        userId: user._id,
        planId: (plan as any)._id,
        status: 'active',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    await Wallet.create({ userId: user._id, balance: 2000, currency: 'EGP' });

    const storeDefs = [
        { name: 'Demo Store One — Fashion', subdomain: 'demo-store-one', productName: 'Classic Denim Jacket', price: 450, cost: 220, custFirst: 'Laila', custLast: 'Hassan' },
        { name: 'Demo Store Two — Electronics', subdomain: 'demo-store-two', productName: 'Wireless Earbuds Pro', price: 899, cost: 500, custFirst: 'Omar', custLast: 'Farouk' },
    ];

    const createdStores: any[] = [];

    for (const def of storeDefs) {
        const store = await Store.create({
            ownerId: user._id,
            name: def.name,
            slug: def.subdomain,
            status: 'live',
            domain: { subdomain: def.subdomain },
            subscriptionId: subscription._id,
        });

        const product = await Product.create({
            storeId: store._id,
            name: def.productName,
            slug: `${def.subdomain}-${def.productName.toLowerCase().replace(/\s+/g, '-')}`,
            price: def.price,
            costPerItem: def.cost,
            status: 'active',
            trackInventory: true,
            inventory: { quantity: 25, reserved: 0, lowStockThreshold: 5 },
        });

        const customer = await Customer.create({
            storeId: store._id,
            firstName: def.custFirst,
            lastName: def.custLast,
            email: `${def.custFirst.toLowerCase()}.${def.custLast.toLowerCase()}@example.test`,
            phone: '01012345678',
        });

        const order = await Order.create({
            storeId: store._id,
            customerId: customer._id,
            orderNumber: `DEMO-${def.subdomain}-${Date.now().toString().slice(-6)}`,
            items: [{ productId: product._id, name: product.name, quantity: 1, price: def.price, costAtPurchase: def.cost }],
            subtotal: def.price,
            shipping: 50,
            discount: 0,
            total: def.price + 50,
            status: 'pending',
            paymentStatus: 'pending',
            paymentMethod: 'Cash on Delivery',
            shippingAddress: { fullName: `${def.custFirst} ${def.custLast}`, phone: '01012345678', address: '1 Demo St', city: 'Cairo', state: 'Cairo', postalCode: '12345', country: 'Egypt' },
            billingAddress: { fullName: `${def.custFirst} ${def.custLast}`, phone: '01012345678', address: '1 Demo St', city: 'Cairo', state: 'Cairo', postalCode: '12345', country: 'Egypt' },
        });

        await createNotification({
            userId: user._id.toString(),
            storeId: store._id.toString(),
            type: 'order_created',
            title: 'New order received',
            message: `Order ${order.orderNumber} from ${def.custFirst} ${def.custLast}`,
            link: `/dashboard/stores/${store._id}/orders/${order._id}`,
        }).catch(() => {});

        createdStores.push({ name: store.name, subdomain: def.subdomain, storeId: store._id.toString() });
    }

    console.log('Created new persistent demo account.');
    console.log(JSON.stringify({ email: EMAIL, password: PASSWORD, userId: user._id.toString(), stores: createdStores }, null, 2));
    await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
