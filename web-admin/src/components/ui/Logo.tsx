import React from 'react';
import Image from 'next/image';

type LogoVariant = 'monogram' | 'full' | 'symbol' | 'wordmark';

// Logo = gradient-square icon + "TroCare" bold + "QUẢN LÝ TRỌ THÔNG MINH" tagline
// Matches admin panel design exactly.
// symbol/monogram(!showText) = TC transparent lettermark only (no bg square)

const iconSizeMap: Record<string, number> = { sm: 28, md: 36, lg: 48, xl: 60 };
const textSizeMap: Record<string, { name: string; tag: string }> = {
  sm: { name: 'text-[15px]', tag: 'text-[8px]' },
  md: { name: 'text-[19px]', tag: 'text-[9px]' },
  lg: { name: 'text-[24px]', tag: 'text-[10px]' },
  xl: { name: 'text-[30px]', tag: 'text-[12px]' },
};

export default function Logo({
  className = "",
  showText = true,
  textClassName = "",
  size = "md",
  variant = "wordmark"
}: {
  className?: string,
  showText?: boolean,
  textClassName?: string,
  size?: "sm" | "md" | "lg" | "xl",
  variant?: LogoVariant
}) {
  const iconSize = iconSizeMap[size];
  const { name: nameSize, tag: tagSize } = textSizeMap[size];

  // wordmark / full / monogram+text → compose: gradient icon + text + tagline
  if (variant === 'wordmark' || variant === 'full' || (variant === 'monogram' && showText)) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <Image
          src="/brand/app-icons/app-icon-gradient-256.png"
          alt=""
          width={iconSize}
          height={iconSize}
          className="shrink-0 object-contain rounded-xl"
          style={{ width: iconSize, height: iconSize, minWidth: iconSize }}
          priority
        />
        <div className="flex flex-col justify-center leading-none">
          <span className={`font-black tracking-tight text-slate-900 leading-tight ${nameSize} ${textClassName}`}>
            Tro<span className="text-blue-600">Care</span>
          </span>
          <span className={`font-bold tracking-widest text-blue-500 uppercase leading-tight mt-0.5 ${tagSize}`}>
            Quản lý trọ thông minh
          </span>
        </div>
      </div>
    );
  }

  // symbol / monogram(!showText) → TC transparent lettermark, no bg square
  const symbolSize = iconSizeMap[size];
  return (
    <div className={`inline-flex items-center ${className}`}>
      <Image
        src="/brand/transparent/trocare-symbol-tc-transparent-256.png"
        alt="TrọCare"
        width={symbolSize}
        height={symbolSize}
        className="object-contain"
        style={{ width: symbolSize, height: symbolSize }}
      />
    </div>
  );
}
