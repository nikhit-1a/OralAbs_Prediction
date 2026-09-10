import { Link } from "@tanstack/react-router";
import { Atom, Beaker, FlaskConical } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Predictor" },
  { to: "/batch", label: "Batch" },
  { to: "/method", label: "Method" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-gradient-lab" aria-hidden />
      <header className="relative z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-glow">
              <FlaskConical className="size-4.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              OralAbs<span className="text-primary">Predict</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: true }}
                activeProps={{ className: "rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-primary" }}
                inactiveProps={{ className: "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
      <footer className="relative z-10 border-t border-border/60">
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
