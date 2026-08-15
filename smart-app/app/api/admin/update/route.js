import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/adminSession";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

// Body: { resource: "cms"|"payment_settings"|"platform_settings"|"shop_status"|"plaza_create", payload: {...} }
export async function POST(req) {
  if (!isAdminRequest()) return NextResponse.json({ error: "Not authenticated as admin." }, { status: 401 });

  const { resource, payload } = await req.json();
  const db = supabaseAdmin();

  if (resource === "cms") {
    const { error } = await db.from("cms_pages").update({
      title: payload.title,
      content_md: payload.content_md,
      updated_at: new Date().toISOString(),
    }).eq("slug", payload.slug);
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
    if (status === "approved") updates.approved_at = new Date().toISOString();
    const { error } = await db.from("shops").update(updates).eq("id", shop_id);
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
