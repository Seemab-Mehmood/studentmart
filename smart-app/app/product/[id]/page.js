"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShieldCheck, ShoppingCart, ArrowRight } from "lucide-react";
import { supabaseBrowser } from "../../../lib/supabaseClient";
import { addToCart } from "../../../lib/cart";
import Badge from "../../../components/Badge";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
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

  const handleAdd = () => {
    addToCart({
      product_id: product.id,
      shop_id: product.shop_id,
      shop_name: shop?.name || "",
      title: product.title,
      unit_price_cents: product.price_cents,
      image: product.images?.[0] || null,
      listing_type: product.listing_type,
    });
    router.push("/cart");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 grid md:grid-cols-2 gap-8">
      <div>
        <div className="h-72 bg-gradient-to-br from-[#1F3A5C] to-[#16283F] rounded-2xl overflow-hidden flex items-center justify-center">
          {product.images?.length ? (
            <img src={product.images[activeImg]} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <ShoppingCart className="text-[#EDE7DA]/40" size={40} />
          )}
        </div>
        {product.images?.length > 1 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {product.images.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)} className={`w-14 h-14 rounded-lg overflow-hidden border-2 ${activeImg === i ? "border-[#1F3A5C]" : "border-[#DED5BE]"}`}>
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {shop && (
          <a href={`/shop/${shop.slug}`} className="flex items-center gap-1.5 text-sm text-[#5B6472] hover:text-[#16283F] mb-2">
            <ShieldCheck size={14} className="text-[#D9A441]" /> {shop.name}
          </a>
        )}
        <h1 className="font-display text-2xl font-bold text-[#16283F] mb-2">{product.title}</h1>
        {product.tags?.length > 0 && (
          <div className="flex gap-1.5 mb-3">{product.tags.map((t) => <Badge key={t} tone="outline">{t}</Badge>)}</div>
        )}
        <p className="text-sm text-[#5B6472] leading-relaxed mb-6">{product.description}</p>

        <div className="flex items-center justify-between border-t border-[#DED5BE] pt-4">
          <span className="font-mono text-2xl font-bold text-[#16283F]">{product.price_cents === 0 ? "Free to back" : `$${price}`}</span>
          <button onClick={handleAdd} className="flex items-center gap-2 bg-[#D9A441] hover:bg-[#c6913a] text-[#16283F] font-semibold px-5 py-2.5 rounded-xl transition-colors">
            {product.listing_type === "service" ? "Request Service" : product.listing_type === "idea" ? "Back Idea" : "Add to Cart"}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
