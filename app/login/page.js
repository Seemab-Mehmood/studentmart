"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabaseBrowser } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const supabase = supabaseBrowser();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword(form);
    if (err) { setError(err.message); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    setLoading(false);
    if (["admin", "super_admin"].includes(profile?.role)) router.push("/admin/dashboard");
    else router.push("/dealer/dashboard");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-[#16283F] mb-1">Log in</h1>
      <p className="text-sm text-[#5B6472] mb-6">Welcome back to Student Mart.</p>
      <form onSubmit={submit} className="space-y-3">
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm" />
        <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm" />
        {error && <p className="text-xs text-[#B44B3F]">{error}</p>}
        <button disabled={loading} type="submit" className="w-full flex items-center justify-center gap-2 bg-[#1F3A5C] hover:bg-[#16283F] text-[#EDE7DA] font-semibold py-3 rounded-xl disabled:opacity-50">
          {loading && <Loader2 size={15} className="animate-spin" />} Log in
        </button>
      </form>
      <p className="text-xs text-[#8A8478] mt-4 text-center">New here? <a href="/signup" className="font-semibold text-[#1F3A5C]">Create an account</a></p>
      <p className="text-[11px] text-[#A29C89] mt-2 text-center">Admins and Super Admins also log in here — you'll land in the Admin Console automatically.</p>
    </div>
  );
}
