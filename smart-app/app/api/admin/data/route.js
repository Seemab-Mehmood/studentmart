import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/adminSession";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export async function GET() {
  if (!isAdminRequest()) return NextResponse.json({ error: "Not authenticated as admin." }, { status: 401 });

  const db = supabaseAdmin();
  const [{ data: analytics }, { data: pendingShops }, { data: paymentSettings }, { data: platformSettings }, { data: cms }, { data: plazas }, { data: allShops }] =
    await Promise.all([
      db.from("platform_analytics").select("*").single(),
      db.from("shops").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      db.from("payment_settings").select("*").eq("id", 1).single(),
      db.from("platform_settings").select("*").eq("id", 1).single(),
      db.from("cms_pages").select("*"),
      db.from("plazas").select("*"),
      db.from("shops").select("id,name,status,plaza_id,tier").eq("status", "approved"),
    ]);

  return NextResponse.json({ analytics, pendingShops, paymentSettings, platformSettings, cms, plazas, allShops });
}
