import { NextResponse } from "next/server";
import { getServerProfile, hasRole } from "../../../../lib/authz";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

// Body: { role: "admin"|"dealer", email, full_name, password, account_fee_paid? }
export async function POST(req) {
  const caller = await getServerProfile();
  if (!hasRole(caller, ["super_admin"])) {
    return NextResponse.json({ error: "Only the Super Admin can create accounts." }, { status: 403 });
  }

  const { role, email, full_name, password, account_fee_paid } = await req.json();
  if (!["admin", "dealer"].includes(role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  if (!email || !password || password.length < 6) return NextResponse.json({ error: "Email and a password (6+ chars) are required." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: created, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name || "", role },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("profiles").update({
    role,
    created_by_admin: caller.id,
    account_fee_paid: role === "dealer" ? !!account_fee_paid : false,
    account_fee_paid_at: role === "dealer" && account_fee_paid ? new Date().toISOString() : null,
  }).eq("id", created.user.id);

  return NextResponse.json({ ok: true, user_id: created.user.id });
}
