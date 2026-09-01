// Pure function — computes a shop's due status from its own row + platform settings.
// No cron needed: this is evaluated live whenever a dealer or admin views the data,
// and notifications are lazily created (see lib/notify.js) the first time a status
// change is observed rather than on a schedule.

export function duesStatus(shop, settings, now = new Date()) {
  if (!shop.next_due_at) return "current"; // brand new shop, first cycle hasn't started
  const due = new Date(shop.next_due_at);
  if (now > due) return "overdue";
  const graceMs = (settings?.due_grace_days ?? 2) * 24 * 60 * 60 * 1000;
  if (now.getTime() > due.getTime() - graceMs) return "due_soon";
  return "current";
}

export function amountOwedNow(shop, settings) {
  return (settings?.weekly_due_cents ?? 0) + (shop.commission_owed_cents ?? 0);
}
