import { duesStatus } from "./dues";

// Lazily creates an in-app notification the first time a shop crosses into
// "due soon" or "overdue" — avoids needing a cron job. Called opportunistically
// whenever a dealer or admin loads data that includes shop dues.
export async function ensureDueNotification(db, shop, settings) {
  const status = duesStatus(shop, settings);
  if (status === "current") return;

  const type = status === "overdue" ? "overdue" : "due_soon";
  const { data: existing } = await db
    .from("notifications")
    .select("id")
    .eq("shop_id", shop.id)
    .eq("type", type)
    .eq("is_read", false)
    .limit(1);

  if (existing && existing.length > 0) return; // already notified, don't spam

  const message = status === "overdue"
    ? `${shop.name}'s weekly Student Mart due is overdue. Pay now to avoid suspension.`
    : `${shop.name}'s weekly Student Mart due is coming up soon.`;

  await db.from("notifications").insert({
    profile_id: shop.owner_id,
    shop_id: shop.id,
    type,
    message,
  });
}
