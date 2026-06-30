import React from 'react';
import Image from 'next/image';

type LogoVariant = 'monogram' | 'full' | 'symbol' | 'wordmark';

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
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64,
  };

  const pixelSize = sizeMap[size === "xl" ? "xl" : size];
  const wordmarkWidth = {
    sm: 112,
    md: 148,
    lg: 184,
    xl: 224,
  }[size];

  if (variant === 'wordmark' || (variant === 'monogram' && showText)) {
    const symbolSize = { sm: 20, md: 28, lg: 40, xl: 52 }[size];
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <Image
          src="/brand/transparent/trocare-symbol-tc-transparent-256.png"
          alt=""
          width={symbolSize}
          height={symbolSize}
          className="shrink-0 object-contain"
          priority
        />
        <Image
          src="/brand/optimized/trocare-wordmark-navbar.png"
          alt="TrọCare"
          width={wordmarkWidth}
          height={Math.round(wordmarkWidth / 3.55)}
          className="h-auto shrink-0 object-contain"
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
          alt="TroCare Logo"
          width={pixelSize * 4}
          height={pixelSize}
          className="h-auto w-auto object-contain"
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
          alt="TrọCare Symbol"
          width={pixelSize}
          height={pixelSize}
          className="object-contain"
        />
      </div>
    );
  }

  return null;
}
