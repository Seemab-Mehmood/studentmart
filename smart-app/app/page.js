"use client";

import React, { useState, useMemo } from "react";
import {
  Search, ShoppingBasket, Star, TrendingUp, Clock, Package, DollarSign,
  Users, CheckCircle2, XCircle, PlusCircle, Upload, BarChart3, Settings,
  ShieldCheck, CreditCard, Store, Tag, Eye, ShoppingCart, ChevronDown, X,
  Sparkles, Rocket, Lightbulb, Wrench, AlertTriangle, Flag, ArrowRight,
  Percent, Wallet, LayoutGrid, ClipboardList, Image as ImageIcon
} from "lucide-react";

/* ============================================================
   DESIGN TOKENS (see design plan)
   paper #EDE7DA · ink navy #1F3A5C · deep navy #16283F · amber #D9A441
   ============================================================ */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');
`;

/* ---------------- MOCK DATA ---------------- */

const CATEGORIES = [
  { slug: "all", label: "All", icon: LayoutGrid },
  { slug: "physical", label: "Physical Goods", icon: Package },
  { slug: "services", label: "Freelance / Services", icon: Wrench },
  { slug: "digital", label: "Digital Products", icon: Sparkles },
  { slug: "idea", label: "Idea Incubator", icon: Lightbulb },
];

const SHOPS = {
  s1: { name: "PixelPress Prints", rating: 4.8, verified: true },
  s2: { name: "Nightowl Notes", rating: 4.6, verified: true },
  s3: { name: "CodeTutor Cam", rating: 5.0, verified: true },
  s4: { name: "Loom & Loop Crafts", rating: 4.3, verified: false },
  s5: { name: "GreenGrid Idea Lab", rating: 4.1, verified: true },
  s6: { name: "DormDash Repairs", rating: 4.7, verified: true },
};

const INITIAL_PRODUCTS = [
  { id: "p1", shopId: "s1", title: "Custom Sticker Sheets (10pk)", category: "physical", type: "product", price: 8.5, tag: "Bestseller", rating: 4.8, orders: 214, views: 1830, img: "🖼️", createdAt: "2026-07-28" },
  { id: "p2", shopId: "s2", title: "CS201 Exam Notes Bundle", category: "digital", type: "digital", price: 6.0, tag: "New", rating: 4.6, orders: 96, views: 940, img: "📚", createdAt: "2026-08-01" },
  { id: "p3", shopId: "s3", title: "1-on-1 Python Tutoring (1hr)", category: "services", type: "service", price: 25.0, tag: "Top Rated", rating: 5.0, orders: 58, views: 620, img: "💻", createdAt: "2026-07-20" },
  { id: "p4", shopId: "s4", title: "Hand-thrown Ceramic Mug", category: "physical", type: "product", price: 18.0, tag: null, rating: 4.3, orders: 31, views: 410, img: "🍵", createdAt: "2026-07-15" },
  { id: "p5", shopId: "s5", title: "Campus Compost Pilot — back this idea", category: "idea", type: "idea", price: 0, tag: "Pitch", rating: 4.1, orders: 12, views: 780, img: "🌱", createdAt: "2026-08-03" },
  { id: "p6", shopId: "s6", title: "Laptop Screen Repair", category: "services", type: "service", price: 40.0, tag: null, rating: 4.7, orders: 44, views: 505, img: "🛠️", createdAt: "2026-07-10" },
  { id: "p7", shopId: "s1", title: "Vinyl Name Decal — Custom", category: "physical", type: "product", price: 5.0, tag: null, rating: 4.5, orders: 88, views: 700, img: "🏷️", createdAt: "2026-06-29" },
  { id: "p8", shopId: "s2", title: "Resume Template (Canva)", category: "digital", type: "digital", price: 4.0, tag: "New", rating: 4.4, orders: 63, views: 588, img: "📄", createdAt: "2026-08-02" },
  { id: "p9", shopId: "s5", title: "Peer Study-Match App — early access", category: "idea", type: "idea", price: 0, tag: "Pitch", rating: 3.9, orders: 5, views: 340, img: "🤝", createdAt: "2026-07-31" },
];

const MERCHANT_ORDERS = [
  { id: "o1", item: "Custom Sticker Sheets (10pk)", buyer: "J. Alvarez", amount: 8.5, status: "pending", date: "Aug 4" },
  { id: "o2", item: "Vinyl Name Decal — Custom", buyer: "T. Wu", amount: 5.0, status: "in_progress", date: "Aug 3" },
  { id: "o3", item: "Custom Sticker Sheets (10pk)", buyer: "R. Okafor", amount: 17.0, status: "completed", date: "Aug 2" },
  { id: "o4", item: "Vinyl Name Decal — Custom", buyer: "M. Chen", amount: 5.0, status: "completed", date: "Aug 1" },
];

const PENDING_APPROVALS = [
  { id: "a1", name: "Loom & Loop Crafts", owner: "S. Patel", category: "Physical Goods", submitted: "Aug 4" },
  { id: "a2", name: "QuickQuiz Flashcards", owner: "D. Kim", category: "Digital Products", submitted: "Aug 4" },
  { id: "a3", name: "Bike Tune-Up Co.", owner: "L. Fischer", category: "Freelance/Services", submitted: "Aug 3" },
];

const money = (n) => `$${n.toFixed(2)}`;

/* ============================================================
   SHARED UI PRIMITIVES
   ============================================================ */

function Badge({ children, tone = "navy" }) {
  const tones = {
    navy: "bg-[#1F3A5C] text-[#EDE7DA]",
    amber: "bg-[#D9A441] text-[#16283F]",
    outline: "border border-[#1F3A5C]/30 text-[#1F3A5C] bg-transparent",
    green: "bg-[#3F8C5F] text-white",
    red: "bg-[#B44B3F] text-white",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${tones[tone]}`}>
      {children}
    </span>
  );
}

