"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShieldCheck, Store } from "lucide-react";
import { supabaseBrowser } from "../../../lib/supabaseClient";

export default function PlazaDetailPage() {
  const { slug } = useParams();
  const [plaza, setPlaza] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = supabaseBrowser();

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("plazas").select("*").eq("slug", slug).single();
      setPlaza(p);
      if (p) {
        const { data: s } = await supabase.from("shops").select("*").eq("plaza_id", p.id).eq("status", "approved");
        setShops(s || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-16 text-sm text-[#8A8478]">Loading…</div>;
  if (!plaza) return <div className="max-w-6xl mx-auto px-4 py-16 text-sm text-[#8A8478]">Plaza not found.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-[#16283F]">{plaza.name}</h1>
        <p className="text-sm text-[#5B6472] mt-1 max-w-xl">{plaza.description}</p>
      </div>
      {shops.length === 0 ? (
        <p className="text-sm text-[#8A8478] py-12 text-center">No approved shops in this Plaza yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((s) => (
            <Link key={s.id} href={`/shop/${s.slug}`} className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-4 flex items-center gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <img src={s.logo_url} alt={s.name} className="w-14 h-14 rounded-xl object-cover border border-[#DED5BE]" />
              <div className="min-w-0">
                <h3 className="font-display font-bold text-[#16283F] flex items-center gap-1 truncate"><ShieldCheck size={14} className="text-[#D9A441] shrink-0" /> {s.name}</h3>
                <p className="text-xs text-[#5B6472] line-clamp-2">{s.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
