import React from 'react';
import Image from 'next/image';

type LogoVariant = 'monogram' | 'full' | 'symbol' | 'wordmark';

export default function Logo({ 
  className = "", 
  showText = true, 
  textClassName = "text-xl",
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

  if (variant === 'wordmark' || (variant === 'monogram' && showText)) {
    return (
      <div className={`flex items-center ${className}`}>
        <Image
          src="/brand/optimized/trocare-logo-full-navbar.png"
          alt="TrọCare"
          width={190}
          height={61}
          className="h-auto object-contain"
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
