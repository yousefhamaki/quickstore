import PlatformConfig, { PLATFORM_CONFIG_SINGLETON_ID } from '../models/PlatformConfig';
import Wallet from '../models/Wallet';
import WalletLedger from '../models/WalletLedger';
import { WALLET_LEDGER_REASONS } from '../constants/walletLedgerReasons';
import { redisClient } from '../config/redis';
import { createNotification } from './notificationService';
import { sendSignupGiftEmail } from './emailService';

// ============================================================================
// Signup-gift platform config: cached getter + the actual gift-granting
// logic, both driven off the admin-editable PlatformConfig singleton instead
// of a hardcoded "500 EGP" constant. Self-contained block — see
// models/PlatformConfig.ts and services/admin/settings.service.ts (the admin
// read/write + audit-logged side of this).
// ============================================================================

const SIGNUP_GIFT_CACHE_KEY = 'platformConfig:signupGift';
const SIGNUP_GIFT_CACHE_TTL_SECONDS = 86400; // 24h, invalidated explicitly on admin write (mirrors plans:active)

export interface SignupGiftConfig {
    enabled: boolean;
    amount: number;
}

const SIGNUP_GIFT_DEFAULTS: SignupGiftConfig = { enabled: true, amount: 500 };

/**
 * Cached read of the signup-gift config. Falls back to Mongo on a cache miss
 * (or if Redis is degraded — redisClient.get already fails soft to null, see
 * config/redis.ts), and to SIGNUP_GIFT_DEFAULTS if no PlatformConfig document
 * exists yet at all (e.g. a fresh environment before any admin has touched
 * this screen).
 */
export async function getSignupGiftConfig(): Promise<SignupGiftConfig> {
    try {
        const cached = await redisClient.get(SIGNUP_GIFT_CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch {
        // fall through to DB read
    }

    const doc = await PlatformConfig.findById(PLATFORM_CONFIG_SINGLETON_ID);
    const config: SignupGiftConfig = doc?.signupGift
        ? { enabled: doc.signupGift.enabled, amount: doc.signupGift.amount }
        : SIGNUP_GIFT_DEFAULTS;

    try {
        await redisClient.setex(SIGNUP_GIFT_CACHE_KEY, SIGNUP_GIFT_CACHE_TTL_SECONDS, JSON.stringify(config));
    } catch {
        // best-effort cache warm; a read-through failure here is harmless
    }

    return config;
}

/** Invalidate the cached config — call this after any admin write. */
export async function invalidateSignupGiftCache(): Promise<void> {
    try {
        await redisClient.del(SIGNUP_GIFT_CACHE_KEY);
    } catch {
        // degraded Redis already fails closed-safe (del() itself never throws, see config/redis.ts)
    }
}

export interface SignupGiftGrantResult {
    granted: boolean;
    amount?: number;
}

/**
 * Ensures a Wallet document exists for this user, and — only if the signup
 * gift promo is currently enabled AND this user has never received it before
 * — credits it and writes the canonical WalletLedger entry.
 *
 * Idempotency is enforced at the DB level via WalletLedger's partial unique
 * index on {userId, reason: 'gift'} (see models/WalletLedger.ts), so this is
 * safe to call more than once for the same user (e.g. an unverified user
 * logging in repeatedly) — the amount-vs-lookup race just resolves to a
 * duplicate-key error, which is caught below and treated as "already
 * granted, no-op."
 *
 * Callers that want to also notify/email the user on a fresh grant should
 * use grantSignupGiftAndNotify below instead of calling this directly.
 */
export async function grantSignupGiftIfEligible(userId: string): Promise<SignupGiftGrantResult> {
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        // Disabled-promo (or otherwise ineligible) users still need a wallet
        // record for every downstream billing code path that assumes one
        // exists — just with a 0 balance and no ledger entry.
        wallet = await Wallet.create({ userId, balance: 0, currency: 'EGP' });
    }

    const config = await getSignupGiftConfig();
    if (!config.enabled || !(config.amount > 0)) {
        return { granted: false };
    }

    try {
        wallet.balance += config.amount;
        await wallet.save();

        await WalletLedger.create({
            userId,
            type: 'credit',
            amount: config.amount,
            reason: WALLET_LEDGER_REASONS.SIGNUP_GIFT,
            referenceId: wallet._id,
            balanceAfter: wallet.balance,
        });

        return { granted: true, amount: config.amount };
    } catch (error: any) {
        // Duplicate-key on the partial unique index == gift already granted
        // in a prior call. Roll the optimistic balance bump back and treat
        // this call as a no-op rather than a real failure.
        if (error?.code === 11000) {
            wallet.balance -= config.amount;
            try {
                await wallet.save();
            } catch {
                // best-effort rollback; the ledger is still the source of truth
            }
            return { granted: false };
        }
        throw error;
    }
}

/**
 * Same as grantSignupGiftIfEligible, but also fires the celebratory in-app
 * notification and welcome-gift email when (and only when) a gift was
 * actually granted just now — never on a disabled promo or a repeat call.
 */
/**
 * Marks a user as permanently ineligible for the signup gift, WITHOUT
 * touching authController.loginUser or teaching it anything about
 * StoreStaff. Used by staffController.acceptInvite when it creates a
 * brand-new User purely to accept a staff invite: that account didn't sign
 * up to launch its own store, so loginUser's unconditional
 * grantSignupGiftAndNotify call on this user's very next login must not
 * silently hand them the real gift.
 *
 * Reuses grantSignupGiftIfEligible's own idempotency mechanism instead of
 * adding a new field anywhere: it writes the SAME reason:'gift' WalletLedger
 * row that mechanism's partial unique index on {userId, reason:'gift'}
 * guards against duplicating — just with amount 0 and a note explaining why,
 * instead of a real credit (see WalletLedger.ts's amount min:0 comment).
 * Once this row exists, any later grantSignupGiftIfEligible call for this
 * user hits the duplicate-key path and no-ops, exactly like a normal
 * "already granted" repeat call.
 */
export async function markSignupGiftNotApplicable(userId: string): Promise<void> {
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        wallet = await Wallet.create({ userId, balance: 0, currency: 'EGP' });
    }

    await WalletLedger.create({
        userId,
        type: 'credit',
        amount: 0,
        reason: WALLET_LEDGER_REASONS.SIGNUP_GIFT,
        note: 'Not applicable — account created via staff invite, not an independent signup.',
        referenceId: wallet._id,
        balanceAfter: wallet.balance,
    });
}

export async function grantSignupGiftAndNotify(userId: string, email: string, name: string): Promise<SignupGiftGrantResult> {
    const result = await grantSignupGiftIfEligible(userId);

    if (result.granted && result.amount) {
        const dashboardLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/billing`;

        createNotification({
            userId,
            type: 'signup_gift',
            title: `You just received ${result.amount} EGP!`,
            message: `We've added ${result.amount} EGP to your Buildora wallet as a welcome gift. Use it toward your subscription plan, order fees, or extra email/WhatsApp sending credits.`,
            link: '/merchant/billing',
        }).catch(() => {});

        sendSignupGiftEmail(email, name, result.amount, dashboardLink).catch((err) => {
            console.error('[PlatformConfigService] Failed to send signup gift email:', err);
        });
    }

    return result;
}
