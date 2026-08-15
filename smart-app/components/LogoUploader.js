"use client";

import { useState } from "react";
import { Upload, Loader2, Check } from "lucide-react";
import { supabaseBrowser } from "../lib/supabaseClient";

export default function LogoUploader({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const supabase = supabaseBrowser();

  const handleFile = async (file) => {
    setUploading(true);
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("shop-logos").upload(path, file, { upsert: false });
    if (!error) {
      const { data } = supabase.storage.from("shop-logos").getPublicUrl(path);
      onChange(data.publicUrl);
    }
    setUploading(false);
  };

  return (
    <label className="border-2 border-dashed border-[#DED5BE] rounded-xl py-6 flex flex-col items-center gap-2 text-[#8A8478] cursor-pointer hover:border-[#1F3A5C] transition-colors">
      {value ? (
        <img src={value} alt="Shop logo" className="w-14 h-14 rounded-lg object-cover" />
      ) : uploading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <Upload size={18} />
      )}
      <span className="text-xs flex items-center gap-1">
        {value ? <><Check size={12} className="text-[#3F8C5F]" /> Logo uploaded — click to replace</> : uploading ? "Uploading…" : "Upload shop logo (required)"}
      </span>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
    </label>
  );
}
