// Flat commission (no tiers): 5% of whatever the dealer reports as the agreed sale amount.
// This accrues to shops.commission_owed_cents — it is NOT deducted automatically, because
// Student Mart never touches the payment (it happens directly between buyer and dealer).
// It's cleared when the dealer pays their weekly due.

export function computeCommission(agreedAmountCents, settings) {
  const rate = Number(settings?.commission_rate ?? 5);
  const commission_cents = Math.round((agreedAmountCents * rate) / 100);
  return { commission_rate_snapshot: rate, commission_cents };
}

export function money(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}
