import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerProfile, hasRole } from "../../../../lib/authz";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { amountOwedNow } from "../../../../lib/dues";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured yet. Use a manual payment method instead, or ask an admin to add Stripe keys." }, { status: 503 });
  }
  const profile = await getServerProfile();
  if (!hasRole(profile, ["dealer"])) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { shop_id } = await req.json();
  const db = supabaseAdmin();
  const { data: shop } = await db.from("shops").select("*").eq("id", shop_id).eq("owner_id", profile.id).single();
  if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });

  const { data: settings } = await db.from("platform_settings").select("*").eq("id", 1).single();
  const amount = amountOwedNow(shop, settings);
  if (amount <= 0) return NextResponse.json({ error: "Nothing owed right now." }, { status: 400 });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: `Student Mart weekly due — ${shop.name}` },
        unit_amount: amount,
      },
      quantity: 1,
    }],
    success_url: `${SITE}/dealer/dashboard?due_paid=1`,
    cancel_url: `${SITE}/dealer/dashboard?due_cancelled=1`,
    metadata: { type: "weekly_due", shop_id: shop.id },
  });

  return NextResponse.json({ url: session.url });
}
