"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store, Upload, PlusCircle, Package, ClipboardList, BarChart3, Clock, TrendingUp,
  CheckCircle2, Tag, Percent, Wallet, DollarSign, Eye, Loader2, AlertTriangle, ArrowRight,
} from "lucide-react";
import { supabaseBrowser } from "../../../lib/supabaseClient";
import ImageUploader from "../../../components/ImageUploader";
import LogoUploader from "../../../components/LogoUploader";
import { commissionRateForSale } from "../../../lib/pricing";

const CATEGORIES = [
  { slug: "physical", label: "Physical Goods" },
  { slug: "services", label: "Freelance / Services" },
  { slug: "digital", label: "Digital Products" },
  { slug: "idea", label: "Idea Incubator" },
];

export default function SellerDashboardPage() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null);
  const [shop, setShop] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
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

    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-16 text-sm text-[#8A8478]">Loading…</div>;
  if (!session) return <SignedOutPrompt />;
  if (!profile?.seller_active) return <ActivationGate userId={session.user.id} settings={settings} />;
  if (!shop) return <ShopWizard ownerId={session.user.id} onCreated={loadAll} />;

  return <SellerDashboard shop={shop} settings={settings} onRefresh={loadAll} userId={session.user.id} />;
}

function SignedOutPrompt() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <Store className="mx-auto mb-3 text-[#8A8478]" size={28} />
      <h1 className="font-display text-xl font-bold text-[#16283F] mb-2">Sign in to manage your shop</h1>
      <p className="text-sm text-[#5B6472] mb-6">Create an account or log in to open your storefront.</p>
      <a href="/signup" className="inline-flex items-center gap-2 bg-[#1F3A5C] text-[#EDE7DA] font-semibold px-5 py-2.5 rounded-xl">Get started <ArrowRight size={15} /></a>
    </div>
  );
}

