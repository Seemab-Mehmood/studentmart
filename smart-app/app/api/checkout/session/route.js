import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Body variants:
// { type: "cart", order_ids: [...] }                         -> pay for guest/buyer cart orders by card
// { type: "activation", user_id }                              -> $5 one-time seller activation
// { type: "subscription", shop_id, user_id }                    -> $3/month product-limit upgrade
export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured yet. Ask an admin to add Stripe keys." }, { status: 503 });
  }
  const body = await req.json();
  const db = supabaseAdmin();

  if (body.type === "cart") {
    const { data: orders } = await db.from("orders").select("*, order_items(*)").in("id", body.order_ids);
    if (!orders?.length) return NextResponse.json({ error: "Order(s) not found." }, { status: 404 });

    const line_items = orders.flatMap((o) =>
      o.order_items.map((i) => ({
        price_data: {
          currency: "usd",
          product_data: { name: i.title_snapshot },
          unit_amount: i.unit_price_cents,
        },
        quantity: i.quantity,
      }))
    );

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${SITE}/cart?paid=1`,
      cancel_url: `${SITE}/cart?cancelled=1`,
      metadata: { type: "cart", order_ids: body.order_ids.join(",") },
    });
    return NextResponse.json({ url: session.url });
  }

  if (body.type === "activation") {
    if (!process.env.STRIPE_ACTIVATION_PRICE_ID) {
      return NextResponse.json({ error: "Activation price is not configured. Ask an admin to set STRIPE_ACTIVATION_PRICE_ID." }, { status: 503 });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: process.env.STRIPE_ACTIVATION_PRICE_ID, quantity: 1 }],
      success_url: `${SITE}/seller/dashboard?activated=1`,
      cancel_url: `${SITE}/seller/dashboard?cancelled=1`,
      metadata: { type: "activation", user_id: body.user_id },
    });
    return NextResponse.json({ url: session.url });
  }

  if (body.type === "subscription") {
    if (!process.env.STRIPE_SUBSCRIPTION_PRICE_ID) {
      return NextResponse.json({ error: "Subscription price is not configured. Ask an admin to set STRIPE_SUBSCRIPTION_PRICE_ID." }, { status: 503 });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID, quantity: 1 }],
      success_url: `${SITE}/seller/dashboard?subscribed=1`,
      cancel_url: `${SITE}/seller/dashboard?cancelled=1`,
      metadata: { type: "subscription", shop_id: body.shop_id, user_id: body.user_id },
    });
    return NextResponse.json({ url: session.url });
  }

  return NextResponse.json({ error: "Unknown checkout type." }, { status: 400 });
}
