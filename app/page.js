"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, LayoutGrid, Package, Wrench, Sparkles, Lightbulb } from "lucide-react";
import { supabaseBrowser } from "../lib/supabaseClient";
import ProductCard from "../components/ProductCard";

const CATEGORIES = [
  { slug: "all", label: "All", icon: LayoutGrid },
  { slug: "physical", label: "Physical Goods", icon: Package },
  { slug: "services", label: "Freelance / Services", icon: Wrench },
  { slug: "digital", label: "Digital Products", icon: Sparkles },
  { slug: "idea", label: "Idea Incubator", icon: Lightbulb },
];

export default function ExplorePage() {
  const [products, setProducts] = useState([]);
  const [shopsById, setShopsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("popular");
  const supabase = supabaseBrowser();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: shops } = await supabase.from("shops").select("*").eq("status", "approved");
      const map = {};
      (shops || []).forEach((s) => (map[s.id] = s));
      setShopsById(map);

      const { data: prods } = await supabase.from("products").select("*").eq("status", "active");
      setProducts((prods || []).filter((p) => map[p.shop_id]));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      const matchCat = category === "all" || p.listing_type === category;
      const shopName = shopsById[p.shop_id]?.name?.toLowerCase() || "";
      const matchQuery = p.title.toLowerCase().includes(query.toLowerCase()) || shopName.includes(query.toLowerCase());
      return matchCat && matchQuery;
    });
    if (sort === "popular") list = [...list].sort((a, b) => (b.inquiry_count || 0) - (a.inquiry_count || 0));
    if (sort === "newest") list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }, [products, shopsById, query, category, sort]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="mb-6">
        <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#B08A3C] mb-1">Explore</div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-[#16283F]">The campus marketplace</h1>
        <p className="text-sm text-[#5B6472] mt-1 max-w-xl">Real shops, run by real students. Every listing here is live.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8478]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search shops, items, or services…"
            className="w-full bg-white border border-[#DED5BE] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30" />
        </div>
        <div className="relative">
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="appearance-none bg-white border border-[#DED5BE] rounded-xl pl-4 pr-9 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1F3A5C]/30 cursor-pointer">
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A8478] pointer-events-none" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const active = category === c.slug;
          return (
            <button key={c.slug} onClick={() => setCategory(c.slug)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${active ? "bg-[#1F3A5C] border-[#1F3A5C] text-[#EDE7DA]" : "bg-white border-[#DED5BE] text-[#5B6472] hover:border-[#1F3A5C]"}`}>
              <Icon size={13} /> {c.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-[#8A8478] py-16 text-center">Loading live listings…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[#8A8478]">
          <Package className="mx-auto mb-3" size={28} />
          <p className="text-sm">{products.length === 0 ? "No shops have gone live yet — be the first to open one." : "No listings match that search."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => <ProductCard key={p.id} product={p} shop={shopsById[p.shop_id]} />)}
        </div>
      )}
    </div>
  );
}
