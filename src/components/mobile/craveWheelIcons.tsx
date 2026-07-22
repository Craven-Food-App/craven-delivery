import type { SVGProps } from 'react';

/** Icon-scale milk gallon jug (not a photo). */
export function MilkGallonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      {/* Handle */}
      <path
        d="M42 26c6 0 10 4 10 10v4c0 2.2-1.8 4-4 4h-2"
        stroke="#CBD5E1"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cap */}
      <rect x="22" y="6" width="20" height="7" rx="2" fill="#E2E8F0" />
      <rect x="24" y="4" width="16" height="4" rx="1.5" fill="#F8FAFC" />
      {/* Neck */}
      <path d="M26 13h12l2 6H24l2-6z" fill="#F1F5F9" />
      {/* Body */}
      <path
        d="M18 22c0-2 1.5-3 3.5-3h21c2 0 3.5 1 3.5 3v30c0 4-3 7-7 7H25c-4 0-7-3-7-7V22z"
        fill="#FFFFFF"
        stroke="#E2E8F0"
        strokeWidth="1.5"
      />
      {/* Label band */}
      <rect x="20" y="32" width="24" height="14" rx="2" fill="#FF6B35" />
      <rect x="23" y="35" width="18" height="3" rx="1" fill="#FFFFFF" opacity="0.9" />
      <rect x="26" y="40" width="12" height="2.5" rx="1" fill="#FFFFFF" opacity="0.55" />
      {/* Soft highlight */}
      <path
        d="M22 24c0-1 1-2 2-2h4c1.5 8 1.5 18 0 26h-3c-1.5 0-3-1.5-3-4V24z"
        fill="#FFFFFF"
        opacity="0.35"
      />
    </svg>
  );
}
