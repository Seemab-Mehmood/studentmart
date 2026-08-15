"use client";

import Link from "next/link";
import { Star, Eye, ShoppingCart } from "lucide-react";
import Badge from "./Badge";
import { addToCart } from "../lib/cart";

const CATEGORY_LABEL = { physical: "Physical Goods", services: "Freelance / Services", digital: "Digital Products", idea: "Idea Incubator" };

export default function ProductCard({ product, shop }) {
  const price = (product.price_cents / 100).toFixed(2);

  const quickAdd = (e) => {
    e.preventDefault();
    addToCart({
      product_id: product.id,
      shop_id: product.shop_id,
      shop_name: shop?.name || "",
      title: product.title,
      unit_price_cents: product.price_cents,
      image: product.images?.[0] || null,
      listing_type: product.listing_type,
    });
  };

  return (
    <Link href={`/product/${product.id}`} className="group bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl overflow-hidden hover:shadow-[0_8px_24px_-6px_rgba(31,58,92,0.25)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="h-32 bg-gradient-to-br from-[#1F3A5C] to-[#16283F] flex items-center justify-center relative overflow-hidden">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <ShoppingCart className="text-[#EDE7DA]/40" size={28} />
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5 text-[11px] text-white font-mono">
          <Eye size={11} /> {product.view_count || 0}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8A7A55]">{CATEGORY_LABEL[product.listing_type] || CATEGORY_LABEL[product.category] || "Listing"}</div>
        <h3 className="font-display font-semibold text-[#16283F] leading-snug line-clamp-2">{product.title}</h3>
        {shop && <p className="text-xs text-[#5B6472] truncate">{shop.name}</p>}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-xs text-[#8A8478]">{product.order_count || 0} sold</span>
          <span className="font-mono font-bold text-[#16283F]">{product.price_cents === 0 ? "Pitch" : `$${price}`}</span>
        </div>
        <button onClick={quickAdd} className="mt-2 w-full flex items-center justify-center gap-1.5 bg-[#1F3A5C] hover:bg-[#16283F] text-[#EDE7DA] text-xs font-semibold py-2 rounded-lg transition-colors">
          <ShoppingCart size={13} />
          {product.listing_type === "service" ? "Request Service" : product.listing_type === "idea" ? "Back This Idea" : "Add to Cart"}
        </button>
      </div>
    </Link>
  );
}
