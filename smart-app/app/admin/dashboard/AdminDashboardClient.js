"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck, TrendingUp, Store, DollarSign, ClipboardList, Percent, CreditCard,
  FileText, LandPlot, CheckCircle2, Flag, LogOut, Save, Loader2, PlusCircle,
} from "lucide-react";

const money = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

export default function AdminDashboardClient() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => fetch("/api/admin/data").then((r) => r.json()).then(setData);
  useEffect(() => { load(); }, []);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const call = async (resource, payload) => {
    setSaving(true);
    const res = await fetch("/api/admin/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource, payload }) });
    setSaving(false);
    if (res.ok) { flash("Saved."); load(); } else { const d = await res.json(); flash(d.error || "Failed."); }
  };

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.href = "/admin";
  };

  if (!data) return <div className="max-w-6xl mx-auto px-4 py-16 text-sm text-[#8A8478]">Loading admin console…</div>;

  const NAV = [
    { key: "overview", label: "Overview", icon: TrendingUp },
    { key: "approvals", label: "Approvals", icon: ClipboardList },
    { key: "commission", label: "Fees & Tiers", icon: Percent },
    { key: "payments", label: "Payment Methods", icon: CreditCard },
    { key: "cms", label: "About & Policy", icon: FileText },
    { key: "plaza", label: "Plaza", icon: LandPlot },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#B08A3C] mb-1">Admin Console</div>
          <h1 className="font-display text-2xl font-bold text-[#16283F] flex items-center gap-2"><ShieldCheck size={22} /> Platform Control</h1>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-sm font-semibold text-[#B44B3F]"><LogOut size={15} /> Log out</button>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-6 border-b border-[#DED5BE]">
        {NAV.map((n) => (
          <button key={n.key} onClick={() => setTab(n.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${tab === n.key ? "border-[#D9A441] text-[#16283F]" : "border-transparent text-[#8A8478]"}`}>
            <n.icon size={15} /> {n.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Active Merchants", value: data.analytics?.active_merchants ?? 0, icon: Store },
            { label: "Completed Orders", value: data.analytics?.completed_orders ?? 0, icon: ClipboardList },
            { label: "Total Volume", value: money(data.analytics?.total_volume_cents), icon: TrendingUp },
            { label: "Platform Revenue", value: money(data.analytics?.platform_revenue_cents), icon: DollarSign },
          ].map((m) => (
            <div key={m.label} className="bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4">
              <m.icon size={16} className="text-[#B08A3C] mb-2" />
              <p className="font-mono font-bold text-lg text-[#16283F]">{m.value}</p>
              <p className="text-[11px] text-[#8A8478] uppercase tracking-wide">{m.label}</p>
            </div>
          ))}
          <p className="col-span-full text-xs text-[#8A8478] mt-2">All figures are computed live from the orders table — nothing here is a placeholder.</p>
        </div>
      )}

      {tab === "approvals" && (
        <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
          <h3 className="font-display font-bold text-[#16283F] mb-4">Pending shop approvals ({data.pendingShops?.length || 0})</h3>
          {(!data.pendingShops || data.pendingShops.length === 0) ? (
            <p className="text-sm text-[#8A8478] italic py-6 text-center">No shops waiting for review.</p>
          ) : (
            <div className="space-y-2.5">
              {data.pendingShops.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-white border border-[#DED5BE] rounded-xl px-4 py-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <img src={s.logo_url} className="w-10 h-10 rounded-lg object-cover border border-[#DED5BE]" />
                    <div>
                      <p className="text-sm font-semibold text-[#16283F]">{s.name}</p>
                      <p className="text-[11px] text-[#8A8478]">{s.category} · submitted {new Date(s.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => call("shop_status", { shop_id: s.id, status: "flagged" })} className="flex items-center gap-1 text-[11px] font-semibold text-[#B44B3F] border border-[#B44B3F]/30 px-3 py-1.5 rounded-lg hover:bg-[#B44B3F]/5">
                      <Flag size={12} /> Flag
                    </button>
                    <button onClick={() => call("shop_status", { shop_id: s.id, status: "approved" })} className="flex items-center gap-1 text-[11px] font-semibold text-white bg-[#3F8C5F] px-3 py-1.5 rounded-lg hover:bg-[#357a51]">
                      <CheckCircle2 size={12} /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "commission" && <CommissionEditor settings={data.platformSettings} onSave={(p) => call("platform_settings", p)} saving={saving} />}
      {tab === "payments" && <PaymentEditor settings={data.paymentSettings} onSave={(p) => call("payment_settings", p)} saving={saving} />}
      {tab === "cms" && <CmsEditor pages={data.cms} onSave={(p) => call("cms", p)} saving={saving} />}
      {tab === "plaza" && <PlazaEditor plazas={data.plazas} shops={data.allShops} onCreate={(p) => call("plaza_create", p)} onAssign={(p) => call("shop_plaza", p)} saving={saving} />}

      {toast && <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#16283F] text-[#EDE7DA] text-sm font-medium px-4 py-2.5 rounded-full shadow-lg z-50">{toast}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1"><label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide">{label}</label>{children}</div>;
}
const inputCls = "w-full bg-white border border-[#DED5BE] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30";

function CommissionEditor({ settings, onSave, saving }) {
  const [f, setF] = useState(settings || {});
  useEffect(() => setF(settings || {}), [settings]);
  return (
    <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6 grid md:grid-cols-2 gap-4">
      <Field label="Early commission rate (%) — sales 1 to threshold">
        <input type="number" step="0.5" value={f.commission_rate_early ?? ""} onChange={(e) => setF({ ...f, commission_rate_early: parseFloat(e.target.value) })} className={inputCls} />
      </Field>
      <Field label="Late commission rate (%) — after threshold">
        <input type="number" step="0.5" value={f.commission_rate_late ?? ""} onChange={(e) => setF({ ...f, commission_rate_late: parseFloat(e.target.value) })} className={inputCls} />
      </Field>
      <Field label="Sales threshold (count)">
        <input type="number" value={f.commission_sale_threshold ?? ""} onChange={(e) => setF({ ...f, commission_sale_threshold: parseInt(e.target.value) })} className={inputCls} />
      </Field>
      <Field label="Seller activation fee (cents, one-time)">
        <input type="number" value={f.seller_activation_fee_cents ?? ""} onChange={(e) => setF({ ...f, seller_activation_fee_cents: parseInt(e.target.value) })} className={inputCls} />
      </Field>
      <Field label="Free tier item limit">
        <input type="number" value={f.free_tier_item_limit ?? ""} onChange={(e) => setF({ ...f, free_tier_item_limit: parseInt(e.target.value) })} className={inputCls} />
      </Field>
      <Field label="Monthly tier item limit">
        <input type="number" value={f.monthly_tier_item_limit ?? ""} onChange={(e) => setF({ ...f, monthly_tier_item_limit: parseInt(e.target.value) })} className={inputCls} />
      </Field>
      <Field label="Monthly subscription fee (cents)">
        <input type="number" value={f.monthly_subscription_fee_cents ?? ""} onChange={(e) => setF({ ...f, monthly_subscription_fee_cents: parseInt(e.target.value) })} className={inputCls} />
      </Field>
      <div className="md:col-span-2">
        <p className="text-xs text-[#8A8478] mb-3">Changing the fee amounts here updates what the app displays and how commission is calculated for new orders — remember to also update the matching Stripe Price if you change activation/subscription amounts.</p>
        <button disabled={saving} onClick={() => onSave(f)} className="flex items-center gap-2 bg-[#1F3A5C] text-[#EDE7DA] font-semibold text-sm px-5 py-2.5 rounded-xl disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save settings
        </button>
      </div>
    </div>
  );
}

function PaymentEditor({ settings, onSave, saving }) {
  const [f, setF] = useState(settings || {});
  useEffect(() => setF(settings || {}), [settings]);
  const toggle = (key) => setF({ ...f, [key]: !f[key] });

  return (
    <div className="space-y-4">
      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-display font-semibold text-[#16283F]">Stripe (Card payments)</h4>
          <Toggle on={f.stripe_enabled} onClick={() => toggle("stripe_enabled")} />
        </div>
        <p className="text-xs text-[#8A8478]">Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET set in environment variables.</p>
      </div>

      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-semibold text-[#16283F]">Cash on delivery</h4>
          <Toggle on={f.cash_enabled} onClick={() => toggle("cash_enabled")} />
        </div>
      </div>

      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-semibold text-[#16283F]">Easypaisa (manual transfer)</h4>
          <Toggle on={f.easypaisa_enabled} onClick={() => toggle("easypaisa_enabled")} />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Account title"><input className={inputCls} value={f.easypaisa_account_title || ""} onChange={(e) => setF({ ...f, easypaisa_account_title: e.target.value })} /></Field>
          <Field label="Account number"><input className={inputCls} value={f.easypaisa_account_number || ""} onChange={(e) => setF({ ...f, easypaisa_account_number: e.target.value })} /></Field>
          <div className="md:col-span-2"><Field label="Instructions shown to buyer"><textarea rows={2} className={inputCls} value={f.easypaisa_instructions || ""} onChange={(e) => setF({ ...f, easypaisa_instructions: e.target.value })} /></Field></div>
        </div>
      </div>

      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-semibold text-[#16283F]">JazzCash (manual transfer)</h4>
          <Toggle on={f.jazzcash_enabled} onClick={() => toggle("jazzcash_enabled")} />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Account title"><input className={inputCls} value={f.jazzcash_account_title || ""} onChange={(e) => setF({ ...f, jazzcash_account_title: e.target.value })} /></Field>
          <Field label="Account number"><input className={inputCls} value={f.jazzcash_account_number || ""} onChange={(e) => setF({ ...f, jazzcash_account_number: e.target.value })} /></Field>
          <div className="md:col-span-2"><Field label="Instructions shown to buyer"><textarea rows={2} className={inputCls} value={f.jazzcash_instructions || ""} onChange={(e) => setF({ ...f, jazzcash_instructions: e.target.value })} /></Field></div>
        </div>
      </div>

      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-semibold text-[#16283F]">Bank transfer (manual)</h4>
          <Toggle on={f.bank_transfer_enabled} onClick={() => toggle("bank_transfer_enabled")} />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Account title"><input className={inputCls} value={f.bank_account_title || ""} onChange={(e) => setF({ ...f, bank_account_title: e.target.value })} /></Field>
          <Field label="Bank name"><input className={inputCls} value={f.bank_name || ""} onChange={(e) => setF({ ...f, bank_name: e.target.value })} /></Field>
          <Field label="Account number"><input className={inputCls} value={f.bank_account_number || ""} onChange={(e) => setF({ ...f, bank_account_number: e.target.value })} /></Field>
          <Field label="IBAN"><input className={inputCls} value={f.bank_iban || ""} onChange={(e) => setF({ ...f, bank_iban: e.target.value })} /></Field>
          <div className="md:col-span-2"><Field label="Instructions shown to buyer"><textarea rows={2} className={inputCls} value={f.bank_instructions || ""} onChange={(e) => setF({ ...f, bank_instructions: e.target.value })} /></Field></div>
        </div>
      </div>

      <button disabled={saving} onClick={() => onSave(f)} className="flex items-center gap-2 bg-[#1F3A5C] text-[#EDE7DA] font-semibold text-sm px-5 py-2.5 rounded-xl disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save payment settings
      </button>
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} className={`w-10 rounded-full relative transition-colors ${on ? "bg-[#3F8C5F]" : "bg-[#DED5BE]"}`} style={{ height: 22 }}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}

function CmsEditor({ pages, onSave, saving }) {
  const about = pages?.find((p) => p.slug === "about");
  const policy = pages?.find((p) => p.slug === "policy");
  const [aboutForm, setAboutForm] = useState(about || {});
  const [policyForm, setPolicyForm] = useState(policy || {});
  useEffect(() => setAboutForm(about || {}), [about]);
  useEffect(() => setPolicyForm(policy || {}), [policy]);

  return (
    <div className="space-y-4">
      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
        <h4 className="font-display font-semibold text-[#16283F] mb-3">About / How It Works page</h4>
        <Field label="Title"><input className={inputCls} value={aboutForm.title || ""} onChange={(e) => setAboutForm({ ...aboutForm, title: e.target.value })} /></Field>
        <div className="mt-3"><Field label="Content (Markdown)"><textarea rows={10} className={inputCls + " font-mono"} value={aboutForm.content_md || ""} onChange={(e) => setAboutForm({ ...aboutForm, content_md: e.target.value })} /></Field></div>
        <button disabled={saving} onClick={() => onSave({ slug: "about", title: aboutForm.title, content_md: aboutForm.content_md })} className="mt-3 flex items-center gap-2 bg-[#1F3A5C] text-[#EDE7DA] font-semibold text-sm px-5 py-2.5 rounded-xl disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save About page
        </button>
      </div>

      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
        <h4 className="font-display font-semibold text-[#16283F] mb-3">Policy & Who We Are page</h4>
        <Field label="Title"><input className={inputCls} value={policyForm.title || ""} onChange={(e) => setPolicyForm({ ...policyForm, title: e.target.value })} /></Field>
        <div className="mt-3"><Field label="Content (Markdown)"><textarea rows={10} className={inputCls + " font-mono"} value={policyForm.content_md || ""} onChange={(e) => setPolicyForm({ ...policyForm, content_md: e.target.value })} /></Field></div>
        <button disabled={saving} onClick={() => onSave({ slug: "policy", title: policyForm.title, content_md: policyForm.content_md })} className="mt-3 flex items-center gap-2 bg-[#1F3A5C] text-[#EDE7DA] font-semibold text-sm px-5 py-2.5 rounded-xl disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Policy page
        </button>
      </div>
    </div>
  );
}

function PlazaEditor({ plazas, shops, onCreate, onAssign, saving }) {
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  return (
    <div className="space-y-4">
      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
        <h4 className="font-display font-semibold text-[#16283F] mb-3 flex items-center gap-1.5"><PlusCircle size={16} /> Create a Plaza</h4>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} /></Field>
          <Field label="Slug"><input className={inputCls} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Description"><input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
        <button disabled={saving || !form.name} onClick={() => { onCreate(form); setForm({ name: "", slug: "", description: "" }); }} className="mt-3 flex items-center gap-2 bg-[#1F3A5C] text-[#EDE7DA] font-semibold text-sm px-5 py-2.5 rounded-xl disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create Plaza
        </button>
      </div>

      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
        <h4 className="font-display font-semibold text-[#16283F] mb-3">Assign shops to a Plaza</h4>
        {(!shops || shops.length === 0) ? (
          <p className="text-sm text-[#8A8478] italic">No approved shops yet.</p>
        ) : (
          <div className="space-y-2">
            {shops.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-white border border-[#DED5BE] rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-[#16283F]">{s.name}</span>
                <select defaultValue={s.plaza_id || ""} onChange={(e) => onAssign({ shop_id: s.id, plaza_id: e.target.value || null })} className="bg-[#F5F1E7] border border-[#DED5BE] rounded-lg px-2 py-1 text-xs">
                  <option value="">No Plaza</option>
                  {plazas?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
