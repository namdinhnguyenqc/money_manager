import React from 'react';

export default function Logo({ 
  className = "", 
  showText = true, 
  textClassName = "text-xl",
  size = "md"
}: { 
  className?: string, 
  showText?: boolean, 
  textClassName?: string,
  size?: "sm" | "md" | "lg" 
}) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-16 h-16",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={sizeClasses[size]}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
        <defs>
          <linearGradient id="trocareGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1D8FE1" />
            <stop offset="100%" stopColor="#24C7A6" />
          </linearGradient>
        </defs>
        
        {/* Heart/Leaf Symbol */}
        <path
          d="M50 85 C50 85, 20 60, 20 40 A15 15 0 0 1 50 30 A15 15 0 0 1 80 40 C80 60, 50 85, 50 85 Z"
          fill="url(#trocareGradient)"
          opacity="0.9"
        />
        {/* Hand/Support Curve Left */}
        <path
          d="M15 55 C10 70, 30 85, 45 90 C35 80, 25 70, 25 50 Z"
          fill="#1D8FE1"
        />
        {/* Hand/Support Curve Right */}
        <path
          d="M85 55 C90 70, 70 85, 55 90 C65 80, 75 70, 75 50 Z"
          fill="#24C7A6"
        />
      </svg>
      </div>
      {showText && (
        <span className={`font-black tracking-tight ${textClassName}`}>
          <span className="text-[#1D8FE1]">Trọ</span>
          <span className="text-[#24C7A6]">Care</span>
        </span>
      )}
    </div>
  );
}
