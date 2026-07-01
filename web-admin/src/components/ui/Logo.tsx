import React from 'react';
import Image from 'next/image';

type LogoVariant = 'monogram' | 'full' | 'symbol' | 'wordmark';

// Logo assets:
// - wordmark / full: trocare-logo-full-transparent-2000.png (Tc symbol + TroCare + tagline)
// - symbol / monogram(!showText): trocare-symbol-tc-transparent-256.png (TC lettermark, no bg)
// ratio of full logo: 2000×640 → 3.125
const FULL_LOGO_RATIO = 2000 / 640;

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
  // height of the full logo in px
  const heightMap: Record<string, number> = { sm: 36, md: 44, lg: 56, xl: 72 };
  const h = heightMap[size];
  const w = Math.round(h * FULL_LOGO_RATIO);

  // size of TC-only symbol
  const symbolMap: Record<string, number> = { sm: 28, md: 36, lg: 48, xl: 64 };
  const symbolSize = symbolMap[size];

  if (variant === 'wordmark' || variant === 'full' || (variant === 'monogram' && showText)) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <Image
          src="/brand/transparent/trocare-logo-full-transparent-2000.png"
          alt="TrọCare"
          width={w}
          height={h}
          className="h-auto w-auto object-contain"
          style={{ height: h, width: 'auto', maxWidth: w }}
          priority
        />
      </div>
    );
  }

  // symbol / monogram without text → TC lettermark only (transparent, no bg square)
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
