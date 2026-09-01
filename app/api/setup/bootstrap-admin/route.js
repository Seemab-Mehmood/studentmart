import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

// Call this ONCE after deploying, with the secret you set as BOOTSTRAP_SECRET.
// Example: curl -X POST https://your-app.com/api/setup/bootstrap-admin -H "Content-Type: application/json" -d '{"secret":"your-secret"}'
export async function POST(req) {
  const { secret } = await req.json();
  if (!process.env.BOOTSTRAP_SECRET || secret !== process.env.BOOTSTRAP_SECRET) {
    return NextResponse.json({ error: "Invalid bootstrap secret." }, { status: 401 });
  }

  const db = supabaseAdmin();
  const email = process.env.SMART_ADMIN_EMAIL || "smartlive@gmail.com";
  const password = process.env.SMART_ADMIN_PASSWORD;
  if (!password) return NextResponse.json({ error: "SMART_ADMIN_PASSWORD is not set." }, { status: 500 });

  const { data: existing } = await db.from("profiles").select("id").eq("role", "super_admin").limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, message: "A super admin already exists — nothing to do." });
  }

  const { data: created, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Student Mart Admin", role: "super_admin" },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("profiles").update({ role: "super_admin" }).eq("id", created.user.id);

  return NextResponse.json({ ok: true, message: `Super admin created for ${email}. Log in at /login.` });
}
