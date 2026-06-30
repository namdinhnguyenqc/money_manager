import React from 'react';
import Image from 'next/image';

type LogoVariant = 'monogram' | 'full' | 'symbol' | 'wordmark';

// Full logo dimensions: 2000x640 → ratio ≈ 3.125
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
  const heightMap = { sm: 28, md: 36, lg: 48, xl: 60 };
  const symbolSizeMap = { sm: 28, md: 36, lg: 48, xl: 60 };

  const h = heightMap[size];
  const symbolSize = symbolSizeMap[size];
  const fullLogoWidth = Math.round(h * FULL_LOGO_RATIO);

  if (variant === 'wordmark' || (variant === 'monogram' && showText)) {
    return (
      <div className={`trocare-logo-wordmark inline-flex items-center ${className}`}>
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

  return null;
}
