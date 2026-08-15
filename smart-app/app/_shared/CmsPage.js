"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabaseBrowser } from "../../lib/supabaseClient";

export default function CmsPage({ slug }) {
  const [page, setPage] = useState(null);
  const supabase = supabaseBrowser();

  useEffect(() => {
    supabase.from("cms_pages").select("*").eq("slug", slug).single().then(({ data }) => setPage(data));
  }, [slug]);

  if (!page) return <div className="max-w-3xl mx-auto px-4 py-16 text-sm text-[#8A8478]">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
      <div className="bg-[#FBF9F4] border border-[#DED5BE] rounded-2xl p-8">
        <h1 className="font-display text-2xl font-bold text-[#16283F] mb-4">{page.title}</h1>
        <div className="prose-smart">
          <ReactMarkdown>{page.content_md}</ReactMarkdown>
        </div>
        <p className="text-[11px] text-[#A29C89] mt-8 font-mono">Last updated {new Date(page.updated_at).toLocaleDateString()} · editable by Student Mart admin</p>
      </div>
    </div>
  );
}
