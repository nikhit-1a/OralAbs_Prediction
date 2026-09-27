import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  intensity?: "low" | "medium" | "high";
  withGlare?: boolean;
}

export const GlassSurface = React.forwardRef<HTMLDivElement, GlassSurfaceProps>(
  ({ className, children, intensity = "medium", withGlare = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl glass-panel",
          className
        )}
        {...props}
      >
        {withGlare && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        )}
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);
GlassSurface.displayName = "GlassSurface";

// Render this once in the app root to provide the SVG filter for chromium refraction.
export function GlassFilterDef() {
  return (
    <svg className="hidden h-0 w-0" aria-hidden="true">
      <defs>
        <filter id="liquid-glass-refraction" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0" in="noise" result="coloredNoise" />
          <feDisplacementMap in="SourceGraphic" in2="coloredNoise" scale="8" xChannelSelector="R" yChannelSelector="G" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="12" result="blurred" />
          <feComponentTransfer in="blurred" result="tinted">
            <feFuncR type="linear" slope="1.1" />
            <feFuncG type="linear" slope="1.1" />
            <feFuncB type="linear" slope="1.1" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="tinted" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
