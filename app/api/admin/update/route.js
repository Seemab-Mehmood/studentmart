import { NextResponse } from "next/server";
import { getServerProfile, hasRole } from "../../../../lib/authz";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

// Body: { resource, payload }
export async function POST(req) {
  const profile = await getServerProfile();
  if (!hasRole(profile, ["admin", "super_admin"])) {
    return NextResponse.json({ error: "Not authenticated as admin." }, { status: 401 });
  }

  const { resource, payload } = await req.json();
  const db = supabaseAdmin();

  if (resource === "cms") {
    const { error } = await db.from("cms_pages").update({ title: payload.title, content_md: payload.content_md, updated_by: profile.id, updated_at: new Date().toISOString() }).eq("slug", payload.slug);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (resource === "payment_settings") {
    const { error } = await db.from("payment_settings").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (resource === "platform_settings") {
    const { error } = await db.from("platform_settings").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (resource === "shop_status") {
    const { shop_id, status } = payload;
    const updates = { status };
    if (status === "approved") {
      updates.approved_at = new Date().toISOString();
      updates.next_due_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    const { error } = await db.from("shops").update(updates).eq("id", shop_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (status === "approved") {
      const { data: shop } = await db.from("shops").select("owner_id,name").eq("id", shop_id).single();
      if (shop) {
        await db.from("notifications").insert({
          profile_id: shop.owner_id,
          shop_id,
          type: "approval",
          message: `${shop.name} was approved and is now live on Student Mart!`,
        });
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (resource === "shop_mark_paid") {
    // Manual reconciliation — admin confirms a proof-of-payment for a dealer's weekly due.
    const { shop_id } = payload;
    const now = new Date();
    const next = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { error } = await db.from("shops").update({ commission_owed_cents: 0, last_payment_at: now.toISOString(), next_due_at: next.toISOString() }).eq("id", shop_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (resource === "plaza_create") {
    const { error } = await db.from("plazas").insert(payload);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (resource === "shop_plaza") {
    const { shop_id, plaza_id } = payload;
    const { error } = await db.from("shops").update({ plaza_id: plaza_id || null }).eq("id", shop_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown resource." }, { status: 400 });
}
