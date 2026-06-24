import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server';
import { OfferCampaign } from '../src/models/OfferCampaign';
import { Order } from '../src/models/Order';
import { Store } from '../src/models/Store';
import { Product } from '../src/models/Product';
import { OfferImpression } from '../src/models/OfferImpression';

describe('Offer Engine Integration Tests', () => {
    let storeA: any;
    let storeB: any;
    let productA: any;
    let orderA: any;

    beforeAll(async () => {
        // Connect to test database (assuming MONGODB_URI is set for test env)
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickstore_test');
        }

        // Setup base data
        storeA = await Store.create({
            name: 'Store A',
            ownerId: new mongoose.Types.ObjectId(),
            domain: { subdomain: 'store-a', customDomain: null },
            currency: 'USD',
            status: 'active'
        });

        storeB = await Store.create({
            name: 'Store B',
            ownerId: new mongoose.Types.ObjectId(),
            domain: { subdomain: 'store-b', customDomain: null },
            currency: 'USD',
            status: 'active'
        });

        productA = await Product.create({
            storeId: storeA._id,
            name: 'Test Product A',
            price: 100,
            status: 'active',
            inventory: { quantity: 10, trackInventory: true }
        });

        orderA = await Order.create({
            storeId: storeA._id,
            orderNumber: 'ORD-TEST-1',
            customer: { firstName: 'Test', lastName: 'User', email: 'test@example.com' },
            items: [{
                productId: productA._id,
                name: productA.name,
                price: productA.price,
                quantity: 1
            }],
            totalAmount: 100,
            paymentMethod: 'COD',
            status: 'pending'
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
        await OfferCampaign.deleteMany({});
        await OfferImpression.deleteMany({});
    });

    it('should enforce Tenant Isolation: evaluate requests cannot leak across stores', async () => {
        // Campaign belongs to Store A
        await OfferCampaign.create({
            storeId: storeA._id,
            type: 'upsell',
            name: 'Store A Upsell',
            status: 'active',
            trigger: { event: 'cart_view', conditions: [] },
            offerProducts: [{ productId: productA._id, discountType: 'percentage', discountValue: 10, quantity: 1, displayOrder: 1 }],
            display: { title: 'Test', callToActionText: 'Yes', declineText: 'No' },
            priority: 10
        });

        // Requesting for Store B should yield no offers
        const res = await request(app)
            .post('/api/public/offers/evaluate')
            .send({
                storeId: storeB._id, // Requesting via Store B
                event: 'cart_view',
                sessionId: 'sess-123',
                cartItems: [{ productId: productA._id, quantity: 1, price: 100 }],
                cartSubtotal: 100
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.offers).toHaveLength(0); // Tenant isolation successful
    });

    it('should resolve Campaign Priority Conflicts by returning lowest priority number first', async () => {
        await OfferCampaign.create({
            storeId: storeA._id,
            type: 'cross_sell',
            name: 'Low Priority Cross-sell',
            status: 'active',
            trigger: { event: 'checkout_start', conditions: [] },
            offerProducts: [{ productId: productA._id, discountType: 'none', discountValue: 0, quantity: 1, displayOrder: 1 }],
            display: { title: 'Low', callToActionText: 'Yes', declineText: 'No' },
            priority: 50 // Higher number = lower priority
        });

        await OfferCampaign.create({
            storeId: storeA._id,
            type: 'upsell',
            name: 'High Priority Upsell',
            status: 'active',
            trigger: { event: 'checkout_start', conditions: [] },
            offerProducts: [{ productId: productA._id, discountType: 'percentage', discountValue: 20, quantity: 1, displayOrder: 1 }],
            display: { title: 'High', callToActionText: 'Yes', declineText: 'No' },
            priority: 5 // Lower number = higher priority
        });

        const res = await request(app)
            .post('/api/public/offers/evaluate')
            .send({
                storeId: storeA._id,
                event: 'checkout_start',
                sessionId: 'sess-priority',
                cartItems: [{ productId: new mongoose.Types.ObjectId(), quantity: 1, price: 50 }],
                cartSubtotal: 50
            });

        expect(res.status).toBe(200);
        expect(res.body.offers).toHaveLength(2);
        // Assert order based on priority
        expect(res.body.offers[0].priority).toBe(5);
        expect(res.body.offers[0].name).toBe('High Priority Upsell');
        expect(res.body.offers[1].priority).toBe(50);
        expect(res.body.offers[1].name).toBe('Low Priority Cross-sell');
    });

    it('processOrderFee Delta Path: acceptOffer correctly updates order totals and applies delta', async () => {
        const campaign = await OfferCampaign.create({
            storeId: storeA._id,
            type: 'cross_sell',
            name: 'Cross Sell',
            status: 'active',
            trigger: { event: 'checkout_start', conditions: [] },
            offerProducts: [{ productId: productA._id, discountType: 'fixed', discountValue: 20, quantity: 1, displayOrder: 1 }], // Price: 100 - 20 = 80
            display: { title: 'Cross', callToActionText: 'Yes', declineText: 'No' },
            priority: 10
        });

        const impression = await OfferImpression.create({
            storeId: storeA._id,
            campaignId: campaign._id,
            sessionId: 'sess-delta',
            offerType: 'cross_sell',
            shownAt: new Date(),
            decision: 'pending',
            snapshot: {
                offerProductIds: [productA._id],
                discountAmountAdvertised: 20,
                cartValueAtTime: 100,
                computedOfferPrices: { [productA._id.toString()]: 80 }
            }
        });

        const res = await request(app)
            .post('/api/public/offers/accept')
            .send({
                impressionId: impression._id,
                orderId: orderA._id,
                sessionId: 'sess-delta'
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.newTotal).toBe(180); // Original 100 + CrossSell 80 = 180

        const updatedOrder = await Order.findById(orderA._id);
        expect(updatedOrder).toBeDefined();
        expect(updatedOrder?.totalAmount).toBe(180);
        expect(updatedOrder?.items.length).toBe(2);
        
        // Assert the attribution denormalization
        expect(updatedOrder?.offerAttribution).toHaveLength(1);
        expect(updatedOrder?.offerAttribution[0].revenueAdded).toBe(80);
        expect(updatedOrder?.offerAttribution[0].savedAmount).toBe(20);

        // Verify impression was marked accepted
        const updatedImpression = await OfferImpression.findById(impression._id);
        expect(updatedImpression?.decision).toBe('accepted');
    });
});
