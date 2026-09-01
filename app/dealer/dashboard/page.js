"use client";

import { useEffect, useState } from "react";
import {
  Store, PlusCircle, Package, Inbox, BarChart3, Wallet, Tag, Loader2, AlertTriangle,
  ArrowRight, DollarSign, CheckCircle2, Clock, MessageSquare, Percent, X, TrendingUp,
} from "lucide-react";
import { supabaseBrowser } from "../../../lib/supabaseClient";
import ImageUploader from "../../../components/ImageUploader";
import LogoUploader from "../../../components/LogoUploader";
import { money } from "../../../lib/pricing";
import { duesStatus, amountOwedNow } from "../../../lib/dues";

const CATEGORIES = [
  { slug: "physical", label: "Physical Goods" },
  { slug: "services", label: "Freelance / Services" },
  { slug: "digital", label: "Digital Products" },
  { slug: "idea", label: "Idea Incubator" },
];
const FIELD_TYPES = ["text", "textarea", "number", "select", "checkbox"];

export default function DealerDashboardPage() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [shop, setShop] = useState(null);
  const [settings, setSettings] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = supabaseBrowser();

  const loadAll = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    setSession(s);
    if (!s) { setLoading(false); return; }
    const { data: p } = await supabase.from("profiles").select("*").eq("id", s.user.id).single();
    setProfile(p);
    const { data: shopRow } = await supabase.from("shops").select("*").eq("owner_id", s.user.id).maybeSingle();
    setShop(shopRow);
    const { data: settingsRow } = await supabase.from("platform_settings").select("*").eq("id", 1).single();
    setSettings(settingsRow);
    const { data: payRow } = await supabase.from("payment_settings").select("*").eq("id", 1).single();
    setPaymentSettings(payRow);
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-16 text-sm text-[#8A8478]">Loading…</div>;
  if (!session) return <SignedOutPrompt />;
  if (!profile?.account_fee_paid) return <AccountFeeGate userId={session.user.id} settings={settings} paymentSettings={paymentSettings} onRefresh={loadAll} />;
  if (!shop) return <ShopWizard ownerId={session.user.id} onCreated={loadAll} />;

  return <DealerDashboard shop={shop} settings={settings} paymentSettings={paymentSettings} onRefresh={loadAll} />;
}

function SignedOutPrompt() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <Store className="mx-auto mb-3 text-[#8A8478]" size={28} />
      <h1 className="font-display text-xl font-bold text-[#16283F] mb-2">Sign in to open a shop</h1>
      <p className="text-sm text-[#5B6472] mb-6">Create an account or log in to become a Student Mart dealer.</p>
      <a href="/signup" className="inline-flex items-center gap-2 bg-[#1F3A5C] text-[#EDE7DA] font-semibold px-5 py-2.5 rounded-xl">Get started <ArrowRight size={15} /></a>
    </div>
  );
}

