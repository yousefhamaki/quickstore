export interface ProrationInput {
  currentPlanPrice: number;
  newPlanPrice: number;
  startedAt: Date;
  expiresAt: Date;
}

export interface ProrationResult {
  currentPlanPrice: number;
  newPlanPrice: number;
  usedDays: number;
  remainingDays: number;
  currentPlanUsage: number;
  unusedCredit: number;
  remainingNewPlanCost: number;
  amountToPay: number;
  currentExpiryDate: Date;
  nextRenewalPrice: number;
}

export class ProrationService {
  /**
   * Computes the upgrade proration breakdown using integer cents/piastres.
   */
  public static calculatePlanChange(input: ProrationInput): ProrationResult {
    const { currentPlanPrice, newPlanPrice, startedAt, expiresAt } = input;
    const now = new Date();

    // Minor currency conversion (EGP to Cents)
    const currentPlanPriceCents = Math.round(currentPlanPrice * 100);
    const newPlanPriceCents = Math.round(newPlanPrice * 100);

    const totalMs = expiresAt.getTime() - startedAt.getTime();
    // Default to 30 days if cycle duration is malformed
    const totalDays = totalMs > 0 ? Math.max(1, Math.ceil(totalMs / (1000 * 60 * 60 * 24))) : 30;

    // Days elapsed, capped between 0 and totalDays
    const usedMs = Math.max(0, Math.min(totalMs, now.getTime() - startedAt.getTime()));
    const usedDays = Math.floor(usedMs / (1000 * 60 * 60 * 24));
    
    // Remaining days in the current cycle
    const remainingDays = Math.max(0, totalDays - usedDays);

    // 1. Current Daily Cost in Cents
    const currentDailyCostCents = Math.round(currentPlanPriceCents / totalDays);

    // 2. New Daily Cost in Cents
    const newDailyCostCents = Math.round(newPlanPriceCents / totalDays);

    // 3. Current Usage = currentDailyCost * usedDays
    const currentPlanUsageCents = currentDailyCostCents * usedDays;

    // 4. Unused Credit = currentPlanPrice - currentUsage
    const unusedCreditCents = Math.max(0, currentPlanPriceCents - currentPlanUsageCents);

    // 5. Remaining New Plan Cost = newDailyCost * remainingDays
    const remainingNewPlanCostCents = newDailyCostCents * remainingDays;

    // 6. Upgrade Payment = remainingNewPlanCost - unusedCredit
    const amountToPayCents = Math.max(0, remainingNewPlanCostCents - unusedCreditCents);

    return {
      currentPlanPrice,
      newPlanPrice,
      usedDays,
      remainingDays,
      currentPlanUsage: currentPlanUsageCents / 100,
      unusedCredit: unusedCreditCents / 100,
      remainingNewPlanCost: remainingNewPlanCostCents / 100,
      amountToPay: amountToPayCents / 100,
      currentExpiryDate: expiresAt,
      nextRenewalPrice: newPlanPrice
    };
  }
}
