import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseServer";

export async function POST(req, { params }) {
  const { proof_url } = await req.json();
  if (!proof_url) return NextResponse.json({ error: "Missing proof URL." }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db.from("orders").update({
    payment_proof_url: proof_url,
    payment_status: "proof_submitted",
  }).eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
