import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "../../../../../lib/supabaseServer";
import { computeCommission } from "../../../../../lib/pricing";

// Body: { status, agreed_amount_cents? }  — agreed_amount_cents required when status = "completed"
export async function PATCH(req, { params }) {
  const { status, agreed_amount_cents } = await req.json();
  if (!["new", "contacted", "in_progress", "completed", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const db = supabaseServer(); // RLS-respecting: only the owning shop's session can update

  const { data: inquiry, error: fetchErr } = await db.from("inquiries").select("*, shops(*)").eq("id", params.id).single();
  if (fetchErr || !inquiry) return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });

  const updates = { status };

  if (status === "completed" && inquiry.status !== "completed") {
    if (!agreed_amount_cents || agreed_amount_cents <= 0) {
      return NextResponse.json({ error: "Enter the agreed sale amount to mark this completed." }, { status: 400 });
    }
    const admin = supabaseAdmin();
    const { data: settings } = await admin.from("platform_settings").select("*").eq("id", 1).single();
    const { commission_rate_snapshot, commission_cents } = computeCommission(agreed_amount_cents, settings);

    updates.agreed_amount_cents = agreed_amount_cents;
    updates.commission_rate_snapshot = commission_rate_snapshot;
    updates.commission_cents = commission_cents;
    updates.completed_at = new Date().toISOString();

    const { error: updateErr } = await db.from("inquiries").update(updates).eq("id", params.id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    await db.from("shops").update({
      commission_owed_cents: (inquiry.shops.commission_owed_cents || 0) + commission_cents,
      completed_sales_count: (inquiry.shops.completed_sales_count || 0) + 1,
    }).eq("id", inquiry.shop_id);

    return NextResponse.json({ ok: true, commission_cents });
  }

  const { error: updateErr } = await db.from("inquiries").update(updates).eq("id", params.id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
