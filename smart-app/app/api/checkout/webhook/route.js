import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });

export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  const db = supabaseAdmin();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { type, order_ids, user_id, shop_id } = session.metadata || {};

    if (type === "cart" && order_ids) {
      const ids = order_ids.split(",");
      await db.from("orders").update({ payment_status: "paid" }).in("id", ids);
    }

    if (type === "activation" && user_id) {
      await db.from("profiles").update({ seller_active: true, seller_activated_at: new Date().toISOString(), role: "seller" }).eq("id", user_id);
    }

    if (type === "subscription" && shop_id) {
      const { data: settings } = await db.from("platform_settings").select("*").eq("id", 1).single();
      await db.from("shops").update({
        tier: "monthly",
        item_limit: settings?.monthly_tier_item_limit ?? 15,
        subscription_status: "active",
        stripe_subscription_id: session.subscription || null,
      }).eq("id", shop_id);
    }
  }

  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
    const sub = event.data.object;
    const status = sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "cancelled";
    const { data: settings } = await db.from("platform_settings").select("*").eq("id", 1).single();
    await db.from("shops").update({
      subscription_status: status,
      tier: status === "active" ? "monthly" : "free",
      item_limit: status === "active" ? (settings?.monthly_tier_item_limit ?? 15) : (settings?.free_tier_item_limit ?? 3),
    }).eq("stripe_subscription_id", sub.id);
  }

  return NextResponse.json({ received: true });
}
