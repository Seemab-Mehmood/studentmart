"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShieldCheck, Mail, Phone } from "lucide-react";
import { supabaseBrowser } from "../../../lib/supabaseClient";
import ProductCard from "../../../components/ProductCard";

export default function ShopStorefront() {
  const { slug } = useParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = supabaseBrowser();

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("shops").select("*").eq("slug", slug).eq("status", "approved").single();
      setShop(s);
      if (s) {
        const { data: p } = await supabase.from("products").select("*").eq("shop_id", s.id).eq("status", "active");
        setProducts(p || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-16 text-sm text-[#8A8478]">Loading…</div>;
  if (!shop) return <div className="max-w-6xl mx-auto px-4 py-16 text-sm text-[#8A8478]">Shop not found or not yet approved.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-6 flex items-start gap-4 mb-8 flex-wrap">
        <img src={shop.logo_url} alt={shop.name} className="w-20 h-20 rounded-2xl object-cover border border-[#DED5BE]" />
        <div className="flex-1 min-w-[200px]">
          <h1 className="font-display text-xl font-bold text-[#16283F] flex items-center gap-1.5"><ShieldCheck size={18} className="text-[#D9A441]" /> {shop.name}</h1>
          <p className="text-sm text-[#5B6472] mt-1">{shop.description}</p>
          <div className="flex gap-4 mt-3 text-xs text-[#8A8478]">
            {shop.contact_email && <span className="flex items-center gap-1"><Mail size={12} /> {shop.contact_email}</span>}
            {shop.contact_phone && <span className="flex items-center gap-1"><Phone size={12} /> {shop.contact_phone}</span>}
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-[#8A8478] py-12 text-center">This shop hasn't listed any products yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => <ProductCard key={p.id} product={p} shop={shop} />)}
        </div>
      )}
    </div>
  );
}
