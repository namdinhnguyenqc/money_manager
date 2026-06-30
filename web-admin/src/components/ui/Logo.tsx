import React from 'react';
import Image from 'next/image';

type LogoVariant = 'monogram' | 'full' | 'symbol' | 'wordmark';

// Full logo dimensions: 420x135 → ratio ≈ 3.11
const FULL_LOGO_RATIO = 420 / 135;

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
  const heightMap = { sm: 28, md: 36, lg: 48, xl: 60 };
  const symbolSizeMap = { sm: 28, md: 36, lg: 48, xl: 60 };

  const h = heightMap[size];
  const symbolSize = symbolSizeMap[size];
  const fullLogoWidth = Math.round(h * FULL_LOGO_RATIO);

  if (variant === 'wordmark' || (variant === 'monogram' && showText)) {
    return (
      <div className={`trocare-logo-wordmark inline-flex items-center ${className}`}>
        <Image
          src="/brand/optimized/trocare-logo-full-navbar.png"
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

  if (variant === 'full') {
    return (
      <div className={`flex items-center ${className}`}>
        <Image
          src="/brand/optimized/trocare-logo-full-navbar.png"
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
