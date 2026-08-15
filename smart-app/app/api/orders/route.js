import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseServer";
import { computeOrderTotals } from "../../../lib/pricing";

// Body: { items: [{product_id, quantity}], buyer: {name,email,phone,address}, delivery_mode, payment_method, buyer_id? }
export async function POST(req) {
  const body = await req.json();
  const { items, buyer, delivery_mode, payment_method, buyer_id } = body;

  if (!items?.length) return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  if (!buyer?.name || !buyer?.email || !buyer?.phone) {
    return NextResponse.json({ error: "Name, email, and phone are required." }, { status: 400 });
  }
  if (!["online_remote", "in_home"].includes(delivery_mode)) {
    return NextResponse.json({ error: "Invalid delivery mode." }, { status: 400 });
  }
  if (!["cash", "card", "easypaisa", "jazzcash", "bank_transfer"].includes(payment_method)) {
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const productIds = items.map((i) => i.product_id);
  const { data: products, error: prodErr } = await db
    .from("products")
    .select("*, shops!inner(id,status,completed_sales_count,contact_phone)")
    .in("id", productIds);
  if (prodErr || !products?.length) return NextResponse.json({ error: "Some items are no longer available." }, { status: 400 });

  // Group requested items by shop — one order per shop.
  const byShop = {};
  for (const reqItem of items) {
    const product = products.find((p) => p.id === reqItem.product_id);
    if (!product || product.status !== "active" || product.shops.status !== "approved") {
      return NextResponse.json({ error: `One of the items in your cart is no longer available.` }, { status: 400 });
    }
    const shopId = product.shop_id;
    if (!byShop[shopId]) byShop[shopId] = { shop: product.shops, items: [] };
    byShop[shopId].items.push({
      product_id: product.id,
      title_snapshot: product.title,
      quantity: reqItem.quantity || 1,
      unit_price_cents: product.price_cents,
    });
  }

  const { data: settings } = await db.from("platform_settings").select("*").eq("id", 1).single();

  const createdOrders = [];
  for (const shopId of Object.keys(byShop)) {
    const { shop, items: orderItems } = byShop[shopId];
    const totals = computeOrderTotals(orderItems, shop.completed_sales_count, settings);

    const { data: order, error: orderErr } = await db
      .from("orders")
      .insert({
        buyer_id: buyer_id || null,
        shop_id: shopId,
        buyer_name: buyer.name,
        buyer_email: buyer.email,
        buyer_phone: buyer.phone,
        buyer_address: buyer.address || null,
        delivery_mode,
        payment_method,
        status: "pending",
        payment_status: "unpaid",
        subtotal_cents: totals.subtotal_cents,
        commission_rate_snapshot: totals.commission_rate_snapshot,
        commission_cents: totals.commission_cents,
        net_payout_cents: totals.net_payout_cents,
      })
      .select()
      .single();

    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

    const itemsToInsert = orderItems.map((i) => ({ ...i, order_id: order.id }));
    await db.from("order_items").insert(itemsToInsert);

    // Bump each product's raw order_count (view-facing "sold" counter — not the commission-tier counter,
    // which only advances when the shop marks the order Completed; see /api/orders/[id]/status).
    for (const i of orderItems) {
      const { data: prod } = await db.from("products").select("order_count").eq("id", i.product_id).single();
      await db.from("products").update({ order_count: (prod?.order_count || 0) + i.quantity }).eq("id", i.product_id);
    }

    createdOrders.push({ ...order, vendor_contact: shop.contact_phone });
  }

  return NextResponse.json({ orders: createdOrders });
}
