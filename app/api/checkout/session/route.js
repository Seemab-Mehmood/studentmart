import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Body: { type: "account_fee", user_id }
// (Weekly due payments go through /api/dealer/pay-due instead, since the amount is dynamic.)
export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured yet. Ask an admin to add Stripe keys, or pay the account fee via a manual method." }, { status: 503 });
  }
  const body = await req.json();
  const db = supabaseAdmin();

  if (body.type === "account_fee") {
    const { data: settings } = await db.from("platform_settings").select("*").eq("id", 1).single();
    const amount = settings?.account_opening_fee_cents ?? 500;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: { currency: "usd", product_data: { name: "Student Mart — dealer account opening fee" }, unit_amount: amount },
        quantity: 1,
      }],
      success_url: `${SITE}/dealer/dashboard?activated=1`,
      cancel_url: `${SITE}/dealer/dashboard?cancelled=1`,
      metadata: { type: "account_fee", user_id: body.user_id },
    });
    return NextResponse.json({ url: session.url });
  }

  return NextResponse.json({ error: "Unknown checkout type." }, { status: 400 });
}
