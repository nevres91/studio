import React from 'react';

export function PuckPalLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      aria-label="PuckPal Logo"
      {...props}
    >
      <circle cx="50" cy="50" r="45" fill="currentColor" />
      <path
        d="M30 70 Q50 40 70 70"
        stroke="hsl(var(--background))" 
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="50" cy="30" r="8" fill="hsl(var(--background))" />
      <line 
        x1="25" y1="50" x2="75" y2="50" 
        stroke="hsl(var(--background))" 
        strokeWidth="6" 
        strokeLinecap="round"
      />
    </svg>
  );
}
