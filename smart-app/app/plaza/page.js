"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LandPlot, Store } from "lucide-react";
import { supabaseBrowser } from "../../lib/supabaseClient";

export default function PlazaListPage() {
  const [plazas, setPlazas] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const supabase = supabaseBrowser();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("plazas").select("*").eq("status", "active");
      setPlazas(data || []);
      if (data?.length) {
        const { data: shops } = await supabase.from("shops").select("plaza_id").eq("status", "approved");
        const c = {};
        (shops || []).forEach((s) => { if (s.plaza_id) c[s.plaza_id] = (c[s.plaza_id] || 0) + 1; });
        setCounts(c);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="mb-6">
        <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#B08A3C] mb-1">Sub-Marketplaces</div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-[#16283F] flex items-center gap-2"><LandPlot size={26} /> Plaza</h1>
        <p className="text-sm text-[#5B6472] mt-1 max-w-xl">Curated clusters of shops grouped around a theme, department, or event.</p>
      </div>

      {loading ? (
        <p className="text-sm text-[#8A8478] py-16 text-center">Loading…</p>
      ) : plazas.length === 0 ? (
        <div className="text-center py-20 text-[#8A8478]">
          <LandPlot className="mx-auto mb-3" size={28} />
          <p className="text-sm">No Plaza sub-marketplaces yet — admins can create one from the Admin Console.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plazas.map((p) => (
            <Link key={p.id} href={`/plaza/${p.slug}`} className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="h-28 bg-gradient-to-br from-[#1F3A5C] to-[#16283F] flex items-center justify-center">
                {p.banner_url ? <img src={p.banner_url} className="w-full h-full object-cover" /> : <LandPlot className="text-[#EDE7DA]/40" size={28} />}
              </div>
              <div className="p-4">
                <h3 className="font-display font-bold text-[#16283F]">{p.name}</h3>
                <p className="text-xs text-[#5B6472] mt-1 line-clamp-2">{p.description}</p>
                <p className="text-[11px] text-[#8A7A55] mt-2 flex items-center gap-1"><Store size={12} /> {counts[p.id] || 0} shops</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