function AccountFeeGate({ userId, settings, paymentSettings, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notified, setNotified] = useState(false);
  const supabase = supabaseBrowser();
  const fee = money(settings?.account_opening_fee_cents ?? 500);

  const payWithStripe = async () => {
    setLoading(true); setError(null);
    const res = await fetch("/api/checkout/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "account_fee", user_id: userId }) });
    const d = await res.json();
    setLoading(false);
    if (d.url) window.location.href = d.url; else setError(d.error || "Something went wrong.");
  };

  const notifyManualPayment = async () => {
    // Flags admins that a manual payment is coming — they confirm it from Admin → Accounts.
    const { data: admins } = await supabase.from("profiles").select("id").in("role", ["admin", "super_admin"]);
    for (const a of admins || []) {
      await supabase.from("notifications").insert({ profile_id: a.id, type: "general", message: "A dealer reported a manual account-fee payment — confirm it in Admin → Accounts." });
    }
    setNotified(true);
  };

  const manualMethods = ["easypaisa", "jazzcash", "bank_transfer"].filter((k) => paymentSettings?.[`${k}_enabled`]);

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#1F3A5C] flex items-center justify-center text-[#D9A441] mx-auto mb-4"><Store size={24} /></div>
      <h1 className="font-display text-xl font-bold text-[#16283F] mb-2">Open your dealer account</h1>
      <p className="text-sm text-[#5B6472] mb-6">One-time {fee} account-opening fee. After this, opening a shop and listing products is free — Student Mart earns 5% only when you make a sale.</p>
      {error && <p className="text-xs text-[#B44B3F] mb-3">{error}</p>}
      {paymentSettings?.stripe_enabled && (
        <button disabled={loading} onClick={payWithStripe} className="w-full flex items-center justify-center gap-2 bg-[#D9A441] hover:bg-[#c6913a] text-[#16283F] font-semibold px-6 py-3 rounded-xl disabled:opacity-50 mb-3">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />} Pay {fee} with card
        </button>
      )}
      {manualMethods.length > 0 && (
        <div className="text-left bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4 mt-3">
          <p className="text-xs font-semibold text-[#5B6472] uppercase tracking-wide mb-2">Or pay manually</p>
          {manualMethods.map((k) => (
            <div key={k} className="text-xs text-[#5B6472] mb-2">
              <span className="font-semibold text-[#16283F] capitalize">{k.replace("_", " ")}:</span> {paymentSettings[`${k}_account_title`]} — {paymentSettings[`${k}_account_number`] || paymentSettings.bank_iban}
            </div>
          ))}
          {!notified ? (
            <button onClick={notifyManualPayment} className="text-xs font-semibold text-[#1F3A5C] mt-1">I've paid manually — notify admin →</button>
          ) : (
            <p className="text-xs text-[#3F8C5F] font-semibold mt-1">✓ Admin notified — your account activates once confirmed.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ShopWizard({ ownerId, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", category: "physical", description: "", contact_email: "", contact_phone: "", logo_url: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const supabase = supabaseBrowser();
  const steps = ["Shop Basics", "Category & Logo", "Description", "Contact & Review"];

  const submit = async () => {
    if (!form.logo_url) { setError("A shop logo is required."); return; }
    if (!form.description) { setError("A description is required."); return; }
    setSaving(true); setError(null);
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    const { error: err } = await supabase.from("shops").insert({
      owner_id: ownerId, name: form.name, slug, logo_url: form.logo_url, category: form.category,
      description: form.description, contact_email: form.contact_email || null, contact_phone: form.contact_phone || null, status: "pending",
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onCreated();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-6">
        <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#B08A3C] mb-1">Dealer Portal</div>
        <h1 className="font-display text-2xl font-bold text-[#16283F]">Set up your storefront</h1>
        <p className="text-sm text-[#5B6472] mt-1">Opening a shop is free. Logo and description are required.</p>
      </div>
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 ${i + 1 <= step ? "bg-[#1F3A5C] text-[#EDE7DA]" : "bg-[#DED5BE] text-[#8A8478]"}`}>{i + 1}</div>
            {i < steps.length - 1 && <div className={`h-0.5 flex-1 ${i + 1 < step ? "bg-[#1F3A5C]" : "bg-[#DED5BE]"}`} />}
          </div>
        ))}
      </div>
      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
        <h3 className="font-display font-bold text-[#16283F] mb-4">{steps[step - 1]}</h3>
        {step === 1 && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide">Shop name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. PixelPress Prints" className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm" />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.slug} type="button" onClick={() => setForm({ ...form, category: c.slug })} className={`px-3 py-3 rounded-xl border text-sm font-medium text-left ${form.category === c.slug ? "border-[#1F3A5C] bg-[#1F3A5C]/5 text-[#16283F]" : "border-[#DED5BE] text-[#5B6472]"}`}>{c.label}</button>
              ))}
            </div>
            <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide pt-2">Shop logo (required)</label>
            <LogoUploader value={form.logo_url} onChange={(url) => setForm({ ...form, logo_url: url })} />
          </div>
        )}
        {step === 3 && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide">Description (required)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm" />
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide">Contact email</label>
            <input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm" />
            <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide">Contact phone (shown to buyers)</label>
            <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm" />
            <div className="bg-[#D9A441]/10 border border-[#D9A441]/40 rounded-xl p-3 text-xs text-[#6B5626] flex gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> Your shop is reviewed by admins before it appears in Explore.</div>
            {error && <p className="text-xs text-[#B44B3F]">{error}</p>}
          </div>
        )}
        <div className="flex justify-between mt-6">
          <button disabled={step === 1} onClick={() => setStep((s) => s - 1)} className="text-sm font-semibold text-[#5B6472] disabled:opacity-30">Back</button>
          {step < 4 ? (
            <button onClick={() => setStep((s) => s + 1)} className="bg-[#1F3A5C] text-[#EDE7DA] font-semibold text-sm px-5 py-2.5 rounded-xl">Continue</button>
          ) : (
            <button disabled={saving} onClick={submit} className="bg-[#D9A441] text-[#16283F] font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null} Submit for Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DealerDashboard({ shop, settings, paymentSettings, onRefresh }) {
  const [subTab, setSubTab] = useState("inventory");
  const [products, setProducts] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const supabase = supabaseBrowser();

  const loadShopData = async () => {
    const { data: prods } = await supabase.from("products").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false });
    setProducts(prods || []);
    const { data: inqs } = await supabase.from("inquiries").select("*, products(title)").eq("shop_id", shop.id).order("created_at", { ascending: false });
    setInquiries(inqs || []);
    const { data: an } = await supabase.from("shop_analytics").select("*").eq("shop_id", shop.id).single();
    setAnalytics(an);
  };
  useEffect(() => { loadShopData(); }, [shop.id]);

  const status = duesStatus(shop, settings);
  const statusBadge = { current: { label: "Dues current", tone: "text-[#3F8C5F]" }, due_soon: { label: "Due soon", tone: "text-[#B08A3C]" }, overdue: { label: "Overdue", tone: "text-[#B44B3F]" } }[status];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <div className="flex items-center gap-3">
          <img src={shop.logo_url} className="w-10 h-10 rounded-xl object-cover border border-[#DED5BE]" />
          <div>
            <h2 className="font-display font-bold text-xl text-[#16283F]">{shop.name}</h2>
            <p className="text-xs text-[#5B6472] capitalize">{shop.status === "pending" ? "Pending admin approval" : shop.status}</p>
          </div>
        </div>
        <span className={`text-xs font-bold ${statusBadge.tone}`}>{statusBadge.label}</span>
      </div>

      <div className="flex gap-2 mt-6 mb-6 border-b border-[#DED5BE] overflow-x-auto">
        {[{ key: "inventory", label: "Inventory", icon: Package }, { key: "inquiries", label: "Inquiries", icon: Inbox }, { key: "analytics", label: "Analytics", icon: BarChart3 }, { key: "dues", label: "Dues & Billing", icon: Wallet }].map((n) => (
          <button key={n.key} onClick={() => setSubTab(n.key)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${subTab === n.key ? "border-[#D9A441] text-[#16283F]" : "border-transparent text-[#8A8478]"}`}>
            <n.icon size={15} /> {n.label} {n.key === "inquiries" && inquiries.filter(i => i.status === "new").length > 0 && <span className="bg-[#D9A441] text-[#16283F] text-[10px] font-bold rounded-full px-1.5">{inquiries.filter(i => i.status === "new").length}</span>}
          </button>
        ))}
      </div>

      {subTab === "inventory" && <InventoryTab shop={shop} products={products} onChange={loadShopData} />}
      {subTab === "inquiries" && <InquiriesTab inquiries={inquiries} settings={settings} onChange={loadShopData} />}
      {subTab === "analytics" && <AnalyticsTab analytics={analytics} shop={shop} />}
      {subTab === "dues" && <DuesTab shop={shop} settings={settings} paymentSettings={paymentSettings} onRefresh={onRefresh} />}
    </div>
  );
}

function FormBuilder({ fields, onChange }) {
  const add = () => onChange([...fields, { id: `f${Date.now()}`, label: "", type: "text", required: false, options: "" }]);
  const update = (i, patch) => onChange(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const remove = (i) => onChange(fields.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {fields.map((f, i) => (
        <div key={f.id} className="bg-white border border-[#DED5BE] rounded-lg p-2.5 space-y-1.5">
          <div className="flex gap-1.5">
            <input placeholder="Field label (e.g. Size)" value={f.label} onChange={(e) => update(i, { label: e.target.value })} className="flex-1 bg-[#F5F1E7] border border-[#DED5BE] rounded px-2 py-1.5 text-xs" />
            <select value={f.type} onChange={(e) => update(i, { type: e.target.value })} className="bg-[#F5F1E7] border border-[#DED5BE] rounded px-2 py-1.5 text-xs">
              {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={() => remove(i)}><X size={14} className="text-[#B44B3F]" /></button>
          </div>
          {f.type === "select" && (
            <input placeholder="Options, comma separated" value={f.options} onChange={(e) => update(i, { options: e.target.value })} className="w-full bg-[#F5F1E7] border border-[#DED5BE] rounded px-2 py-1.5 text-xs" />
          )}
          <label className="flex items-center gap-1.5 text-xs text-[#5B6472]">
            <input type="checkbox" checked={f.required} onChange={(e) => update(i, { required: e.target.checked })} /> Required
          </label>
        </div>
      ))}
      <button onClick={add} className="text-xs font-semibold text-[#1F3A5C] flex items-center gap-1"><PlusCircle size={13} /> Add form field</button>
    </div>
  );
}

function InventoryTab({ shop, products, onChange }) {
  const [form, setForm] = useState({ title: "", description: "", price: "", tags: "", images: [], inquiry_form: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const supabase = supabaseBrowser();

  const addListing = async () => {
    if (!form.title || !form.description || !form.price) { setError("Title, description, and price are required."); return; }
    setSaving(true); setError(null);
    const { error: err } = await supabase.from("products").insert({
      shop_id: shop.id, title: form.title, description: form.description,
      price_cents: Math.round(parseFloat(form.price) * 100),
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      images: form.images, listing_type: shop.category,
      inquiry_form: form.inquiry_form.filter((f) => f.label).map((f) => ({ ...f, options: f.type === "select" ? f.options.split(",").map((o) => o.trim()).filter(Boolean) : undefined })),
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setForm({ title: "", description: "", price: "", tags: "", images: [], inquiry_form: [] });
    onChange();
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-3">
        {products.length === 0 && <p className="text-sm text-[#8A8478] italic">No listings yet — add your first one.</p>}
        {products.map((p) => (
          <div key={p.id} className="bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {p.images?.[0] && <img src={p.images[0]} className="w-12 h-12 rounded-lg object-cover border border-[#DED5BE]" />}
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#16283F] truncate">{p.title}</p>
                  <p className="text-xs text-[#8A8478] mt-0.5 flex items-center gap-1"><Tag size={11} /> {p.tags?.join(", ") || "—"}</p>
                </div>
              </div>
              <p className="font-mono font-bold text-sm text-[#16283F] shrink-0">{money(p.price_cents)}</p>
            </div>
            {p.inquiry_form?.length > 0 && <p className="text-[11px] text-[#8A7A55] mt-2">{p.inquiry_form.length} custom form field{p.inquiry_form.length > 1 ? "s" : ""}</p>}
          </div>
        ))}
      </div>
      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4 h-fit">
        <h4 className="font-display font-semibold text-sm text-[#16283F] mb-3 flex items-center gap-1.5"><PlusCircle size={15} /> Add new listing</h4>
        <div className="space-y-2">
          <input placeholder="Item title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-lg px-3 py-2 text-xs" />
          <textarea placeholder="Description (required)" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-lg px-3 py-2 text-xs" />
          <input placeholder="Asking price (USD)" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-lg px-3 py-2 text-xs" />
          <input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-lg px-3 py-2 text-xs" />
          <ImageUploader bucket="product-images" images={form.images} onChange={(imgs) => setForm({ ...form, images: imgs })} label="Add photos (as many as you like)" />
          <div className="pt-2 border-t border-[#DED5BE]">
            <p className="text-xs font-semibold text-[#5B6472] uppercase tracking-wide mb-2">Custom inquiry form</p>
            <p className="text-[11px] text-[#8A8478] mb-2">Name, email, and phone are always collected. Add anything else you need to know from a buyer.</p>
            <FormBuilder fields={form.inquiry_form} onChange={(fields) => setForm({ ...form, inquiry_form: fields })} />
          </div>
          {error && <p className="text-xs text-[#B44B3F]">{error}</p>}
          <button disabled={saving} onClick={addListing} className="w-full flex items-center justify-center gap-1.5 bg-[#1F3A5C] text-[#EDE7DA] text-xs font-semibold py-2.5 rounded-lg disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : null} Add Listing
          </button>
        </div>
      </div>
    </div>
  );
}

function InquiriesTab({ inquiries, settings, onChange }) {
  const [completing, setCompleting] = useState(null);
  const [amount, setAmount] = useState("");
  const [updating, setUpdating] = useState(null);

  const advance = async (inquiry, nextStatus) => {
    if (nextStatus === "completed") { setCompleting(inquiry.id); return; }
    setUpdating(inquiry.id);
    await fetch(`/api/inquiries/${inquiry.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
    setUpdating(null);
    onChange();
  };

  const confirmComplete = async (inquiry) => {
    if (!amount) return;
    setUpdating(inquiry.id);
    await fetch(`/api/inquiries/${inquiry.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed", agreed_amount_cents: Math.round(parseFloat(amount) * 100) }) });
    setUpdating(null); setCompleting(null); setAmount("");
    onChange();
  };

  const columns = ["new", "contacted", "in_progress", "completed"];
  const nextOf = { new: "contacted", contacted: "in_progress", in_progress: "completed" };

  return (
    <div className="grid md:grid-cols-4 gap-4">
      {columns.map((status) => (
        <div key={status} className="bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[#8A7A55] mb-3">{status.replace("_", " ")} ({inquiries.filter((i) => i.status === status).length})</h4>
          <div className="space-y-2">
            {inquiries.filter((i) => i.status === status).map((i) => (
              <div key={i.id} className="bg-white border border-[#DED5BE] rounded-lg p-3">
                <p className="text-xs font-semibold text-[#16283F]">{i.products?.title}</p>
                <p className="text-[11px] text-[#8A8478] mt-0.5">{i.buyer_name} · {i.buyer_phone}</p>
                <p className="text-[11px] text-[#8A8478]">{i.buyer_email}</p>
                {Object.keys(i.custom_responses || {}).length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-[#DED5BE] space-y-0.5">
                    {Object.entries(i.custom_responses).map(([k, v]) => <p key={k} className="text-[11px] text-[#5B6472]"><span className="font-semibold">{k}:</span> {String(v)}</p>)}
                  </div>
                )}
                {completing === i.id ? (
                  <div className="mt-2 space-y-1.5">
                    <input type="number" step="0.01" placeholder="Agreed amount (USD)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-[#F5F1E7] border border-[#DED5BE] rounded px-2 py-1 text-xs" />
                    <div className="flex gap-1.5">
                      <button onClick={() => confirmComplete(i)} disabled={updating === i.id} className="flex-1 bg-[#3F8C5F] text-white text-[11px] font-semibold py-1.5 rounded">Confirm</button>
                      <button onClick={() => setCompleting(null)} className="text-[11px] text-[#8A8478]">Cancel</button>
                    </div>
                  </div>
                ) : status !== "completed" && (
                  <button disabled={updating === i.id} onClick={() => advance(i, nextOf[status])} className="text-[11px] font-semibold text-[#1F3A5C] hover:underline mt-2 disabled:opacity-50">
                    Mark {nextOf[status].replace("_", " ")} →
                  </button>
                )}
                {status === "completed" && <p className="text-[11px] text-[#3F8C5F] font-semibold mt-2">${(i.agreed_amount_cents / 100).toFixed(2)} · {i.commission_rate_snapshot}% commission accrued</p>}
              </div>
            ))}
            {inquiries.filter((i) => i.status === status).length === 0 && <p className="text-[11px] text-[#A29C89] italic">Nothing here.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsTab({ analytics, shop }) {
  const metrics = [
    { label: "Total Views", value: analytics?.total_views ?? 0, icon: TrendingUp },
    { label: "Total Inquiries", value: analytics?.total_inquiries ?? 0, icon: MessageSquare },
    { label: "Completed Sales", value: analytics?.completed_sales ?? 0, icon: CheckCircle2 },
    { label: "Gross (self-reported)", value: money(analytics?.gross_earnings_cents ?? 0), icon: DollarSign },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <div key={m.label} className="bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4">
          <m.icon size={16} className="text-[#B08A3C] mb-2" />
          <p className="font-mono font-bold text-lg text-[#16283F]">{m.value}</p>
          <p className="text-[11px] text-[#8A8478] uppercase tracking-wide">{m.label}</p>
        </div>
      ))}
    </div>
  );
}

function DuesTab({ shop, settings, paymentSettings, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notified, setNotified] = useState(false);
  const supabase = supabaseBrowser();
  const owed = amountOwedNow(shop, settings);
  const status = duesStatus(shop, settings);

  const payWithStripe = async () => {
    setLoading(true); setError(null);
    const res = await fetch("/api/dealer/pay-due", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shop_id: shop.id }) });
    const d = await res.json();
    setLoading(false);
    if (d.url) window.location.href = d.url; else setError(d.error || "Something went wrong.");
  };

  const notifyManual = async () => {
    const { data: admins } = await supabase.from("profiles").select("id").in("role", ["admin", "super_admin"]);
    for (const a of admins || []) {
      await supabase.from("notifications").insert({ profile_id: a.id, shop_id: shop.id, type: "general", message: `${shop.name} reported a manual weekly-due payment — confirm in Admin.` });
    }
    setNotified(true);
  };

  const manualMethods = ["easypaisa", "jazzcash", "bank_transfer"].filter((k) => paymentSettings?.[`${k}_enabled`]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-[#16283F] rounded-2xl p-6 text-[#EDE7DA]">
        <div className="flex items-center gap-2 text-sm font-semibold mb-2"><Percent size={15} /> Amount owed right now</div>
        <p className="font-mono text-3xl font-bold">{money(owed)}</p>
        <p className="text-xs text-[#B7C2CF] mt-2">
          {money(settings?.weekly_due_cents)} flat weekly fee + {money(shop.commission_owed_cents)} accrued commission (5% of sales you've marked completed since your last payment).
        </p>
        {shop.next_due_at && <p className="text-xs text-[#B7C2CF] mt-2">Next due date: {new Date(shop.next_due_at).toLocaleDateString()} {status === "overdue" && <span className="text-[#D9A441] font-semibold">— overdue</span>}</p>}
      </div>
      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
        <h4 className="font-display font-semibold text-[#16283F] mb-3">Pay now</h4>
        {error && <p className="text-xs text-[#B44B3F] mb-2">{error}</p>}
        {paymentSettings?.stripe_enabled && (
          <button disabled={loading || owed === 0} onClick={payWithStripe} className="w-full flex items-center justify-center gap-2 bg-[#D9A441] hover:bg-[#c6913a] text-[#16283F] font-semibold py-2.5 rounded-xl disabled:opacity-50 mb-3">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />} Pay {money(owed)} with card
          </button>
        )}
        {manualMethods.length > 0 && (
          <div className="text-xs text-[#5B6472] space-y-2">
            {manualMethods.map((k) => (
              <p key={k}><span className="font-semibold text-[#16283F] capitalize">{k.replace("_", " ")}:</span> {paymentSettings[`${k}_account_title`]} — {paymentSettings[`${k}_account_number`] || paymentSettings.bank_iban}</p>
            ))}
            {!notified ? <button onClick={notifyManual} className="font-semibold text-[#1F3A5C]">I've paid manually — notify admin →</button> : <p className="text-[#3F8C5F] font-semibold">✓ Admin notified.</p>}
          </div>
        )}
        {owed === 0 && <p className="text-xs text-[#3F8C5F] font-semibold">Nothing owed — you're all caught up.</p>}
      </div>
    </div>
  );
}
