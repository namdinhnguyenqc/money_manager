import React from 'react';
import Image from 'next/image';

type LogoVariant = 'monogram' | 'full' | 'symbol' | 'wordmark';

// Logo design decision (do not change without discussion):
// - wordmark/monogram: app-icon-gradient (blue rounded square) + trocare-wordmark-navbar.png
// - symbol: app-icon-gradient only
// - full: trocare-logo-full-transparent-2000.png (with tagline, only for landing hero)
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
  const heightMap = { sm: 44, md: 56, lg: 72, xl: 88 };
  const symbolSizeMap = { sm: 44, md: 56, lg: 72, xl: 88 };

  const h = heightMap[size];
  const symbolSize = symbolSizeMap[size];
  const fullLogoWidth = Math.round(h * FULL_LOGO_RATIO);

  if (variant === 'wordmark' || (variant === 'monogram' && showText)) {
    const iconSize = { sm: 28, md: 34, lg: 44, xl: 56 }[size];
    const wmarkWidth = { sm: 100, md: 128, lg: 162, xl: 200 }[size];
    return (
      <div className={`trocare-logo-wordmark inline-flex items-center gap-2 ${className}`}>
        <Image
          src="/brand/app-icons/app-icon-gradient-256.png"
          alt=""
          width={iconSize}
          height={iconSize}
          className="shrink-0 object-contain rounded-xl"
          style={{ width: iconSize, height: iconSize, minWidth: iconSize }}
          priority
        />
        <Image
          src="/brand/optimized/trocare-wordmark-navbar.png"
          alt="TrọCare"
          width={wmarkWidth}
          height={Math.round(wmarkWidth / 3.55)}
          className="trocare-logo-text h-auto shrink-0 object-contain"
          priority
        />
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-center ${className}`}>
        <Image
          src="/brand/transparent/trocare-logo-full-transparent-2000.png"
          alt="TrọCare"
          width={fullLogoWidth}
          height={h}
          className="h-auto w-auto object-contain"
          style={{ height: h, width: "auto" }}
          priority
        />
      </div>
    );
  }

  if (variant === 'symbol' || (variant === 'monogram' && !showText)) {
    return (
      <div className={`flex items-center ${className}`}>
        <Image
          src="/brand/app-icons/app-icon-gradient-256.png"
          alt="TrọCare"
          width={symbolSize}
          height={symbolSize}
          className="object-contain rounded-xl"
          style={{ width: symbolSize, height: symbolSize }}
        />
      </div>
    );
  }

  return null;
}
