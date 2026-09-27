"use client"

import * as React from "react"
import { motion, useMotionTemplate, useMotionValue, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

export interface LiquidButtonProps extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  variant?: "primary" | "secondary" | "destructive" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
  children?: React.ReactNode
}

export const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  ({ className, variant = "primary", size = "default", children, ...props }, ref) => {
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
      const { left, top } = currentTarget.getBoundingClientRect()
      mouseX.set(clientX - left)
      mouseY.set(clientY - top)
    }

    // Color logic
    const baseColor =
      variant === "primary" ? "rgba(34, 211, 238, 0.5)" : // Cyan
        variant === "destructive" ? "rgba(251, 113, 133, 0.5)" : // Coral
          variant === "secondary" ? "rgba(167, 139, 250, 0.5)" : // Violet
            "rgba(255, 255, 255, 0.1)";

    return (
      <motion.button
        ref={ref}
        onMouseMove={handleMouseMove}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          {
            "h-10 px-6 py-2": size === "default",
            "h-8 px-4 text-xs": size === "sm",
            "h-12 px-8 text-lg": size === "lg",
            "size-10": size === "icon",
          },
          className
        )}
        style={{
          background: variant === "ghost" ? "transparent" : "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          color: "var(--foreground)",
        }}
        {...props}
      >
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-full opacity-0 transition duration-300 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                100px circle at ${mouseX}px ${mouseY}px,
                ${baseColor},
                transparent 80%
              )
            `,
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
        <span className="relative z-10 flex items-center justify-center gap-2 w-full">{children}</span>
      </motion.button>
    )
  }
)
LiquidButton.displayName = "LiquidButton"

// MetalButton proxy for backward compatibility if it's used elsewhere
export const MetalButton = LiquidButton
