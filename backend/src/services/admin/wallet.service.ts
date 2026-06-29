import mongoose from 'mongoose';
import Wallet from '../../models/Wallet';
import WalletLedger from '../../models/WalletLedger';
import User from '../../models/User';
import { logAdminAction } from './audit.service';
import { publishAdminEvent } from '../../queues/adminQueue';

export const adjustBalance = async (
    merchantId: string,
    amount: number,
    type: 'credit' | 'debit',
    actorId: string,
    reason: string,
    ipAddress?: string
) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const merchant = await User.findById(merchantId).session(session);
        if (!merchant) {
            throw new Error('Merchant user not found');
        }

        let wallet = await Wallet.findOne({ userId: merchantId }).session(session);
        if (!wallet) {
            wallet = new Wallet({ userId: merchantId, balance: 0 });
        }

        const originalBalance = wallet.balance;
        let newBalance = originalBalance;

        if (type === 'credit') {
            newBalance += amount;
        } else {
            if (originalBalance < amount) {
                throw new Error('Insufficient wallet balance for debit');
            }
            newBalance -= amount;
        }

        wallet.balance = newBalance;
        await wallet.save({ session });

        const ledgerEntry = await WalletLedger.create([{
            merchantId: new mongoose.Types.ObjectId(merchantId),
            type,
            amount,
            reason,
            balanceAfter: newBalance
        }], { session });

        await logAdminAction(
            actorId,
            'wallet.adjust',
            'User',
            merchantId,
            { balance: originalBalance },
            { balance: newBalance },
            reason,
            ipAddress
        );

        await session.commitTransaction();
        session.endSession();

        await publishAdminEvent('wallet.updated', {
            email: merchant.email,
            name: merchant.name,
            type,
            amount,
            reason,
            balanceAfter: newBalance
        });

        return {
            originalBalance,
            newBalance,
            ledger: ledgerEntry[0]
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const getMerchantLedger = async (merchantId: string) => {
    return WalletLedger.find({ merchantId }).sort({ createdAt: -1 });
};
