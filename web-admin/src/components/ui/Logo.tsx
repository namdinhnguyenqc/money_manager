import React from 'react';
import Image from 'next/image';

type LogoVariant = 'monogram' | 'full' | 'symbol' | 'wordmark';

export default function Logo({ 
  className = "", 
  showText = true, 
  textClassName = "text-xl",
  size = "md",
  variant = "monogram"
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
          src="/brand/transparent/trocare-symbol-tc-transparent-256.png" 
          alt="TroCare Symbol"
          width={pixelSize}
          height={pixelSize}
          className="object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="shrink-0">
        <Image 
          src="/brand/transparent/trocare-symbol-tc-transparent-128.png" 
          alt="TroCare"
          width={pixelSize}
          height={pixelSize}
          className="object-contain"
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`tracking-tight ${textClassName} font-medium`}>
            <span className="text-[#0F172A]">Tro</span>
            <span className="text-[#2563EB] font-black">Care</span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 -mt-0.5">
            Quản lý trọ thông minh
          </span>
        </div>
      )}
    </div>
  );
}
