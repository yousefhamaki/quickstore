import { Request, Response } from 'express';
import Wallet from '../models/Wallet';
import WalletTransaction from '../models/WalletTransaction';
import Subscription from '../models/Subscription';
import Receipt from '../models/Receipt';
import mongoose from 'mongoose';
import Store from '../models/Store';
import Order from '../models/Order';
import { ShippingFactory } from '../services/shipping/ShippingFactory';
import { PaymentFactory } from '../services/payment/PaymentFactory';
import Transaction from '../models/Transaction';
import crypto from 'crypto';

/**
 * @desc    Paymob Webhook Handler
 * @route   POST /api/billing/webhook/paymob
 */
export const handlePaymobWebhook = async (req: Request, res: Response) => {
    let session: mongoose.ClientSession | null = null;

    // Standalone MongoDB (common in local dev) does not support transactions.
    const isLocalStandalone = process.env.MONGODB_URI?.includes('localhost') && !process.env.MONGODB_URI?.includes('replicaSet');

    if (!isLocalStandalone) {
        try {
            session = await mongoose.startSession();
            session.startTransaction();
        } catch (e) {
            session = null;
        }
    }

    try {
        const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
        const requestedHmac = req.query.hmac as string;

        // HMAC validation (Crucial for security)
        if (hmacSecret && requestedHmac) {
            const { obj } = req.body;
            if (obj) {
                const hmacString = [
                    obj.amount_cents,
                    obj.created_at,
                    obj.currency,
                    obj.error_occured,
                    obj.has_parent_transaction,
                    obj.id,
                    obj.integration_id,
                    obj.is_3d_secure,
                    obj.is_auth,
                    obj.is_capture,
                    obj.is_refunded,
                    obj.is_standalone_payment,
                    obj.is_voided,
                    obj.order?.id,
                    obj.owner,
                    obj.pending,
                    obj.source_data?.pan,
                    obj.source_data?.sub_type,
                    obj.source_data?.type,
                    obj.success
                ].join('');

                const hash = crypto.createHmac('sha512', hmacSecret).update(hmacString).digest('hex');
                if (hash !== requestedHmac) {
                    console.error('Invalid HMAC signature for Paymob Webhook');
                    if (session) await session.abortTransaction();
                    return res.status(401).send('Invalid signature');
                }
            }
        }

        const { obj, type: reqType } = req.body;
        // Event should be TRANSACTION_PROCESSED
        if (reqType === 'TRANSACTION_PROCESSED' || (obj && obj.order && obj.order.id)) {
            const { success, pending, amount_cents, order } = obj;
            const amount = amount_cents / 100;

            const orderIdStr = order?.id?.toString();
            
            if (orderIdStr) {
                // Find Pending Transaction
                const transaction = await Transaction.findOne({ orderId: orderIdStr });
                
                if (transaction && transaction.status === 'pending') {
                    if (success && !pending) {
                        transaction.status = 'success';
                        await transaction.save({ session: session || undefined });

                        // Update Wallet
                        const userId = transaction.userId;
                        await Wallet.findOneAndUpdate(
                            { userId },
                            { $inc: { balance: amount } },
                            { upsert: true, session: session || undefined }
                        );

                        // Record WalletTransaction
                        const wTx = await WalletTransaction.create([{
                            userId,
                            type: 'credit',
                            amount,
                            reason: 'recharge',
                            referenceId: transaction._id
                        }], { session: session || undefined });

                        // Issue Receipt
                        await Receipt.create([{
                            userId,
                            referenceId: wTx[0]._id,
                            type: 'wallet_recharge',
                            amount,
                            currency: 'EGP'
                        }], { session: session || undefined });

                    } else if (!success && !pending) {
                        transaction.status = 'failed';
                        await transaction.save({ session: session || undefined });
                    }
                }
            }
        }

        if (session) await session.commitTransaction();
        res.status(200).send('OK');
    } catch (error) {
        if (session) await session.abortTransaction();
        console.error('Webhook Error:', error);
        res.status(500).send('Error');
    } finally {
        if (session) session.endSession();
    }
};

/**
 * @desc    Universal Shipping Provider Webhooks
 * @route   POST /api/webhooks/shipping/:provider/:storeId
 */
export const handleShippingWebhook = async (req: Request, res: Response) => {
    try {
        const { provider, storeId } = req.params;
        const signature = (req.headers['x-bosta-signature'] || req.headers['authorization']) as string;
        
        const store = await Store.findById(storeId);
        if (!store) return res.status(404).send('Store missing');

        const shippingProvider = ShippingFactory.getProvider(store);
        
        // Strict payload inspection
        if (!signature || !shippingProvider.validateWebhookPayload(req.body, signature)) {
            console.error(`Invalid Webhook Signature rejected for Store: ${storeId}`);
            return res.status(401).send('Invalid signature');
        }

        const trackingNumber = req.body.trackingNumber || req.body.delivery?.trackingNumber;
        const state = req.body.state || req.body.delivery?.state;
        
        let normalizedStatus: any = 'in_transit';
        if (state === 'Delivered') normalizedStatus = 'delivered';
        if (state === 'Returned' || state === 'Exception') normalizedStatus = 'returned';
        if (state === 'Picked up') normalizedStatus = 'picked_up';

        const order = await Order.findOneAndUpdate(
            { trackingNumber, storeId },
            { 
               shippingStatus: normalizedStatus, 
               $push: { timeline: { status: `Shipping update: ${state}`, timestamp: new Date() } } 
            },
            { new: true }
        );

        if (order && normalizedStatus === 'delivered') {
            order.status = 'delivered';
            await order.save();
        }

        res.status(200).send('OK');
    } catch (error: any) {
        console.error('Shipping Webhook Parsing Fault:', error);
        res.status(500).send('Webhook parsing faulted');
    }
};

/**
 * @desc    Universal Payment Provider Webhooks
 * @route   POST /api/webhooks/payments/:provider/:storeId
 */
export const handlePaymentWebhook = async (req: Request, res: Response) => {
    try {
        const { provider, storeId } = req.params;
        // Provider specific HMAC injection paths (Paymob typically utilizes req.query.hmac)
        const signature = (req.query.hmac || req.headers['x-paymob-signature'] || req.headers['authorization']) as string;
        
        const store = await Store.findById(storeId);
        if (!store) return res.status(404).send('Store missing');

        const paymentProvider = PaymentFactory.getProvider(store);
        
        // Strict abstraction verification via the Strategy AES layer
        if (!signature || !paymentProvider.validateWebhookPayload(req.body, signature)) {
            console.error(`Invalid Payment Signature rejected for Store: ${storeId}`);
            return res.status(401).send('Invalid signature');
        }

        // Dynamically deduce Transaction bounds based on Standard Provider formats
        const transactionId = req.body.obj?.order?.id?.toString() || req.body.id?.toString();
        const success = req.body.obj?.success === true || req.body.success === true;
        
        const paymentStatus = success ? 'paid' : 'failed';

        await Order.findOneAndUpdate(
            { transactionId, storeId },
            { 
               paymentStatus, 
               $push: { timeline: { status: `Payment gateway update: ${paymentStatus}`, timestamp: new Date() } } 
            }
        );

        res.status(200).send('OK');
    } catch (error: any) {
        console.error('Payment Webhook Parsing Fault:', error);
        res.status(500).send('Webhook parsing faulted');
    }
};
