"use client";
import { useState } from "react";
import { Facebook, Link2, Share2, Check } from "lucide-react";

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {}
    } else {
      copy();
    }
  };

  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const zalo = `https://zalo.me/share/?u=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 mr-1">Chia sẻ:</span>
      <a href={fb} target="_blank" rel="noopener noreferrer" aria-label="Chia sẻ Facebook"
        className="p-2 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 transition-colors">
        <Facebook size={16} />
      </a>
      <a href={zalo} target="_blank" rel="noopener noreferrer" aria-label="Chia sẻ Zalo"
        className="p-2 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 transition-colors text-xs font-bold w-8 h-8 flex items-center justify-center">
        Zalo
      </a>
      <button onClick={copy} aria-label="Sao chép liên kết"
        className="p-2 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 transition-colors">
        {copied ? <Check size={16} /> : <Link2 size={16} />}
      </button>
      <button onClick={nativeShare} aria-label="Chia sẻ"
        className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors sm:hidden">
        <Share2 size={16} />
      </button>
    </div>
  );
}
