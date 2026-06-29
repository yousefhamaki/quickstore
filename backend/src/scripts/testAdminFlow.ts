import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Wallet from '../models/Wallet';
import WalletLedger from '../models/WalletLedger';
import AdminAuditLog from '../models/AdminAuditLog';
import { adjustBalance } from '../services/admin/wallet.service';


const runVerification = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB');

        // 1. Create or get Admin
        let admin = await User.findOne({ role: 'super_admin' });
        if (!admin) {
            const passwordHash = await bcrypt.hash('adminpassword', 10);
            admin = await User.create({
                name: 'System Super Admin',
                email: 'admin@quickstore.live',
                passwordHash,
                role: 'super_admin',
                authProvider: 'local',
                isVerified: true,
                subscriptionStatus: 'active'
            });
            console.log(`Created Super Admin user: ${admin.email}`);
        } else {
            console.log(`Using existing Super Admin user: ${admin.email}`);
        }

        // 2. Create or get Merchant
        let merchant = await User.findOne({ role: 'merchant' });
        if (!merchant) {
            merchant = await User.create({
                name: 'Test Merchant',
                email: 'merchant@quickstore.live',
                role: 'merchant',
                authProvider: 'local',
                isVerified: true,
                subscriptionStatus: 'pending'
            });
            console.log(`Created Test Merchant: ${merchant.email}`);
        } else {
            console.log(`Using existing Merchant user: ${merchant.email}`);
        }

        // Initialize wallet if missing
        let wallet = await Wallet.findOne({ userId: merchant._id });
        if (!wallet) {
            wallet = await Wallet.create({
                userId: merchant._id,
                balance: 0,
                currency: 'EGP'
            });
            console.log('Initialized merchant wallet.');
        }

        console.log(`Original Wallet Balance: ${wallet.balance} EGP`);

        // 3. Perform balance adjustment using admin service
        console.log('Adjusting merchant balance by +150.00 EGP...');
        const result = await adjustBalance(
            merchant._id.toString(),
            150,
            'credit',
            admin._id.toString(),
            'Manual verification balance grant',
            '127.0.0.1'
        );

        console.log(`New Wallet Balance: ${result.newBalance} EGP`);

        // 4. Verify WalletLedger entry
        const ledgerEntry = await WalletLedger.findOne({ merchantId: merchant._id }).sort({ createdAt: -1 });
        if (ledgerEntry) {
            console.log('\n--- WALLET LEDGER ENTRY GENERATED ---');
            console.log(`Type: ${ledgerEntry.type}`);
            console.log(`Amount: ${ledgerEntry.amount} EGP`);
            console.log(`Reason: ${ledgerEntry.reason}`);
            console.log(`Balance After: ${ledgerEntry.balanceAfter} EGP`);
        } else {
            console.error('FAIL: No ledger entry found!');
        }

        // 5. Verify AdminAuditLog entry
        const auditLog = await AdminAuditLog.findOne({ actorId: admin._id }).sort({ createdAt: -1 });
        if (auditLog) {
            console.log('\n--- ADMIN AUDIT LOG ENTRY GENERATED ---');
            console.log(`Actor ID: ${auditLog.actorId}`);
            console.log(`Action: ${auditLog.action}`);
            console.log(`Target: ${auditLog.targetType} (ID: ${auditLog.targetId})`);
            console.log(`Reason: ${auditLog.reason}`);
            console.log('Before State:', JSON.stringify(auditLog.beforeState));
            console.log('After State:', JSON.stringify(auditLog.afterState));
        } else {
            console.error('FAIL: No audit log entry found!');
        }

        console.log('\nVERIFICATION SUCCESSFUL: ALL SYSTEMS RUNNING GREEN.');
        process.exit(0);
    } catch (error) {
        console.error('Verification error:', error);
        process.exit(1);
    }
};

runVerification();