function StampBadge() {
  // signature element: wax-stamp style verified mark echoing the logo's stencil look
  return (
    <span
      title="Verified merchant"
      className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#D9A441] text-[#D9A441] shrink-0"
      style={{ boxShadow: "0 0 0 1px rgba(217,164,65,0.25)" }}
    >
      <ShieldCheck size={12} strokeWidth={3} />
    </span>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#B08A3C] mb-1">
          {eyebrow}
        </div>
      )}
      <h2 className="font-display text-2xl md:text-3xl font-bold text-[#16283F]">{title}</h2>
      {subtitle && <p className="text-sm text-[#5B6472] mt-1 max-w-xl">{subtitle}</p>}
    </div>
  );
}

/* ============================================================
   TAB 1 — EXPLORE MARKETPLACE
   ============================================================ */

function ProductCard({ p, onOpen, onQuickAdd }) {
  const shop = SHOPS[p.shopId];
  const catMeta = CATEGORIES.find((c) => c.slug === p.category);
  const CatIcon = catMeta.icon;
  return (
    <div
      className="group bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl overflow-hidden hover:shadow-[0_8px_24px_-6px_rgba(31,58,92,0.25)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col"
      onClick={() => onOpen(p)}
    >
      <div className="h-32 bg-gradient-to-br from-[#1F3A5C] to-[#16283F] flex items-center justify-center text-5xl relative">
        {p.img}
        {p.tag && (
          <div className="absolute top-2 left-2">
            <Badge tone="amber">{p.tag}</Badge>
          </div>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5 text-[11px] text-white font-mono">
          <Eye size={11} /> {p.views}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#8A7A55]">
          <CatIcon size={12} /> {catMeta.label}
        </div>
        <h3 className="font-display font-semibold text-[#16283F] leading-snug line-clamp-2">{p.title}</h3>
        <div className="flex items-center gap-1.5 text-xs text-[#5B6472]">
          {shop.verified && <StampBadge />}
          <span className="truncate">{shop.name}</span>
        </div>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-[#5B6472]">
            <Star size={13} className="fill-[#D9A441] text-[#D9A441]" />
            <span className="font-mono font-semibold text-[#16283F]">{p.rating}</span>
            <span className="text-[#8A8478]">({p.orders})</span>
          </div>
          <span className="font-mono font-bold text-[#16283F]">
            {p.price === 0 ? "Pitch" : money(p.price)}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onQuickAdd(p); }}
          className="mt-2 w-full flex items-center justify-center gap-1.5 bg-[#1F3A5C] hover:bg-[#16283F] text-[#EDE7DA] text-xs font-semibold py-2 rounded-lg transition-colors"
        >
          <ShoppingCart size={13} />
          {p.type === "service" ? "Request Service" : p.type === "idea" ? "Back This Idea" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

function ItemModal({ product, onClose, onQuickAdd }) {
  if (!product) return null;
  const shop = SHOPS[product.shopId];
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div
        className="bg-[#FBF9F4] w-full md:max-w-lg md:rounded-2xl rounded-t-2xl overflow-hidden max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-44 bg-gradient-to-br from-[#1F3A5C] to-[#16283F] flex items-center justify-center text-7xl relative">
          {product.img}
          <button onClick={onClose} className="absolute top-3 right-3 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          {product.tag && <Badge tone="amber">{product.tag}</Badge>}
          <h2 className="font-display text-xl font-bold text-[#16283F] mt-2">{product.title}</h2>
          <div className="flex items-center gap-2 mt-2 text-sm text-[#5B6472]">
            {shop.verified && <StampBadge />}
            <span className="font-medium text-[#16283F]">{shop.name}</span>
            <span className="flex items-center gap-0.5">
              <Star size={13} className="fill-[#D9A441] text-[#D9A441]" /> {shop.rating}
            </span>
          </div>
          <p className="text-sm text-[#5B6472] mt-4 leading-relaxed">
            {product.type === "idea"
              ? "Early-stage concept from the Idea Incubator. Back it to signal demand and get founder updates as it develops."
              : "Made-to-order by a fellow student. Message the shop directly after checkout for customization requests."}
          </p>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#DED5BE]">
            <span className="font-mono text-2xl font-bold text-[#16283F]">
              {product.price === 0 ? "Free to back" : money(product.price)}
            </span>
            <button
              onClick={() => { onQuickAdd(product); onClose(); }}
              className="flex items-center gap-2 bg-[#D9A441] hover:bg-[#c6913a] text-[#16283F] font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {product.type === "service" ? "Request Service" : product.type === "idea" ? "Back Idea" : "Add to Cart"}
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ cart, onClose, onRemove }) {
  const total = cart.reduce((s, i) => s + i.price, 0);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="bg-[#FBF9F4] w-full max-w-sm h-full p-6 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-bold text-[#16283F]">Your Cart</h3>
          <button onClick={onClose}><X size={20} className="text-[#5B6472]" /></button>
        </div>
        {cart.length === 0 ? (
          <p className="text-sm text-[#8A8478]">Nothing here yet — add an item or service request from Explore.</p>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3">
            {cart.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white border border-[#DED5BE] rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.img}</span>
                  <div>
                    <p className="text-sm font-semibold text-[#16283F] leading-tight">{item.title}</p>
                    <p className="font-mono text-xs text-[#5B6472]">{item.price === 0 ? "Free to back" : money(item.price)}</p>
                  </div>
                </div>
                <button onClick={() => onRemove(idx)} className="text-[#B44B3F]"><X size={16} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t border-[#DED5BE] mt-4">
          <div className="flex justify-between font-mono text-sm mb-3">
            <span className="text-[#5B6472]">Subtotal</span>
            <span className="font-bold text-[#16283F]">{money(total)}</span>
          </div>
          <button className="w-full bg-[#1F3A5C] hover:bg-[#16283F] text-[#EDE7DA] font-semibold py-3 rounded-xl disabled:opacity-40" disabled={cart.length === 0}>
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

function ExploreTab({ cart, setCart }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("popular");
  const [modalItem, setModalItem] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const filtered = useMemo(() => {
    let list = INITIAL_PRODUCTS.filter((p) => {
      const matchCat = category === "all" || p.category === category;
      const matchQuery = p.title.toLowerCase().includes(query.toLowerCase()) ||
        SHOPS[p.shopId].name.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQuery;
    });
    if (sort === "popular") list = [...list].sort((a, b) => b.orders - a.orders);
    if (sort === "newest") list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sort === "rated") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [query, category, sort]);

  const quickAdd = (p) => {
    setCart((c) => [...c, p]);
    setToast(`Added "${p.title}" to cart`);
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <SectionHeading
          eyebrow="Explore"
          title="The campus marketplace"
          subtitle="Shops, services, digital goods, and startup pitches — all run by students."
        />
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 bg-white border border-[#DED5BE] hover:border-[#1F3A5C] px-4 py-2.5 rounded-xl text-sm font-semibold text-[#16283F] transition-colors"
        >
          <ShoppingCart size={16} /> Cart
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-[#D9A441] text-[#16283F] text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Search + sort */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8478]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shops, items, or services…"
            className="w-full bg-white border border-[#DED5BE] rounded-xl pl-10 pr-4 py-3 text-sm text-[#16283F] placeholder:text-[#A29C89] focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30"
          />
        </div>
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="appearance-none bg-white border border-[#DED5BE] rounded-xl pl-4 pr-9 py-3 text-sm text-[#16283F] font-medium focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30 cursor-pointer"
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="rated">Top Rated</option>
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A8478] pointer-events-none" />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const active = category === c.slug;
          return (
            <button
              key={c.slug}
              onClick={() => setCategory(c.slug)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${
                active
                  ? "bg-[#1F3A5C] border-[#1F3A5C] text-[#EDE7DA]"
                  : "bg-white border-[#DED5BE] text-[#5B6472] hover:border-[#1F3A5C]"
              }`}
            >
              <Icon size={13} /> {c.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#8A8478]">
          <Package className="mx-auto mb-3" size={28} />
          <p className="text-sm">No listings match that search. Try a different category or keyword.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} p={p} onOpen={setModalItem} onQuickAdd={quickAdd} />
          ))}
        </div>
      )}

      <ItemModal product={modalItem} onClose={() => setModalItem(null)} onQuickAdd={quickAdd} />
      {cartOpen && <CartDrawer cart={cart} onClose={() => setCartOpen(false)} onRemove={(i) => setCart((c) => c.filter((_, idx) => idx !== i))} />}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[#16283F] text-[#EDE7DA] text-sm font-medium px-4 py-2.5 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TAB 2 — MERCHANT PORTAL
   ============================================================ */

function MerchantTab({ commissionRate }) {
  const [step, setStep] = useState(1); // wizard: 1..4, 0 = dashboard (already set up)
  const [shopSetup, setShopSetup] = useState(false);
  const [form, setForm] = useState({ name: "", category: "physical", description: "", contact: "" });
  const [listings, setListings] = useState([
    { id: "l1", title: "Custom Sticker Sheets (10pk)", price: 8.5, stock: 42, tags: "stickers, custom" },
    { id: "l2", title: "Vinyl Name Decal — Custom", price: 5.0, stock: 120, tags: "decal, custom" },
  ]);
  const [newItem, setNewItem] = useState({ title: "", price: "", stock: "", tags: "" });
  const [orders, setOrders] = useState(MERCHANT_ORDERS);
  const [subTab, setSubTab] = useState("inventory");

  const gross = orders.filter(o => o.status === "completed").reduce((s, o) => s + o.amount, 0);
  const commission = gross * (commissionRate / 100);
  const net = gross - commission;
  const totalViews = 1830 + 700;

  const advanceOrder = (id) => {
    setOrders((os) => os.map((o) => {
      if (o.id !== id) return o;
      const next = o.status === "pending" ? "in_progress" : o.status === "in_progress" ? "completed" : "completed";
      return { ...o, status: next };
    }));
  };

  const addListing = () => {
    if (!newItem.title || !newItem.price) return;
    setListings((l) => [...l, { id: `l${l.length + 1}`, title: newItem.title, price: parseFloat(newItem.price), stock: parseInt(newItem.stock || "0"), tags: newItem.tags }]);
    setNewItem({ title: "", price: "", stock: "", tags: "" });
  };

  if (!shopSetup) {
    // ---- SHOP SETUP WIZARD ----
    const steps = ["Shop Basics", "Category & Logo", "Description", "Contact & Review"];
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-10">
        <SectionHeading eyebrow="Merchant Portal" title="Set up your storefront" subtitle="Four quick steps to get your shop live for approval." />
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                i + 1 <= step ? "bg-[#1F3A5C] text-[#EDE7DA]" : "bg-[#DED5BE] text-[#8A8478]"
              }`}>{i + 1}</div>
              {i < steps.length - 1 && <div className={`h-0.5 flex-1 ${i + 1 < step ? "bg-[#1F3A5C]" : "bg-[#DED5BE]"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
          <h3 className="font-display font-bold text-[#16283F] mb-4">{steps[step - 1]}</h3>

          {step === 1 && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide">Shop name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. PixelPress Prints"
                className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.filter(c => c.slug !== "all").map((c) => (
                  <button key={c.slug} onClick={() => setForm({ ...form, category: c.slug })}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium ${form.category === c.slug ? "border-[#1F3A5C] bg-[#1F3A5C]/5 text-[#16283F]" : "border-[#DED5BE] text-[#5B6472]"}`}>
                    <c.icon size={15} /> {c.label}
                  </button>
                ))}
              </div>
              <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide pt-2">Logo</label>
              <div className="border-2 border-dashed border-[#DED5BE] rounded-xl py-8 flex flex-col items-center gap-2 text-[#8A8478] cursor-pointer hover:border-[#1F3A5C] transition-colors">
                <Upload size={20} /> <span className="text-xs">Click to upload (placeholder)</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4}
                placeholder="What do you make or offer?" className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-[#5B6472] uppercase tracking-wide">Contact (email or Discord)</label>
              <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="you@campus.edu"
                className="w-full bg-white border border-[#DED5BE] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
              <div className="bg-[#D9A441]/10 border border-[#D9A441]/40 rounded-xl p-3 text-xs text-[#6B5626] flex gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Your shop will be reviewed by campus admins before it appears in Explore.
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button disabled={step === 1} onClick={() => setStep((s) => s - 1)} className="text-sm font-semibold text-[#5B6472] disabled:opacity-30">Back</button>
            {step < 4 ? (
              <button onClick={() => setStep((s) => s + 1)} className="bg-[#1F3A5C] text-[#EDE7DA] font-semibold text-sm px-5 py-2.5 rounded-xl">Continue</button>
            ) : (
              <button onClick={() => setShopSetup(true)} className="bg-[#D9A441] text-[#16283F] font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center gap-1.5">
                Submit for Review <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- MERCHANT DASHBOARD ----
  const subNav = [
    { key: "inventory", label: "Inventory", icon: Package },
    { key: "orders", label: "Orders", icon: ClipboardList },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-[#1F3A5C] flex items-center justify-center text-[#EDE7DA]"><Store size={18} /></div>
        <div>
          <h2 className="font-display font-bold text-xl text-[#16283F] flex items-center gap-1.5">
            {form.name || "PixelPress Prints"} <StampBadge />
          </h2>
          <p className="text-xs text-[#5B6472]">Pending admin approval · Physical Goods</p>
        </div>
      </div>

      <div className="flex gap-2 mt-6 mb-6 border-b border-[#DED5BE]">
        {subNav.map((n) => (
          <button key={n.key} onClick={() => setSubTab(n.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              subTab === n.key ? "border-[#D9A441] text-[#16283F]" : "border-transparent text-[#8A8478]"
            }`}>
            <n.icon size={15} /> {n.label}
          </button>
        ))}
      </div>

      {subTab === "inventory" && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            {listings.map((l) => (
              <div key={l.id} className="flex items-center justify-between bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4">
                <div>
                  <p className="font-semibold text-sm text-[#16283F]">{l.title}</p>
                  <p className="text-xs text-[#8A8478] mt-0.5 flex items-center gap-1"><Tag size={11} /> {l.tags || "—"}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-sm text-[#16283F]">{money(l.price)}</p>
                  <p className="text-xs text-[#8A8478]">{l.stock} in stock</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4 h-fit">
            <h4 className="font-display font-semibold text-sm text-[#16283F] mb-3 flex items-center gap-1.5"><PlusCircle size={15} /> Add new listing</h4>
            <div className="space-y-2">
              <input placeholder="Item name" value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
              <div className="flex gap-2">
                <input placeholder="Price" type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} className="w-1/2 bg-white border border-[#DED5BE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
                <input placeholder="Stock" type="number" value={newItem.stock} onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })} className="w-1/2 bg-white border border-[#DED5BE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
              </div>
              <input placeholder="Tags (comma separated)" value={newItem.tags} onChange={(e) => setNewItem({ ...newItem, tags: e.target.value })} className="w-full bg-white border border-[#DED5BE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
              <div className="border border-dashed border-[#DED5BE] rounded-lg py-3 flex items-center justify-center gap-1.5 text-[#8A8478] text-xs"><ImageIcon size={13} /> Upload image</div>
              <button onClick={addListing} className="w-full bg-[#1F3A5C] text-[#EDE7DA] text-xs font-semibold py-2.5 rounded-lg">Add Listing</button>
            </div>
          </div>
        </div>
      )}

      {subTab === "orders" && (
        <div className="grid md:grid-cols-3 gap-4">
          {["pending", "in_progress", "completed"].map((status) => (
            <div key={status} className="bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[#8A7A55] mb-3 flex items-center gap-1.5">
                {status === "pending" && <Clock size={13} />}
                {status === "in_progress" && <TrendingUp size={13} />}
                {status === "completed" && <CheckCircle2 size={13} />}
                {status.replace("_", " ")} ({orders.filter(o => o.status === status).length})
              </h4>
              <div className="space-y-2">
                {orders.filter((o) => o.status === status).map((o) => (
                  <div key={o.id} className="bg-white border border-[#DED5BE] rounded-lg p-3">
                    <p className="text-xs font-semibold text-[#16283F]">{o.item}</p>
                    <p className="text-[11px] text-[#8A8478] mt-0.5">{o.buyer} · {o.date}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-mono text-xs font-bold text-[#16283F]">{money(o.amount)}</span>
                      {status !== "completed" && (
                        <button onClick={() => advanceOrder(o.id)} className="text-[11px] font-semibold text-[#1F3A5C] hover:underline">
                          Mark {status === "pending" ? "In Progress" : "Complete"} →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {orders.filter((o) => o.status === status).length === 0 && (
                  <p className="text-[11px] text-[#A29C89] italic">No orders here.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === "analytics" && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye },
              { label: "Total Orders", value: orders.length, icon: Package },
              { label: "Gross Earnings", value: money(gross), icon: DollarSign },
              { label: "Net Revenue", value: money(net), icon: Wallet },
            ].map((m) => (
              <div key={m.label} className="bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4">
                <m.icon size={16} className="text-[#B08A3C] mb-2" />
                <p className="font-mono font-bold text-lg text-[#16283F]">{m.value}</p>
                <p className="text-[11px] text-[#8A8478] uppercase tracking-wide">{m.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#16283F] rounded-xl p-5 text-[#EDE7DA]">
            <div className="flex items-center gap-2 text-sm font-semibold mb-3"><Percent size={15} /> Payout breakdown</div>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between"><span className="text-[#B7C2CF]">Gross earnings</span><span>{money(gross)}</span></div>
              <div className="flex justify-between text-[#D9A441]"><span>Platform fee ({commissionRate}%)</span><span>-{money(commission)}</span></div>
              <div className="flex justify-between border-t border-white/15 pt-2 font-bold text-base"><span>Net payout</span><span>{money(net)}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TAB 3 — ADMIN & COMMISSION CONTROL
   ============================================================ */

function AdminTab() {
  const [commissionRate, setCommissionRate] = useState(5);
  const [gateways, setGateways] = useState({
    stripe: true, campus_card: true, cod: true, p2p: false,
  });
  const [approvals, setApprovals] = useState(PENDING_APPROVALS);

  const gatewayMeta = {
    stripe: { label: "Stripe", icon: CreditCard },
    campus_card: { label: "Campus Card", icon: Wallet },
    cod: { label: "Cash on Delivery", icon: DollarSign },
    p2p: { label: "Peer-to-Peer (Venmo)", icon: Users },
  };

  const totalVolume = 4820;
  const activeMerchants = 6;
  const platformRevenue = totalVolume * (commissionRate / 100);

  const resolveApproval = (id, action) => {
    setApprovals((a) => a.filter((x) => x.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <SectionHeading eyebrow="Admin Console" title="Platform & commission control" subtitle="Restricted to platform administrators." />

      {/* Platform-wide analytics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Volume", value: money(totalVolume), icon: TrendingUp },
          { label: "Active Merchants", value: activeMerchants, icon: Store },
          { label: "Platform Revenue", value: money(platformRevenue), icon: DollarSign },
          { label: "Pending Approvals", value: approvals.length, icon: ClipboardList },
        ].map((m) => (
          <div key={m.label} className="bg-[#FBF9F4] border border-[#DED5BE] rounded-xl p-4">
            <m.icon size={16} className="text-[#B08A3C] mb-2" />
            <p className="font-mono font-bold text-lg text-[#16283F]">{m.value}</p>
            <p className="text-[11px] text-[#8A8478] uppercase tracking-wide">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Commission control */}
        <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
          <h3 className="font-display font-bold text-[#16283F] flex items-center gap-2 mb-1"><Percent size={17} /> Platform Fee</h3>
          <p className="text-xs text-[#8A8478] mb-5">Commission auto-deducted from every completed order's payout.</p>
          <div className="flex items-center gap-4 mb-3">
            <span className="font-mono text-3xl font-bold text-[#16283F]">{commissionRate}%</span>
            <div className="flex gap-1.5">
              {[2, 5, 8].map((r) => (
                <button key={r} onClick={() => setCommissionRate(r)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${commissionRate === r ? "bg-[#1F3A5C] border-[#1F3A5C] text-[#EDE7DA]" : "border-[#DED5BE] text-[#5B6472]"}`}>
                  {r}%
                </button>
              ))}
            </div>
          </div>
          <input type="range" min={2} max={8} step={0.5} value={commissionRate} onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
            className="w-full accent-[#1F3A5C]" />
          <div className="flex justify-between text-[10px] text-[#8A8478] mt-1 font-mono"><span>2% min</span><span>8% max</span></div>

          <div className="mt-5 bg-white border border-[#DED5BE] rounded-xl p-4">
            <p className="text-[11px] font-semibold uppercase text-[#8A7A55] mb-2">Live example — $25.00 order</p>
            <div className="font-mono text-sm space-y-1">
              <div className="flex justify-between"><span className="text-[#5B6472]">Order total</span><span>{money(25)}</span></div>
              <div className="flex justify-between text-[#B44B3F]"><span>Platform fee</span><span>-{money(25 * commissionRate / 100)}</span></div>
              <div className="flex justify-between font-bold border-t border-[#DED5BE] pt-1"><span>Merchant payout</span><span>{money(25 - 25 * commissionRate / 100)}</span></div>
            </div>
          </div>
        </div>

        {/* Payment gateway config */}
        <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6">
          <h3 className="font-display font-bold text-[#16283F] flex items-center gap-2 mb-1"><CreditCard size={17} /> Payment Gateways</h3>
          <p className="text-xs text-[#8A8478] mb-5">Toggle which payment methods buyers can use at checkout.</p>
          <div className="space-y-2.5">
            {Object.entries(gatewayMeta).map(([key, meta]) => (
              <div key={key} className="flex items-center justify-between bg-white border border-[#DED5BE] rounded-xl px-4 py-3">
                <div className="flex items-center gap-2.5 text-sm font-medium text-[#16283F]">
                  <meta.icon size={16} className="text-[#5B6472]" /> {meta.label}
                </div>
                <button
                  onClick={() => setGateways((g) => ({ ...g, [key]: !g[key] }))}
                  className={`w-10 h-5.5 rounded-full relative transition-colors ${gateways[key] ? "bg-[#3F8C5F]" : "bg-[#DED5BE]"}`}
                  style={{ height: 22 }}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${gateways[key] ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Merchant approvals */}
      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6 mt-6">
        <h3 className="font-display font-bold text-[#16283F] flex items-center gap-2 mb-1"><ShieldCheck size={17} /> Merchant Approvals & Moderation</h3>
        <p className="text-xs text-[#8A8478] mb-5">Review new shops before they go live in Explore.</p>
        {approvals.length === 0 ? (
          <p className="text-sm text-[#8A8478] italic py-6 text-center">All caught up — no pending shops.</p>
        ) : (
          <div className="space-y-2.5">
            {approvals.map((a) => (
              <div key={a.id} className="flex items-center justify-between bg-white border border-[#DED5BE] rounded-xl px-4 py-3 flex-wrap gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#16283F]">{a.name}</p>
                  <p className="text-[11px] text-[#8A8478]">{a.owner} · {a.category} · submitted {a.submitted}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => resolveApproval(a.id, "flag")} className="flex items-center gap-1 text-[11px] font-semibold text-[#B44B3F] border border-[#B44B3F]/30 px-3 py-1.5 rounded-lg hover:bg-[#B44B3F]/5">
                    <Flag size={12} /> Flag
                  </button>
                  <button onClick={() => resolveApproval(a.id, "approve")} className="flex items-center gap-1 text-[11px] font-semibold text-white bg-[#3F8C5F] px-3 py-1.5 rounded-lg hover:bg-[#357a51]">
                    <CheckCircle2 size={12} /> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   ROOT APP
   ============================================================ */

export default function StudentMartApp() {
  const [tab, setTab] = useState("explore");
  const [cart, setCart] = useState([]);
  const [commissionRate] = useState(5); // shared read for merchant payout preview; admin tab owns its own live control

  const TABS = [
    { key: "explore", label: "Explore Marketplace", icon: LayoutGrid },
    { key: "merchant", label: "Digital Shop", icon: Store },
    { key: "admin", label: "Admin Console", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen w-full" style={{ background: "#EDE7DA", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#EDE7DA]/95 backdrop-blur-sm border-b border-[#DED5BE]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1F3A5C] flex items-center justify-center text-[#D9A441]">
              <ShoppingBasket size={19} strokeWidth={2.4} />
            </div>
            <div className="leading-none">
              <p className="font-display font-bold text-[#16283F] text-[15px] tracking-tight">STUDENT <span className="text-[#B08A3C]">MART</span></p>
              <p className="text-[10px] text-[#8A8478] tracking-wide">campus marketplace</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 bg-white/60 border border-[#DED5BE] rounded-full p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  tab === t.key ? "bg-[#1F3A5C] text-[#EDE7DA]" : "text-[#5B6472] hover:text-[#16283F]"
                }`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </nav>
        </div>
        {/* mobile tabs */}
        <div className="md:hidden flex border-t border-[#DED5BE]">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold border-b-2 ${
                tab === t.key ? "border-[#D9A441] text-[#16283F]" : "border-transparent text-[#8A8478]"
              }`}
            >
              <t.icon size={16} /> {t.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </header>

      <main>
        {tab === "explore" && <ExploreTab cart={cart} setCart={setCart} />}
        {tab === "merchant" && <MerchantTab commissionRate={commissionRate} />}
        {tab === "admin" && <AdminTab />}
      </main>

      <footer className="text-center py-8 text-[11px] text-[#A29C89] font-mono">
        SMart · built by students, for students
      </footer>
    </div>
  );
}