function ActivationGate({ userId, settings }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fee = ((settings?.seller_activation_fee_cents ?? 500) / 100).toFixed(2);

  const activate = async () => {
    setLoading(true); setError(null);
    const res = await fetch("/api/checkout/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "activation", user_id: userId }) });
    const d = await res.json();
    setLoading(false);
    if (d.url) window.location.href = d.url; else setError(d.error || "Something went wrong.");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#1F3A5C] flex items-center justify-center text-[#D9A441] mx-auto mb-4"><Store size={24} /></div>
      <h1 className="font-display text-xl font-bold text-[#16283F] mb-2">Activate your seller account</h1>
      <p className="text-sm text-[#5B6472] mb-6">One-time ${fee} for lifetime seller access. Opening your shop itself is free.</p>
      {error && <p className="text-xs text-[#B44B3F] mb-3">{error}</p>}
      <button disabled={loading} onClick={activate} className="inline-flex items-center gap-2 bg-[#D9A441] hover:bg-[#c6913a] text-[#16283F] font-semibold px-6 py-3 rounded-xl disabled:opacity-50">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />} Pay ${fee} & activate
      </button>
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
      owner_id: ownerId,
      name: form.name,
      slug,
      logo_url: form.logo_url,
      category: form.category,
      description: form.description,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      status: "pending",
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onCreated();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-6">
        <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#B08A3C] mb-1">Seller Portal</div>
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
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. PixelPress Prints"
              className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.slug} type="button" onClick={() => setForm({ ...form, category: c.slug })}
                  className={`px-3 py-3 rounded-xl border text-sm font-medium text-left ${form.category === c.slug ? "border-[#1F3A5C] bg-[#1F3A5C]/5 text-[#16283F]" : "border-[#DED5BE] text-[#5B6472]"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide pt-2">Shop logo (required)</label>
            <LogoUploader value={form.logo_url} onChange={(url) => setForm({ ...form, logo_url: url })} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide">Description (required)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="What do you make or offer?"
              className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide">Contact email</label>
            <input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="you@campus.edu"
              className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
            <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide">Contact phone (shown to buyers as "vendor contact")</label>
            <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+92 3xx xxxxxxx"
              className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
            <div className="bg-[#D9A441]/10 border border-[#D9A441]/40 rounded-xl p-3 text-xs text-[#6B5626] flex gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Your shop is reviewed by admins before it appears in Explore.
            </div>
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

function SellerDashboard({ shop, settings, onRefresh, userId }) {
  const [subTab, setSubTab] = useState("inventory");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const supabase = supabaseBrowser();

  const loadShopData = async () => {
    const { data: prods } = await supabase.from("products").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false });
    setProducts(prods || []);
    const { data: ords } = await supabase.from("orders").select("*, order_items(*)").eq("shop_id", shop.id).order("created_at", { ascending: false });
    setOrders(ords || []);
    const { data: an } = await supabase.from("shop_analytics").select("*").eq("shop_id", shop.id).single();
    setAnalytics(an);
  };
  useEffect(() => { loadShopData(); }, [shop.id]);

  const atLimit = products.filter((p) => p.status !== "archived").length >= shop.item_limit;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center gap-3 mb-1">
        <img src={shop.logo_url} className="w-10 h-10 rounded-xl object-cover border border-[#DED5BE]" />
        <div>
          <h2 className="font-display font-bold text-xl text-[#16283F]">{shop.name}</h2>
          <p className="text-xs text-[#5B6472] capitalize">
            {shop.status === "pending" ? "Pending admin approval" : shop.status} · {shop.tier === "monthly" ? "Monthly plan" : "Free tier"} · {products.filter(p=>p.status!=='archived').length}/{shop.item_limit} listings
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-6 mb-6 border-b border-[#DED5BE] overflow-x-auto">
        {[{ key: "inventory", label: "Inventory", icon: Package }, { key: "orders", label: "Orders", icon: ClipboardList }, { key: "analytics", label: "Analytics", icon: BarChart3 }, { key: "plan", label: "Plan & Billing", icon: Percent }].map((n) => (
          <button key={n.key} onClick={() => setSubTab(n.key)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${subTab === n.key ? "border-[#D9A441] text-[#16283F]" : "border-transparent text-[#8A8478]"}`}>
            <n.icon size={15} /> {n.label}
          </button>
        ))}
      </div>

      {subTab === "inventory" && <InventoryTab shop={shop} products={products} atLimit={atLimit} onChange={loadShopData} />}
      {subTab === "orders" && <OrdersTab orders={orders} onChange={loadShopData} />}
      {subTab === "analytics" && <AnalyticsTab analytics={analytics} shop={shop} settings={settings} />}
      {subTab === "plan" && <PlanTab shop={shop} settings={settings} userId={userId} onRefresh={onRefresh} />}
    </div>
  );
}

