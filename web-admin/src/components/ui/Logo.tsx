"use client";
import Image from 'next/image';

/**
 * TroCareLogo — single source of truth for the brand logo.
 * Renders: [gradient-square icon] [TroCare bold] [QUẢN LÝ TRỌ THÔNG MINH tagline]
 * Same output everywhere: admin, owner workspace, landing page.
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/transparent/trocare-symbol-tc-transparent-256.png"
        alt=""
        width={40}
        height={40}
        className="shrink-0"
        style={{ width: 40, height: 40 }}
        priority
      />
      <div className="flex flex-col justify-center leading-none">
        <span className="text-[18px] font-black tracking-tight text-slate-900 leading-tight">
          Tro<span className="text-blue-600">Care</span>
        </span>
        <span className="text-[9px] font-bold tracking-widest text-blue-500 uppercase mt-0.5">
          Quản lý trọ thông minh
        </span>
      </div>
    </div>
  );
}
