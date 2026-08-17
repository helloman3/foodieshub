import React from 'react';

interface FoodieHubLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textColor?: string;
}

export default function FoodieHubLogo({
  className = '',
  size = 36,
  showText = false,
  textColor = 'text-primary',
}: FoodieHubLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* SVG Icon Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-xs"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3E8300" />
            <stop offset="100%" stopColor="#255600" />
          </linearGradient>
          <linearGradient id="logoGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD54F" />
            <stop offset="100%" stopColor="#FF9800" />
          </linearGradient>
        </defs>

        {/* Squircle base */}
        <rect width="100" height="100" rx="26" fill="url(#logoBgGrad)" />
        <rect x="3" y="3" width="94" height="94" rx="23" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.2" fill="none" />

        {/* Golden Cloche Handle */}
        <circle cx="50" cy="30" r="4.5" fill="url(#logoGoldGrad)" />

        {/* White Food Dome / Cloche */}
        <path
          d="M26 62C27.5 47 37.5 36 50 36C62.5 36 72.5 47 74 62H26Z"
          fill="#FFFFFF"
        />

        {/* Golden Base Plate */}
        <rect x="21" y="65" width="58" height="6.5" rx="3.25" fill="url(#logoGoldGrad)" />

        {/* Fork inside dome */}
        <path
          d="M42 46V56M39 46V51C39 52.8 40.3 54 42 54C43.7 54 45 52.8 45 51V46M42 54V59"
          stroke="#2E6A00"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Spoon inside dome */}
        <path
          d="M58 46C55.5 48.5 55 51.5 57 53.5V59M58 46V59"
          stroke="#2E6A00"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Sparkle star top-right */}
        <path
          d="M74 27L75.5 31L79.5 31.5L76.5 34.2L77.3 38.2L74 36L70.7 38.2L71.5 34.2L68.5 31.5L72.5 31L74 27Z"
          fill="url(#logoGoldGrad)"
        />
      </svg>

      {/* Brand Text */}
      {showText && (
        <span className={`font-display font-extrabold tracking-tight text-xl md:text-2xl ${textColor}`}>
          Foodie<span className="text-amber-600">Hub</span>
        </span>
      )}
    </div>
  );
}
