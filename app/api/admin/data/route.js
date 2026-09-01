import { NextResponse } from "next/server";
import { getServerProfile, hasRole } from "../../../../lib/authz";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { ensureDueNotification } from "../../../../lib/notify";

export async function GET() {
  const profile = await getServerProfile();
  if (!hasRole(profile, ["admin", "super_admin"])) {
    return NextResponse.json({ error: "Not authenticated as admin." }, { status: 401 });
  }

  const db = supabaseAdmin();
  const [{ data: analytics }, { data: pendingShops }, { data: paymentSettings }, { data: platformSettings }, { data: cms }, { data: plazas }, { data: allShops }] =
    await Promise.all([
      db.from("platform_analytics").select("*").single(),
      db.from("shops").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      db.from("payment_settings").select("*").eq("id", 1).single(),
      db.from("platform_settings").select("*").eq("id", 1).single(),
      db.from("cms_pages").select("*"),
      db.from("plazas").select("*"),
      db.from("shops").select("*").eq("status", "approved"),
    ]);

  // Lazily raise dues notifications for any shop that's crossed into due_soon/overdue.
  for (const shop of allShops || []) {
    await ensureDueNotification(db, shop, platformSettings);
  }

  let admins = [], dealers = [];
  if (hasRole(profile, ["super_admin"])) {
    const { data: adminRows } = await db.from("profiles").select("*").in("role", ["admin", "super_admin"]);
    admins = adminRows || [];
    const { data: dealerRows } = await db.from("profiles").select("*").eq("role", "dealer");
    dealers = dealerRows || [];
  }

  return NextResponse.json({ analytics, pendingShops, paymentSettings, platformSettings, cms, plazas, allShops, admins, dealers, callerRole: profile.role });
}
