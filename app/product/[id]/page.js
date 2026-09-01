"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShieldCheck, ShoppingCart, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { supabaseBrowser } from "../../../lib/supabaseClient";
import Badge from "../../../components/Badge";

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [shop, setShop] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = supabaseBrowser();

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("products").select("*").eq("id", id).single();
      setProduct(p);
      if (p) {
        await supabase.from("products").update({ view_count: (p.view_count || 0) + 1 }).eq("id", id);
        const { data: s } = await supabase.from("shops").select("*").eq("id", p.shop_id).single();
        setShop(s);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-sm text-[#8A8478]">Loading…</div>;
  if (!product) return <div className="max-w-4xl mx-auto px-4 py-16 text-sm text-[#8A8478]">Listing not found.</div>;

  const price = (product.price_cents / 100).toFixed(2);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 grid md:grid-cols-2 gap-8">
      <div>
        <div className="h-72 bg-gradient-to-br from-[#1F3A5C] to-[#16283F] rounded-2xl overflow-hidden flex items-center justify-center">
          {product.images?.length ? <img src={product.images[activeImg]} alt={product.title} className="w-full h-full object-cover" /> : <ShoppingCart className="text-[#EDE7DA]/40" size={40} />}
        </div>
        {product.images?.length > 1 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {product.images.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)} className={`w-14 h-14 rounded-lg overflow-hidden border-2 ${activeImg === i ? "border-[#1F3A5C]" : "border-[#DED5BE]"}`}><img src={img} className="w-full h-full object-cover" /></button>
            ))}
          </div>
        )}
      </div>

      <div>
        {shop && <a href={`/shop/${shop.slug}`} className="flex items-center gap-1.5 text-sm text-[#5B6472] hover:text-[#16283F] mb-2"><ShieldCheck size={14} className="text-[#D9A441]" /> {shop.name}</a>}
        <h1 className="font-display text-2xl font-bold text-[#16283F] mb-2">{product.title}</h1>
        {product.tags?.length > 0 && <div className="flex gap-1.5 mb-3">{product.tags.map((t) => <Badge key={t} tone="outline">{t}</Badge>)}</div>}
        <p className="text-sm text-[#5B6472] leading-relaxed mb-4">{product.description}</p>
        <p className="font-mono text-2xl font-bold text-[#16283F] mb-6">{product.price_cents === 0 ? "Ask for pricing" : `$${price}`}</p>
        <InquiryForm product={product} shop={shop} />
      </div>
    </div>
  );
}

function InquiryForm({ product, shop }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [customResponses, setCustomResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const supabase = supabaseBrowser();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from("profiles").select("*").eq("id", data.user.id).single().then(({ data: p }) => {
          if (p) setForm((f) => ({ ...f, name: p.full_name || "", email: p.email || "", phone: p.phone || "" }));
        });
      }
    });
  }, []);

  const submit = async () => {
    if (!form.name || !form.email || !form.phone) { setError("Name, email, and phone are required."); return; }
    setSubmitting(true); setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const res = await fetch("/api/inquiries", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: product.id, buyer: form, custom_responses: customResponses, buyer_id: userData?.user?.id || null }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "Could not submit."); return; }
    setResult(data);
  };

  if (result) {
    return (
      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6 text-center">
        <CheckCircle2 className="mx-auto mb-2 text-[#3F8C5F]" size={28} />
        <h3 className="font-display font-bold text-[#16283F] mb-1">Inquiry sent!</h3>
        <p className="text-sm text-[#5B6472] mb-4">{result.dealer_contact.shop_name} will reach out to arrange payment and delivery.</p>
        <div className="bg-white border border-[#DED5BE] rounded-xl p-4 text-sm font-mono">
          {result.dealer_contact.phone && <p>{result.dealer_contact.phone}</p>}
          {result.dealer_contact.email && <p>{result.dealer_contact.email}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6 space-y-3">
      <h3 className="font-display font-bold text-[#16283F]">Inquire about this listing</h3>
      <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-2.5 text-sm" />
      <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-2.5 text-sm" />
      <input required placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-2.5 text-sm" />

      {(product.inquiry_form || []).map((field) => (
        <div key={field.id}>
          <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide mb-1">{field.label}{field.required && " *"}</label>
          {field.type === "textarea" ? (
            <textarea rows={2} onChange={(e) => setCustomResponses({ ...customResponses, [field.label]: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-2.5 text-sm" />
          ) : field.type === "select" ? (
            <select onChange={(e) => setCustomResponses({ ...customResponses, [field.label]: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-2.5 text-sm">
              <option value="">Select…</option>
              {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : field.type === "checkbox" ? (
            <input type="checkbox" onChange={(e) => setCustomResponses({ ...customResponses, [field.label]: e.target.checked })} />
          ) : (
            <input type={field.type === "number" ? "number" : "text"} onChange={(e) => setCustomResponses({ ...customResponses, [field.label]: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-2.5 text-sm" />
          )}
        </div>
      ))}

      {error && <p className="text-xs text-[#B44B3F]">{error}</p>}
      <button disabled={submitting} onClick={submit} className="w-full flex items-center justify-center gap-2 bg-[#D9A441] hover:bg-[#c6913a] text-[#16283F] font-semibold py-3 rounded-xl disabled:opacity-50">
        {submitting ? <Loader2 size={15} className="animate-spin" /> : null} Send Inquiry <ArrowRight size={15} />
      </button>
      <p className="text-[11px] text-[#8A8478] text-center">Inquiries can only be submitted through Student Mart.</p>
    </div>
  );
}
