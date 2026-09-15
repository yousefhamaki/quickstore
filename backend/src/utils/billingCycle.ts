/**
 * Shared billing-cycle date math — used by both the manual subscribe/upgrade
 * flow (billingController.ts) and the automatic renewal sweep
 * (services/billing/SubscriptionRenewalService.ts) so the two can never
 * drift apart on what "one cycle" means.
 */
export type BillingCycle = 'monthly' | 'yearly' | undefined;

export const addBillingCycle = (date: Date, billingCycle: BillingCycle): Date => {
    const next = new Date(date);
    if (billingCycle === 'yearly') {
        next.setFullYear(next.getFullYear() + 1);
    } else {
        next.setMonth(next.getMonth() + 1);
    }
    return next;
};

/**
 * Like addBillingCycle, but guarantees the result is strictly after `now`
 * (defaults to the current time) — advancing by additional cycles if the
 * starting date is stale enough that one cycle isn't enough to catch up.
 *
 * Without this, a subscription that's been overdue for more than one full
 * cycle (e.g. the renewal sweep didn't run for a while) would still show as
 * "due" again immediately after being renewed once, letting the NEXT sweep
 * tick charge it again for the same catch-up — this is what actually
 * happened once in production/dev: two renewal-sweep runs a couple of
 * minutes apart both found the same subscription due and both charged it.
 * We only ever charge once per call site invocation; this just makes sure
 * the resulting expiresAt can't immediately look overdue again.
 */
export const addBillingCycleUntilFuture = (date: Date, billingCycle: BillingCycle, now: Date = new Date()): Date => {
    let next = addBillingCycle(date, billingCycle);
    // Safety cap: never loop more than ~100 cycles (handles pathological data
    // without an infinite loop; 100 years/months of being overdue isn't real).
    let guard = 0;
    while (next <= now && guard < 100) {
        next = addBillingCycle(next, billingCycle);
        guard++;
    }
    return next;
};
