"use client";
import Image from 'next/image';

/**
 * TroCareLogo — single source of truth for the brand logo.
 * Renders: [gradient-square icon] [TroCare bold] [QUẢN LÝ TRỌ THÔNG MINH tagline]
 * Same output everywhere: admin, owner workspace, landing page.
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <Image
        src="/brand/transparent/trocare-symbol-tc-transparent-256.png"
        alt=""
        width={52}
        height={52}
        className="shrink-0"
        style={{ width: 52, height: 52 }}
        priority
      />
      <div className="flex flex-col justify-center leading-none">
        <span className="text-[21px] font-bold tracking-[-0.02em] text-slate-900 leading-tight" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          Tro<span className="text-blue-600">Care</span>
        </span>
        <span className="text-[9.5px] font-semibold tracking-[0.12em] text-blue-500 uppercase mt-[3px]" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          Quản lý trọ thông minh
        </span>
      </div>
    </div>
  );
}