function InventoryTab({ shop, products, atLimit, onChange }) {
  const [form, setForm] = useState({ title: "", description: "", price: "", stock: "", tags: "", images: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const supabase = supabaseBrowser();

  const addListing = async () => {
    if (!form.title || !form.description || !form.price) { setError("Title, description, and price are required."); return; }
    if (atLimit) { setError(`You've reached your ${shop.item_limit}-listing limit for this plan.`); return; }
    setSaving(true); setError(null);
    const { error: err } = await supabase.from("products").insert({
      shop_id: shop.id,
      title: form.title,
      description: form.description,
      price_cents: Math.round(parseFloat(form.price) * 100),
      stock: form.stock ? parseInt(form.stock) : null,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      images: form.images,
      listing_type: shop.category,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setForm({ title: "", description: "", price: "", stock: "", tags: "", images: [] });
    onChange();
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-3">
        {products.length === 0 && <p className="text-sm text-[#8A8478] italic">No listings yet — add your first one.</p>}
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {p.images?.[0] && <img src={p.images[0]} className="w-12 h-12 rounded-lg object-cover border border-[#DED5BE]" />}
              <div className="min-w-0">
                <p className="font-semibold text-sm text-[#16283F] truncate">{p.title}</p>
                <p className="text-xs text-[#8A8478] mt-0.5 flex items-center gap-1"><Tag size={11} /> {p.tags?.join(", ") || "—"}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono font-bold text-sm text-[#16283F]">${(p.price_cents / 100).toFixed(2)}</p>
              <p className="text-xs text-[#8A8478]">{p.stock ?? "∞"} in stock</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4 h-fit">
        <h4 className="font-display font-semibold text-sm text-[#16283F] mb-3 flex items-center gap-1.5"><PlusCircle size={15} /> Add new listing</h4>
        {atLimit && <p className="text-xs text-[#B44B3F] mb-2">Listing limit reached ({shop.item_limit}). Upgrade in Plan & Billing to add more.</p>}
        <div className="space-y-2">
          <input placeholder="Item title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-lg px-3 py-2 text-xs" />
          <textarea placeholder="Description (required)" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-lg px-3 py-2 text-xs" />
          <div className="flex gap-2">
            <input placeholder="Price (USD)" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-1/2 bg-white border border-[#DED5BE] rounded-lg px-3 py-2 text-xs" />
            <input placeholder="Stock (blank = ∞)" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-1/2 bg-white border border-[#DED5BE] rounded-lg px-3 py-2 text-xs" />
          </div>
          <input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-lg px-3 py-2 text-xs" />
          <ImageUploader bucket="product-images" images={form.images} onChange={(imgs) => setForm({ ...form, images: imgs })} label="Add photos (as many as you like)" />
          {error && <p className="text-xs text-[#B44B3F]">{error}</p>}
          <button disabled={saving || atLimit} onClick={addListing} className="w-full flex items-center justify-center gap-1.5 bg-[#1F3A5C] text-[#EDE7DA] text-xs font-semibold py-2.5 rounded-lg disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : null} Add Listing
          </button>
        </div>
      </div>
    </div>
  );
}

function OrdersTab({ orders, onChange }) {
  const [updating, setUpdating] = useState(null);
  const advance = async (order) => {
    const next = order.status === "pending" ? "in_progress" : "completed";
    setUpdating(order.id);
    await fetch(`/api/orders/${order.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    setUpdating(null);
    onChange();
  };

  const columns = ["pending", "in_progress", "completed"];
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {columns.map((status) => (
        <div key={status} className="bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[#8A7A55] mb-3 flex items-center gap-1.5">
            {status === "pending" && <Clock size={13} />}{status === "in_progress" && <TrendingUp size={13} />}{status === "completed" && <CheckCircle2 size={13} />}
            {status.replace("_", " ")} ({orders.filter((o) => o.status === status).length})
          </h4>
          <div className="space-y-2">
            {orders.filter((o) => o.status === status).map((o) => (
              <div key={o.id} className="bg-white border border-[#DED5BE] rounded-lg p-3">
                <p className="text-xs font-semibold text-[#16283F]">{o.order_items?.map((i) => i.title_snapshot).join(", ")}</p>
                <p className="text-[11px] text-[#8A8478] mt-0.5">{o.buyer_name} · {o.buyer_phone} · {new Date(o.created_at).toLocaleDateString()}</p>
                <p className="text-[11px] text-[#8A8478]">{o.payment_method} · {o.payment_status}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-xs font-bold text-[#16283F]">${(o.subtotal_cents / 100).toFixed(2)}</span>
                  {status !== "completed" && (
                    <button disabled={updating === o.id} onClick={() => advance(o)} className="text-[11px] font-semibold text-[#1F3A5C] hover:underline disabled:opacity-50">
                      Mark {status === "pending" ? "In Progress" : "Complete"} →
                    </button>
                  )}
                </div>
              </div>
            ))}
            {orders.filter((o) => o.status === status).length === 0 && <p className="text-[11px] text-[#A29C89] italic">No orders here.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsTab({ analytics, shop, settings }) {
  const currentRate = commissionRateForSale(shop.completed_sales_count, settings);
  const metrics = [
    { label: "Total Views", value: analytics?.total_views ?? 0, icon: Eye },
    { label: "Completed Orders", value: analytics?.total_orders ?? 0, icon: Package },
    { label: "Gross Earnings", value: `$${((analytics?.gross_earnings_cents ?? 0) / 100).toFixed(2)}`, icon: DollarSign },
    { label: "Net Revenue", value: `$${((analytics?.net_revenue_cents ?? 0) / 100).toFixed(2)}`, icon: Wallet },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4">
            <m.icon size={16} className="text-[#B08A3C] mb-2" />
            <p className="font-mono font-bold text-lg text-[#16283F]">{m.value}</p>
            <p className="text-[11px] text-[#8A8478] uppercase tracking-wide">{m.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-[#16283F] rounded-xl p-5 text-[#EDE7DA]">
        <div className="flex items-center gap-2 text-sm font-semibold mb-2"><Percent size={15} /> Your current commission rate</div>
        <p className="font-mono text-3xl font-bold">{currentRate}%</p>
        <p className="text-xs text-[#B7C2CF] mt-2">
          {shop.completed_sales_count} completed sale{shop.completed_sales_count === 1 ? "" : "s"} so far.
          {" "}Sales 1–{settings?.commission_sale_threshold ?? 50} are charged {settings?.commission_rate_early ?? 5}%; after that, {settings?.commission_rate_late ?? 10}% applies to every sale.
        </p>
      </div>
    </div>
  );
}

function PlanTab({ shop, settings, userId, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const monthlyFee = ((settings?.monthly_subscription_fee_cents ?? 300) / 100).toFixed(2);

  const subscribe = async () => {
    setLoading(true); setError(null);
    const res = await fetch("/api/checkout/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "subscription", shop_id: shop.id, user_id: userId }) });
    const d = await res.json();
    setLoading(false);
    if (d.url) window.location.href = d.url; else setError(d.error || "Something went wrong.");
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className={`border rounded-2xl p-6 ${shop.tier === "free" ? "border-[#1F3A5C] bg-[#1F3A5C]/5" : "border-[#DED5BE] bg-[#FBF9F4]"}`}>
        <h4 className="font-display font-bold text-[#16283F] mb-1">Free tier</h4>
        <p className="text-2xl font-mono font-bold text-[#16283F] mb-2">$0</p>
        <p className="text-sm text-[#5B6472] mb-3">Up to {settings?.free_tier_item_limit ?? 3} active listings.</p>
        {shop.tier === "free" && <span className="text-xs font-semibold text-[#1F3A5C]">✓ Current plan</span>}
      </div>
      <div className={`border rounded-2xl p-6 ${shop.tier === "monthly" ? "border-[#1F3A5C] bg-[#1F3A5C]/5" : "border-[#DED5BE] bg-[#FBF9F4]"}`}>
        <h4 className="font-display font-bold text-[#16283F] mb-1">Monthly plan</h4>
        <p className="text-2xl font-mono font-bold text-[#16283F] mb-2">${monthlyFee}<span className="text-sm font-normal text-[#8A8478]">/mo</span></p>
        <p className="text-sm text-[#5B6472] mb-3">Up to {settings?.monthly_tier_item_limit ?? 15} active listings.</p>
        {shop.tier === "monthly" ? (
          <span className="text-xs font-semibold text-[#1F3A5C]">✓ Current plan · {shop.subscription_status}</span>
        ) : (
          <button disabled={loading} onClick={subscribe} className="flex items-center gap-2 bg-[#D9A441] hover:bg-[#c6913a] text-[#16283F] font-semibold text-sm px-4 py-2 rounded-xl disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : null} Upgrade for ${monthlyFee}/mo
          </button>
        )}
      </div>
      {error && <p className="text-xs text-[#B44B3F] md:col-span-2">{error}</p>}
      <p className="text-xs text-[#8A8478] md:col-span-2">Commission (5% → 10% after {settings?.commission_sale_threshold ?? 50} sales) applies on both plans — the plan only changes your listing limit.</p>
    </div>
  );
}
