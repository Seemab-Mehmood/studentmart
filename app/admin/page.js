"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { supabaseBrowser } from "../../lib/supabaseClient";

export default function AdminLoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = supabaseBrowser();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword(form);
    if (err) { setError(err.message); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    if (!["admin", "super_admin"].includes(profile?.role)) {
      await supabase.auth.signOut();
      setError("This account doesn't have admin access.");
      setLoading(false);
      return;
    }
    setLoading(false);
    router.push("/admin/dashboard");
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#1F3A5C] flex items-center justify-center text-[#D9A441] mx-auto mb-3"><ShieldCheck size={22} /></div>
        <h1 className="font-display text-xl font-bold text-[#16283F]">Admin Console</h1>
        <p className="text-xs text-[#8A8478] mt-1">Restricted to Student Mart admins.</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input required type="email" placeholder="Admin email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm" />
        <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm" />
        {error && <p className="text-xs text-[#B44B3F]">{error}</p>}
        <button disabled={loading} type="submit" className="w-full flex items-center justify-center gap-2 bg-[#1F3A5C] hover:bg-[#16283F] text-[#EDE7DA] font-semibold py-3 rounded-xl disabled:opacity-50">
          {loading && <Loader2 size={15} className="animate-spin" />} Enter Console
        </button>
      </form>
      <p className="text-[11px] text-[#A29C89] mt-4 text-center">First time? Run the one-time bootstrap endpoint (see README) to create the Super Admin account before logging in here.</p>
    </div>
  );
}
