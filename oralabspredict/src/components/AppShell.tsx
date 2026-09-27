import { Atom, Beaker } from "lucide-react";
import type { ReactNode } from "react";
import { LiquidNavbar } from "./ui/liquid-navbar";
import { BiochemicalBackground } from "./BiochemicalBackground";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-transparent text-foreground relative z-10">
      <BiochemicalBackground />
      <LiquidNavbar />
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pt-24 pb-8 sm:px-6 sm:pb-10">
        {children}
      </main>
      <footer className="relative z-10 border-t border-border/60 bg-background/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Atom className="size-3.5 text-primary" />
            OralAbsPredict — data-driven ADME prediction
          </div>
          <div className="flex items-center gap-2">
            <Beaker className="size-3.5" />
            Predictions powered by Python backend models
          </div>
        </div>
      </footer>
    </div>
  );
}
