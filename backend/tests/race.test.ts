import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server';
import { OfferCampaign } from '../src/models/OfferCampaign';
import { Order } from '../src/models/Order';
import { Store } from '../src/models/Store';
import { Product } from '../src/models/Product';
import { OfferImpression } from '../src/models/OfferImpression';

describe('Offer Concurrency & Race Conditions', () => {
    let store: any;
    let product: any;
    let order: any;
    let campaign: any;
    let impression: any;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickstore_test');
        }

        store = await Store.create({
            name: 'Race Condition Store',
            ownerId: new mongoose.Types.ObjectId(),
            domain: { subdomain: 'race-store', customDomain: null },
            currency: 'USD',
            status: 'active'
        });
    });

    afterAll(async () => {
        await Store.deleteMany({});
        await Product.deleteMany({});
        await OfferCampaign.deleteMany({});
        await Order.deleteMany({});
        await OfferImpression.deleteMany({});
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Product.deleteMany({});
        await OfferCampaign.deleteMany({});
        await Order.deleteMany({});
        await OfferImpression.deleteMany({});

        // Product has exactly 1 in stock!
        product = await Product.create({
            storeId: store._id,
            name: 'Limited Edition Product',
            price: 500,
            status: 'active',
            inventory: { quantity: 1, trackInventory: true }
        });

        order = await Order.create({
            storeId: store._id,
            orderNumber: 'ORD-RACE-1',
            customer: { firstName: 'Race', lastName: 'User', email: 'race@example.com' },
            items: [{
                productId: new mongoose.Types.ObjectId(), // Original item
                name: 'Base Item',
                price: 50,
                quantity: 1
            }],
            totalAmount: 50,
            paymentMethod: 'COD',
            status: 'pending'
        });

        campaign = await OfferCampaign.create({
            storeId: store._id,
            type: 'cross_sell',
            name: 'Scarcity Cross-sell',
            status: 'active',
            trigger: { event: 'checkout_start', conditions: [] },
            offerProducts: [{ productId: product._id, discountType: 'none', discountValue: 0, quantity: 1, displayOrder: 1 }],
            display: { title: 'Limited', callToActionText: 'Yes', declineText: 'No' },
            priority: 10
        });

        impression = await OfferImpression.create({
            storeId: store._id,
            campaignId: campaign._id,
            sessionId: 'sess-race',
            offerType: 'cross_sell',
            shownAt: new Date(),
            decision: 'pending',
            snapshot: {
                offerProductIds: [product._id],
                discountAmountAdvertised: 0,
                cartValueAtTime: 50,
                computedOfferPrices: { [product._id.toString()]: 500 }
            }
        });
    });

    it('should prevent inventory oversell and duplicate order additions when rapid-firing acceptOffer requests', async () => {
        const payload = {
            impressionId: impression._id,
            orderId: order._id,
            sessionId: 'sess-race'
        };

        // Simulate a user double/triple-clicking the accept button simultaneously
        const responses = await Promise.all([
            request(app).post('/api/public/offers/accept').send(payload),
            request(app).post('/api/public/offers/accept').send(payload),
            request(app).post('/api/public/offers/accept').send(payload)
        ]);

        // Count how many succeeded
        const successes = responses.filter(r => r.status === 200 && r.body.success === true);
        const failures = responses.filter(r => r.status !== 200);

        expect(successes.length).toBe(1); // Only 1 request should win the race
        expect(failures.length).toBe(2);  // The other 2 should be rejected

        // Assert Product Inventory did NOT drop below 0
        const updatedProduct = await Product.findById(product._id);
        expect(updatedProduct?.inventory.quantity).toBe(0);

        // Assert Order only appended the item ONCE
        const updatedOrder = await Order.findById(order._id);
        expect(updatedOrder?.items).toHaveLength(2); // Base item (1) + Cross sell (1) = 2
        expect(updatedOrder?.totalAmount).toBe(550); // 50 + 500 = 550

        // Assert Impression marks accepted
        const updatedImpression = await OfferImpression.findById(impression._id);
        expect(updatedImpression?.decision).toBe('accepted');
    });
});
