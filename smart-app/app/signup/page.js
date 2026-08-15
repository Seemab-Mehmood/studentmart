"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBasket, Store, Loader2 } from "lucide-react";
import { supabaseBrowser } from "../../lib/supabaseClient";

export default function SignupPage() {
  const [role, setRole] = useState("buyer");
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = supabaseBrowser();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error: signErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name, role } },
    });
    if (signErr) {
      setError(signErr.message);
      setLoading(false);
      return;
    }
    if (data.user && form.phone) {
      await supabase.from("profiles").update({ phone: form.phone, role }).eq("id", data.user.id);
    }
    setLoading(false);
    if (data.session) {
      router.push(role === "seller" ? "/seller/dashboard" : "/");
    } else {
      setDone(true); // email confirmation required by Supabase project settings
    }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-xl font-bold text-[#16283F] mb-2">Check your email</h1>
        <p className="text-sm text-[#5B6472]">We sent a confirmation link to {form.email}. Confirm it, then log in.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-[#16283F] mb-1">Create your account</h1>
      <p className="text-sm text-[#5B6472] mb-6">Buy from campus shops, or open your own.</p>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setRole("buyer")} className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border text-sm font-semibold ${role === "buyer" ? "border-[#1F3A5C] bg-[#1F3A5C]/5 text-[#16283F]" : "border-[#DED5BE] text-[#5B6472]"}`}>
          <ShoppingBasket size={15} /> Buyer
        </button>
        <button onClick={() => setRole("seller")} className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border text-sm font-semibold ${role === "seller" ? "border-[#1F3A5C] bg-[#1F3A5C]/5 text-[#16283F]" : "border-[#DED5BE] text-[#5B6472]"}`}>
          <Store size={15} /> Seller
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input required placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
        <input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
        <input required type="password" minLength={6} placeholder="Password (min 6 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
        {error && <p className="text-xs text-[#B44B3F]">{error}</p>}
        <button disabled={loading} type="submit" className="w-full flex items-center justify-center gap-2 bg-[#1F3A5C] hover:bg-[#16283F] text-[#EDE7DA] font-semibold py-3 rounded-xl disabled:opacity-50">
          {loading && <Loader2 size={15} className="animate-spin" />} Create account
        </button>
      </form>
      <p className="text-xs text-[#8A8478] mt-4 text-center">
        Already have an account? <a href="/login" className="font-semibold text-[#1F3A5C]">Log in</a>
      </p>
    </div>
  );
}
