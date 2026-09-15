import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User';
import Wallet from '../models/Wallet';
import WalletLedger from '../models/WalletLedger';
import Notification from '../models/Notification';
import AdminAuditLog from '../models/AdminAuditLog';
import PlatformConfig, { PLATFORM_CONFIG_SINGLETON_ID } from '../models/PlatformConfig';
import { getSignupGiftConfig, grantSignupGiftIfEligible, grantSignupGiftAndNotify, invalidateSignupGiftCache } from '../services/platformConfigService';
import { getSignupGiftSettings, updateSignupGiftSettings } from '../services/admin/settings.service';

const TEST_EMAIL = `signup-gift-verify-${Date.now()}@example.com`;
let ok = 0;
let fail = 0;

function check(label: string, cond: boolean, detail?: any) {
    if (cond) {
        ok++;
        console.log(`  [PASS] ${label}`);
    } else {
        fail++;
        console.log(`  [FAIL] ${label}`, detail ?? '');
    }
}

async function run() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB\n');

    // Snapshot the PlatformConfig singleton so we can restore it exactly afterward.
    const preExistingConfig = await PlatformConfig.findById(PLATFORM_CONFIG_SINGLETON_ID);
    const originalConfigState = preExistingConfig ? preExistingConfig.toObject() : null;

    let testUserId: string | null = null;

    try {
        // ------------------------------------------------------------------
        // 1. Default config (no admin doc yet, or whatever is currently live)
        // ------------------------------------------------------------------
        console.log('--- 1. getSignupGiftConfig() ---');
        const cfg = await getSignupGiftConfig();
        console.log('  live config:', cfg);
        check('config has boolean enabled', typeof cfg.enabled === 'boolean');
        check('config has numeric amount', typeof cfg.amount === 'number');

        // ------------------------------------------------------------------
        // 2. Create a throwaway test user (simulating a freshly registered,
        //    not-yet-verified merchant)
        // ------------------------------------------------------------------
        console.log('\n--- 2. Create throwaway test user ---');
        const testUser = await User.create({
            name: 'Signup Gift Verify',
            email: TEST_EMAIL,
            role: 'merchant',
            authProvider: 'local',
            isVerified: false,
        });
        testUserId = testUser._id.toString();
        console.log(`  created user ${TEST_EMAIL} (${testUserId})`);

        // Force a known, enabled config for the deterministic part of this test.
        await updateSignupGiftSettings({ enabled: true, amount: 777 }, testUserId, 'verifySignupGift.ts test run');

        // ------------------------------------------------------------------
        // 3. grantSignupGiftIfEligible on an unverified-but-now-config-enabled
        //    user (simulates the verifyEmail() call path directly)
        // ------------------------------------------------------------------
        console.log('\n--- 3. grantSignupGiftIfEligible (first call) ---');
        const result1 = await grantSignupGiftIfEligible(testUserId);
        console.log('  result:', result1);
        check('first grant reports granted=true', result1.granted === true);
        check('first grant amount === 777', result1.amount === 777, result1.amount);

        const wallet = await Wallet.findOne({ userId: testUserId });
        check('wallet exists', !!wallet);
        check('wallet balance === 777', wallet?.balance === 777, wallet?.balance);

        const ledgerEntries = await WalletLedger.find({ userId: testUserId, reason: 'gift' });
        check('exactly one gift ledger entry', ledgerEntries.length === 1, ledgerEntries.length);
        check('ledger balanceAfter === 777', ledgerEntries[0]?.balanceAfter === 777);

        // ------------------------------------------------------------------
        // 4. Idempotency: call again — must NOT double-grant
        // ------------------------------------------------------------------
        console.log('\n--- 4. grantSignupGiftIfEligible (second call, must be no-op) ---');
        const result2 = await grantSignupGiftIfEligible(testUserId);
        console.log('  result:', result2);
        check('second grant reports granted=false', result2.granted === false);

        const walletAfterSecondCall = await Wallet.findOne({ userId: testUserId });
        check('balance unchanged at 777 after second call', walletAfterSecondCall?.balance === 777, walletAfterSecondCall?.balance);

        const ledgerEntriesAfter = await WalletLedger.find({ userId: testUserId, reason: 'gift' });
        check('still exactly one gift ledger entry', ledgerEntriesAfter.length === 1, ledgerEntriesAfter.length);

        // ------------------------------------------------------------------
        // 5. grantSignupGiftAndNotify on a fresh second user -> notification
        //    should be written, and the email call should at least be
        //    attempted (Resend will be hit for real; a fake @example.com
        //    address is expected to be accepted or soft-fail without
        //    throwing back into our code, since sendSignupGiftEmail logs and
        //    rethrows but grantSignupGiftAndNotify swallows that rejection).
        // ------------------------------------------------------------------
        console.log('\n--- 5. grantSignupGiftAndNotify (notification + email) ---');
        const testUser2 = await User.create({
            name: 'Signup Gift Verify 2',
            email: `signup-gift-verify-2-${Date.now()}@example.com`,
            role: 'merchant',
            authProvider: 'local',
            isVerified: true,
        });
        const testUser2Id = testUser2._id.toString();
        const result3 = await grantSignupGiftAndNotify(testUser2Id, testUser2.email, testUser2.name);
        console.log('  grant result:', result3);
        check('grant on user 2 succeeded', result3.granted === true && result3.amount === 777);

        // give the fire-and-forget email .catch() a tick, then check the notification (awaited internally, not fire-and-forget for the write itself... but createNotification IS async without await in our caller — actually we do NOT await it, so give it a moment)
        await new Promise((r) => setTimeout(r, 1500));
        const notif = await Notification.findOne({ userId: testUser2Id, type: 'signup_gift' });
        check('signup_gift notification was created', !!notif, notif);
        if (notif) {
            console.log('  notification title:', notif.title);
            console.log('  notification message:', notif.message);
            console.log('  notification link:', notif.link);
        }

        await User.deleteOne({ _id: testUser2Id });
        await Wallet.deleteOne({ userId: testUser2Id });
        await WalletLedger.deleteMany({ userId: testUser2Id });
        await Notification.deleteMany({ userId: testUser2Id });

        // ------------------------------------------------------------------
        // 6. Disabled promo: new user should get a wallet but NO gift
        // ------------------------------------------------------------------
        console.log('\n--- 6. Disabled promo path ---');
        await updateSignupGiftSettings({ enabled: false }, testUserId, 'verifySignupGift.ts test run (disable)');
        const testUser3 = await User.create({
            name: 'Signup Gift Verify 3 (disabled promo)',
            email: `signup-gift-verify-3-${Date.now()}@example.com`,
            role: 'merchant',
            authProvider: 'local',
            isVerified: true,
        });
        const testUser3Id = testUser3._id.toString();
        const result4 = await grantSignupGiftIfEligible(testUser3Id);
        console.log('  result:', result4);
        check('disabled promo -> granted=false', result4.granted === false);
        const wallet3 = await Wallet.findOne({ userId: testUser3Id });
        check('wallet still created with 0 balance when disabled', !!wallet3 && wallet3.balance === 0, wallet3?.balance);

        await User.deleteOne({ _id: testUser3Id });
        await Wallet.deleteOne({ userId: testUser3Id });
        await WalletLedger.deleteMany({ userId: testUser3Id });

        // Re-enable for the audit-log check below
        await updateSignupGiftSettings({ enabled: true, amount: 777 }, testUserId, 'verifySignupGift.ts test run (re-enable)');

        // ------------------------------------------------------------------
        // 7. Admin settings read + audit log
        // ------------------------------------------------------------------
        console.log('\n--- 7. Admin settings service + audit log ---');
        const settings = await getSignupGiftSettings();
        console.log('  admin-read settings:', settings);
        check('admin settings amount === 777', settings.amount === 777);
        check('admin settings enabled === true', settings.enabled === true);

        const auditEntries = await AdminAuditLog.find({ action: 'settings.signup_gift.update', targetId: new mongoose.Types.ObjectId(PLATFORM_CONFIG_SINGLETON_ID) }).sort({ createdAt: -1 }).limit(5);
        check('at least one audit log entry for settings.signup_gift.update', auditEntries.length > 0, auditEntries.length);
        console.log(`  found ${auditEntries.length} recent audit entries (showing latest reason): "${auditEntries[0]?.reason}"`);

        // ------------------------------------------------------------------
        // 8. Cache invalidation sanity check
        // ------------------------------------------------------------------
        console.log('\n--- 8. Cache invalidation ---');
        await invalidateSignupGiftCache();
        const cfgAfterInvalidate = await getSignupGiftConfig();
        check('config still readable after cache invalidation', cfgAfterInvalidate.amount === 777, cfgAfterInvalidate);

    } finally {
        // ------------------------------------------------------------------
        // Cleanup: remove every doc this script created, and restore the
        // PlatformConfig singleton to exactly what it was before this run.
        // ------------------------------------------------------------------
        console.log('\n--- Cleanup ---');
        if (testUserId) {
            await User.deleteOne({ _id: testUserId });
            await Wallet.deleteOne({ userId: testUserId });
            await WalletLedger.deleteMany({ userId: testUserId });
            await Notification.deleteMany({ userId: testUserId });
        }
        const strayUserIds = await User.find({ email: { $regex: /^signup-gift-verify/ } }).distinct('_id');
        if (strayUserIds.length > 0) {
            await Wallet.deleteMany({ userId: { $in: strayUserIds } });
            await WalletLedger.deleteMany({ userId: { $in: strayUserIds } });
            await Notification.deleteMany({ userId: { $in: strayUserIds } });
        }
        await User.deleteMany({ email: { $regex: /^signup-gift-verify/ } });

        if (originalConfigState) {
            await PlatformConfig.findByIdAndUpdate(PLATFORM_CONFIG_SINGLETON_ID, {
                signupGift: originalConfigState.signupGift,
                updatedBy: originalConfigState.updatedBy,
            });
            console.log('  restored PlatformConfig to its pre-test state:', originalConfigState.signupGift);
        } else {
            await PlatformConfig.findByIdAndDelete(PLATFORM_CONFIG_SINGLETON_ID);
            console.log('  removed the PlatformConfig doc this test created (none existed before)');
        }
        await invalidateSignupGiftCache();

        // Also scrub the audit log entries this run created so it doesn't
        // leave test noise in a real audit trail.
        const del = await AdminAuditLog.deleteMany({ reason: { $regex: /^verifySignupGift\.ts test run/ } });
        console.log(`  removed ${del.deletedCount} test audit log entries`);

        console.log(`\n=== RESULT: ${ok} passed, ${fail} failed ===`);
        await mongoose.disconnect();
        process.exit(fail > 0 ? 1 : 0);
    }
}

run().catch((err) => {
    console.error('Verification script crashed:', err);
    process.exit(1);
});
