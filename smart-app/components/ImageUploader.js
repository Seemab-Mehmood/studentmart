"use client";

import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabaseBrowser } from "../lib/supabaseClient";

export default function ImageUploader({ bucket, images, onChange, multiple = true, label = "Upload images" }) {
  const [uploading, setUploading] = useState(false);
  const supabase = supabaseBrowser();

  const handleFiles = async (fileList) => {
    setUploading(true);
    const files = Array.from(fileList);
    const uploaded = [];
    for (const file of files) {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
    }
    onChange(multiple ? [...images, ...uploaded] : uploaded.length ? [uploaded[0]] : images);
    setUploading(false);
  };

  const removeAt = (idx) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="border-2 border-dashed border-[#DED5BE] rounded-xl py-6 flex flex-col items-center gap-2 text-[#8A8478] cursor-pointer hover:border-[#1F3A5C] transition-colors">
        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
        <span className="text-xs">{uploading ? "Uploading…" : label}</span>
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          onChange={(e) => e.target.files.length && handleFiles(e.target.files)}
        />
      </label>
      {Array.isArray(images) && images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {images.map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#DED5BE]">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeAt(i)} className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
