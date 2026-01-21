import { Request, Response } from 'express';
import Wallet from '../models/Wallet';
import WalletTransaction from '../models/WalletTransaction';
import Subscription from '../models/Subscription';
import Receipt from '../models/Receipt';
import mongoose from 'mongoose';

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
        const { obj } = req.body;
        const { success, pending, amount_cents, extra_config, order } = obj;

        if (success && !pending) {
            const userId = extra_config?.userId;
            const type = extra_config?.type; // 'recharge' or 'subscription'
            const amount = amount_cents / 100;

            if (type === 'recharge') {
                // 1. Update Wallet
                await Wallet.findOneAndUpdate(
                    { userId },
                    { $inc: { balance: amount } },
                    { upsert: true, session: session || undefined }
                );

                // 2. Record Transaction
                const transaction = await WalletTransaction.create([{
                    userId,
                    type: 'credit',
                    amount,
                    reason: 'recharge',
                    referenceId: new mongoose.Types.ObjectId() // Map to Paymob order ID
                }], { session: session || undefined });

                // 3. Issue Receipt
                await Receipt.create([{
                    userId,
                    referenceId: transaction[0]._id,
                    type: 'wallet_recharge',
                    amount,
                    currency: 'EGP'
                }], { session: session || undefined });
            } else if (type === 'subscription') {
                // 1. Activate Subscription
                const sub = await Subscription.findOneAndUpdate(
                    { userId },
                    {
                        status: 'active',
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    },
                    { new: true, session: session || undefined }
                );

                // 2. Record Transaction (Debit-like credit info or just plan_payment)
                const transaction = await WalletTransaction.create([{
                    userId,
                    type: 'credit', // It's an inflow to the system but tied to sub
                    amount,
                    reason: 'plan_payment',
                    referenceId: sub?._id
                }], { session: session || undefined });

                // 3. Issue Receipt
                await Receipt.create([{
                    userId,
                    referenceId: sub?._id,
                    type: 'order', // Using 'order' type for plan payments in current schema or add 'subscription'
                    amount,
                    currency: 'EGP'
                }], { session: session || undefined });
            }

            if (session) await session.commitTransaction();
        }

        res.status(200).send('OK');
    } catch (error) {
        if (session) await session.abortTransaction();
        console.error('Webhook Error:', error);
        res.status(500).send('Error');
    } finally {
        if (session) session.endSession();
    }
};
