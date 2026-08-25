import React from 'react'

export default function DeltoidLogo({ className = "w-8 h-8", showText = false, textClassName = "text-ink" }) {
  return (
    <div className="flex items-center gap-2.5 select-none inline-flex">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id="deltoid-teal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#529EA3" />
            <stop offset="100%" stopColor="#2C5254" />
          </linearGradient>
          <linearGradient id="deltoid-vital-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E5593F" />
            <stop offset="100%" stopColor="#A8321C" />
          </linearGradient>
          <linearGradient id="deltoid-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1B2A4A" />
            <stop offset="100%" stopColor="#0E1726" />
          </linearGradient>
        </defs>

        {/* Deep Ink Base */}
        <rect width="64" height="64" rx="14" fill="url(#deltoid-bg-grad)" />

        {/* Venous Teal Delta */}
        <polygon points="32,12 52,48 12,48" fill="url(#deltoid-teal-grad)" />

        {/* Negative Space Cutout */}
        <polygon points="32,22 43,43 21,43" fill="url(#deltoid-bg-grad)" />

        {/* Crimson Accent Pulse */}
        <circle cx="32" cy="35" r="3.5" fill="url(#deltoid-vital-grad)" />
      </svg>

      {showText && (
        <span className={`font-display font-bold text-xl tracking-wider ${textClassName}`}>
          DELTOID
        </span>
      )}
    </div>
  )
}
