import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

export async function GET() {
  const db = supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ notifications: [] });
  const { data } = await db.from("notifications").select("*").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(20);
  return NextResponse.json({ notifications: data || [] });
}

export async function PATCH(req) {
  const db = supabaseServer();
  const { id } = await req.json();
  const { error } = await db.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
