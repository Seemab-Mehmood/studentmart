// Pure, deterministic pricing/commission logic.
// Every number shown in the UI is derived from these functions + real DB rows —
// nothing here is a display placeholder.

/**
 * Given how many completed sales a shop already had BEFORE this order,
 * return the commission rate (%) that applies to THIS order.
 * Sales 1..threshold -> earlyRate (default 5%). Sales after threshold -> lateRate (default 10%).
 */
export function commissionRateForSale(priorCompletedSales, settings) {
  const threshold = settings?.commission_sale_threshold ?? 50;
  const early = Number(settings?.commission_rate_early ?? 5);
  const late = Number(settings?.commission_rate_late ?? 10);
  const thisSaleNumber = priorCompletedSales + 1;
  return thisSaleNumber <= threshold ? early : late;
}

export function centsToDisplay(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function computeOrderTotals(items, priorCompletedSales, settings) {
  const subtotal_cents = items.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0);
  const rate = commissionRateForSale(priorCompletedSales, settings);
  const commission_cents = Math.round((subtotal_cents * rate) / 100);
  const net_payout_cents = subtotal_cents - commission_cents;
  return { subtotal_cents, commission_rate_snapshot: rate, commission_cents, net_payout_cents };
}

export function itemLimitForTier(tier, settings) {
  if (tier === "monthly") return settings?.monthly_tier_item_limit ?? 15;
  return settings?.free_tier_item_limit ?? 3;
}
