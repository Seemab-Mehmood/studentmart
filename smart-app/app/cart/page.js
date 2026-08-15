"use client";

import { useEffect, useState } from "react";
import { X, ShoppingCart, Loader2, CheckCircle2, Copy } from "lucide-react";
import { getCart, removeFromCart, clearCart } from "../../lib/cart";
import { supabaseBrowser } from "../../lib/supabaseClient";
import ImageUploader from "../../components/ImageUploader";

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [deliveryMode, setDeliveryMode] = useState("in_home");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const [placedOrders, setPlacedOrders] = useState(null);
  const supabase = supabaseBrowser();

  useEffect(() => {
    setCart(getCart());
    supabase.from("payment_settings").select("*").eq("id", 1).single().then(({ data }) => setSettings(data));
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from("profiles").select("*").eq("id", data.user.id).single().then(({ data: p }) => {
          if (p) setForm((f) => ({ ...f, name: p.full_name || "", email: p.email || "", phone: p.phone || "" }));
        });
      }
    });
  }, []);

  const total = cart.reduce((s, i) => s + i.unit_price_cents * i.quantity, 0);

  const remove = (id) => setCart(removeFromCart(id));

  const placeOrder = async () => {
    if (!form.name || !form.email || !form.phone) { setError("Name, email, and phone are required."); return; }
    setPlacing(true); setError(null);

    const { data: userData } = await supabase.auth.getUser();

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((c) => ({ product_id: c.product_id, quantity: c.quantity })),
        buyer: form,
        delivery_mode: deliveryMode,
        payment_method: paymentMethod,
        buyer_id: userData?.user?.id || null,
      }),
    });
    const data = await res.json();
    setPlacing(false);
    if (!res.ok) { setError(data.error || "Could not place order."); return; }

    if (paymentMethod === "card") {
      const sessionRes = await fetch("/api/checkout/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "cart", order_ids: data.orders.map((o) => o.id) }),
      });
      const sessionData = await sessionRes.json();
      if (sessionData.url) { clearCart(); window.location.href = sessionData.url; return; }
      setError(sessionData.error || "Card checkout unavailable — try another payment method.");
      return;
    }

    clearCart();
    setPlacedOrders(data.orders);
  };

  if (placedOrders) return <OrderConfirmation orders={placedOrders} settings={settings} paymentMethod={paymentMethod} />;

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <ShoppingCart className="mx-auto mb-3 text-[#8A8478]" size={28} />
        <h1 className="font-display text-xl font-bold text-[#16283F] mb-2">Your cart is empty</h1>
        <a href="/" className="text-sm font-semibold text-[#1F3A5C]">Browse the marketplace →</a>
      </div>
    );
  }

  const methods = [
    { key: "cash", label: "Cash on delivery", enabled: settings?.cash_enabled },
    { key: "card", label: "Card (Stripe)", enabled: settings?.stripe_enabled },
    { key: "easypaisa", label: "Easypaisa", enabled: settings?.easypaisa_enabled },
    { key: "jazzcash", label: "JazzCash", enabled: settings?.jazzcash_enabled },
    { key: "bank_transfer", label: "Bank transfer", enabled: settings?.bank_transfer_enabled },
  ].filter((m) => m.enabled);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
      <h1 className="font-display text-2xl font-bold text-[#16283F] mb-6">Checkout</h1>

      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-5 mb-6">
        {cart.map((item) => (
          <div key={item.product_id} className="flex items-center justify-between py-2 border-b border-[#DED5BE] last:border-0">
            <div className="flex items-center gap-3">
              {item.image && <img src={item.image} className="w-10 h-10 rounded-lg object-cover" />}
              <div>
                <p className="text-sm font-semibold text-[#16283F]">{item.title}</p>
                <p className="text-xs text-[#8A8478]">{item.shop_name} · qty {item.quantity}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-[#16283F]">${((item.unit_price_cents * item.quantity) / 100).toFixed(2)}</span>
              <button onClick={() => remove(item.product_id)}><X size={14} className="text-[#B44B3F]" /></button>
            </div>
          </div>
        ))}
        <div className="flex justify-between pt-3 font-mono text-sm">
          <span className="text-[#5B6472]">Total</span>
          <span className="font-bold text-[#16283F]">${(total / 100).toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-bold text-[#16283F]">Your details</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm" />
          <input required placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm" />
          <input placeholder="Delivery address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide mb-2">Mode of delivery</label>
          <div className="flex gap-2">
            <button onClick={() => setDeliveryMode("online_remote")} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${deliveryMode === "online_remote" ? "border-[#1F3A5C] bg-[#1F3A5C]/5 text-[#16283F]" : "border-[#DED5BE] text-[#5B6472]"}`}>Online / Remote (digital)</button>
            <button onClick={() => setDeliveryMode("in_home")} className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold ${deliveryMode === "in_home" ? "border-[#1F3A5C] bg-[#1F3A5C]/5 text-[#16283F]" : "border-[#DED5BE] text-[#5B6472]"}`}>In-home (physical)</button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide mb-2">Payment method</label>
          {methods.length === 0 ? (
            <p className="text-xs text-[#B44B3F]">No payment methods are currently enabled — ask an admin to turn one on.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {methods.map((m) => (
                <button key={m.key} onClick={() => setPaymentMethod(m.key)} className={`py-2.5 rounded-xl border text-sm font-semibold ${paymentMethod === m.key ? "border-[#1F3A5C] bg-[#1F3A5C]/5 text-[#16283F]" : "border-[#DED5BE] text-[#5B6472]"}`}>{m.label}</button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-[#B44B3F]">{error}</p>}
        <button disabled={placing || methods.length === 0} onClick={placeOrder} className="w-full flex items-center justify-center gap-2 bg-[#1F3A5C] hover:bg-[#16283F] text-[#EDE7DA] font-semibold py-3 rounded-xl disabled:opacity-50">
          {placing ? <Loader2 size={16} className="animate-spin" /> : null} Place order — ${(total / 100).toFixed(2)}
        </button>
        <p className="text-[11px] text-[#8A8478] text-center">Orders can only be placed through Student Mart. Your vendor's contact will be shared after checkout.</p>
      </div>
    </div>
  );
}

function OrderConfirmation({ orders, settings, paymentMethod }) {
  const [proofUrls, setProofUrls] = useState({});
  const [submitted, setSubmitted] = useState({});
  const supabase = supabaseBrowser();

  const submitProof = async (orderId) => {
    const url = proofUrls[orderId]?.[0];
    if (!url) return;
    await fetch(`/api/orders/${orderId}/proof`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proof_url: url }) });
    setSubmitted((s) => ({ ...s, [orderId]: true }));
  };

  const manualInfo = {
    easypaisa: { title: settings?.easypaisa_account_title, number: settings?.easypaisa_account_number, instructions: settings?.easypaisa_instructions },
    jazzcash: { title: settings?.jazzcash_account_title, number: settings?.jazzcash_account_number, instructions: settings?.jazzcash_instructions },
    bank_transfer: { title: settings?.bank_account_title, number: settings?.bank_account_number, iban: settings?.bank_iban, bank: settings?.bank_name, instructions: settings?.bank_instructions },
  }[paymentMethod];

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-12">
      <div className="text-center mb-8">
        <CheckCircle2 className="mx-auto mb-3 text-[#3F8C5F]" size={32} />
        <h1 className="font-display text-2xl font-bold text-[#16283F]">Order placed!</h1>
        <p className="text-sm text-[#5B6472] mt-1">Your vendor has been notified.</p>
      </div>

      {manualInfo && (
        <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6 mb-6">
          <h3 className="font-display font-bold text-[#16283F] mb-2">Complete your {paymentMethod.replace("_", " ")} payment</h3>
          {manualInfo.instructions && <p className="text-sm text-[#5B6472] mb-3">{manualInfo.instructions}</p>}
          <div className="bg-white border border-[#DED5BE] rounded-xl p-4 font-mono text-sm space-y-1">
            {manualInfo.title && <p><span className="text-[#8A8478]">Account title:</span> {manualInfo.title}</p>}
            {manualInfo.bank && <p><span className="text-[#8A8478]">Bank:</span> {manualInfo.bank}</p>}
            {manualInfo.number && <p><span className="text-[#8A8478]">Account number:</span> {manualInfo.number}</p>}
            {manualInfo.iban && <p><span className="text-[#8A8478]">IBAN:</span> {manualInfo.iban}</p>}
          </div>
        </div>
      )}

      {orders.map((o) => (
        <div key={o.id} className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-5 mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#5B6472]">Order</span>
            <span className="font-mono text-[#16283F]">{o.id.slice(0, 8)}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#5B6472]">Total</span>
            <span className="font-mono font-bold text-[#16283F]">${(o.subtotal_cents / 100).toFixed(2)}</span>
          </div>
          {o.vendor_contact && (
            <div className="flex justify-between text-sm mb-3">
              <span className="text-[#5B6472]">Vendor contact</span>
              <span className="font-mono text-[#16283F]">{o.vendor_contact}</span>
            </div>
          )}
          {manualInfo && !submitted[o.id] && (
            <div className="pt-3 border-t border-[#DED5BE]">
              <p className="text-xs font-semibold text-[#5B6472] uppercase tracking-wide mb-2">Upload payment screenshot</p>
              <ImageUploader bucket="payment-proofs" images={proofUrls[o.id] || []} multiple={false} onChange={(imgs) => setProofUrls((p) => ({ ...p, [o.id]: imgs }))} label="Upload proof of payment" />
              <button onClick={() => submitProof(o.id)} className="mt-2 text-xs font-semibold text-[#1F3A5C]">Submit proof →</button>
            </div>
          )}
          {submitted[o.id] && <p className="text-xs text-[#3F8C5F] font-semibold pt-2">✓ Proof submitted — pending confirmation.</p>}
        </div>
      ))}

      <a href="/" className="block text-center text-sm font-semibold text-[#1F3A5C] mt-6">Continue browsing →</a>
    </div>
  );
}
