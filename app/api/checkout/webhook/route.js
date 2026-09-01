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
    const { type, user_id, shop_id } = session.metadata || {};

    if (type === "account_fee" && user_id) {
      await db.from("profiles").update({
        account_fee_paid: true,
        account_fee_paid_at: new Date().toISOString(),
        role: "dealer",
      }).eq("id", user_id);
    }

    if (type === "weekly_due" && shop_id) {
      const now = new Date();
      const next = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await db.from("shops").update({
        commission_owed_cents: 0,
        last_payment_at: now.toISOString(),
        next_due_at: next.toISOString(),
      }).eq("id", shop_id);

      const { data: shop } = await db.from("shops").select("owner_id,name").eq("id", shop_id).single();
      if (shop) {
        await db.from("notifications").insert({
          profile_id: shop.owner_id,
          shop_id,
          type: "payment_confirmed",
          message: `Payment received — ${shop.name}'s weekly due is cleared. Next due ${next.toLocaleDateString()}.`,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
