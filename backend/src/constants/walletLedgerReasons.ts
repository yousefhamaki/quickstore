/**
 * Canonical `WalletLedger.reason` values. This is NOT a Mongoose enum on
 * purpose (see models/WalletLedger.ts) — it's a shared reference so every
 * write site (and the admin/merchant UI reason filters/labels) agree on the
 * same category strings instead of drifting.
 *
 * If you need to add a new kind of wallet movement, add it here first.
 */
export const WALLET_LEDGER_REASONS = {
    SIGNUP_GIFT: 'gift',
    PLAN_PAYMENT: 'plan_payment',
    PLAN_UPGRADE: 'plan_upgrade',
    PLAN_RENEWAL: 'plan_renewal',
    RECHARGE: 'recharge',
    ORDER_FEE: 'order_fee',
    ORDER_REFUND: 'order_refund',
    ADDON_PURCHASE: 'addon_purchase',
    ADMIN_ADJUSTMENT: 'admin_adjustment',
} as const;

export type WalletLedgerReason = typeof WALLET_LEDGER_REASONS[keyof typeof WALLET_LEDGER_REASONS];
