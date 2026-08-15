import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../../lib/supabaseServer";

// Body: { status: "in_progress" | "completed" | "cancelled" }
// Note: "1 sale" = 1 completed order (not per line item). This is the counter that
// the 5%→10% commission threshold in platform_settings.commission_sale_threshold checks.
export async function PATCH(req, { params }) {
  const { status } = await req.json();
  if (!["pending", "in_progress", "completed", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const db = supabaseServer(); // RLS-respecting: only the owning shop's session can update its own orders

  const { data: order, error: fetchErr } = await db.from("orders").select("*, shops(*)").eq("id", params.id).single();
  if (fetchErr || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const wasCompleted = order.status === "completed";
  const { error: updateErr } = await db.from("orders").update({
    status,
    fulfilled_at: status === "completed" ? new Date().toISOString() : order.fulfilled_at,
  }).eq("id", params.id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  if (!wasCompleted && status === "completed") {
    await db.from("shops").update({ completed_sales_count: (order.shops.completed_sales_count || 0) + 1 }).eq("id", order.shop_id);
  }

  return NextResponse.json({ ok: true });
}
