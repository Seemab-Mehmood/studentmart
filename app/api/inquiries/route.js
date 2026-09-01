import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseServer";

// Body: { product_id, buyer: {name,email,phone}, custom_responses: {fieldId: value}, buyer_id? }
export async function POST(req) {
  const { product_id, buyer, custom_responses, buyer_id } = await req.json();

  if (!buyer?.name || !buyer?.email || !buyer?.phone) {
    return NextResponse.json({ error: "Name, email, and phone are required." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: product, error: prodErr } = await db
    .from("products")
    .select("*, shops!inner(id,status,contact_phone,contact_email,name)")
    .eq("id", product_id)
    .single();

  if (prodErr || !product || product.status !== "active" || product.shops.status !== "approved") {
    return NextResponse.json({ error: "This listing is not currently available." }, { status: 400 });
  }

  // Validate required custom fields
  const schema = product.inquiry_form?.length ? product.inquiry_form : [];
  for (const field of schema) {
    if (field.required && !custom_responses?.[field.id]) {
      return NextResponse.json({ error: `"${field.label}" is required.` }, { status: 400 });
    }
  }

  const { data: inquiry, error } = await db.from("inquiries").insert({
    product_id,
    shop_id: product.shop_id,
    buyer_id: buyer_id || null,
    buyer_name: buyer.name,
    buyer_email: buyer.email,
    buyer_phone: buyer.phone,
    custom_responses: custom_responses || {},
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("products").update({ inquiry_count: (product.inquiry_count || 0) + 1 }).eq("id", product_id);

  return NextResponse.json({
    inquiry,
    dealer_contact: { phone: product.shops.contact_phone, email: product.shops.contact_email, shop_name: product.shops.name },
  });
}
