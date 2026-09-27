import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ArrowRight, Copy, Sparkles, TriangleAlert, Loader2, SplitSquareHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";

import { MoleculeViewer3D } from "@/components/MoleculeViewer3D";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { EXAMPLES, isValidSmiles, predict, type Prediction } from "@/lib/predict";
import { GlassSurface } from "@/components/ui/glass-surface";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
});

function band(p: number, high: string, mid: string, low: string) {
  return p >= 0.7 ? high : p >= 0.4 ? mid : low;
}

function LiquidProgressBar({ p, colorClass }: { p: number; colorClass: string }) {
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${p * 100}%` }}
        transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
        className={cn("absolute inset-y-0 left-0 rounded-full", colorClass)}
      >
        {/* Shimmer effect inside the bar */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-[200%] animate-[shimmer_2s_infinite]" />
      </motion.div>
    </div>
  );
}

const DESCRIPTOR_ROWS = [
  { key: "mw", label: "Molecular weight", unit: "Da", help: "Rule-of-5 limit: 500", limit: 500 },
  { key: "logp", label: "cLogP", unit: "", help: "Lipophilicity; sweet spot 0–5", limit: 5 },
  { key: "hbd", label: "H-bond donors", unit: "", help: "Rule-of-5 limit: 5", limit: 5 },
  { key: "hba", label: "H-bond acceptors", unit: "", help: "Rule-of-5 limit: 10", limit: 10 },
  { key: "tpsa", label: "Polar surface area", unit: "Å²", help: "HIA falls sharply above ~90", limit: 140 },
  { key: "rotb", label: "Rotatable bonds", unit: "", help: "Veber limit: 10", limit: 10 },
] as const;

function Index() {
  const [smiles, setSmiles] = useState("");
  const [submitted, setSubmitted] = useState("");
  const navigate = useNavigate();

  const isValid = isValidSmiles(smiles);
  const isSubmittedValid = isValidSmiles(submitted);

  const { data: result, isLoading, error } = useQuery<Prediction>({
    queryKey: ["predict", submitted],
    queryFn: () => predict(submitted),
    enabled: isSubmittedValid && submitted.trim() !== "",
    retry: false
  });

  const invalid = smiles.trim() !== "" && !isValid;

  const typeSMILES = async (s: string) => {
    setSmiles("");
    let current = "";
    for (let i = 0; i < s.length; i++) {
      current += s[i];
      setSmiles(current);
      await new Promise(r => setTimeout(r, 15)); // Typing speed
    }
    setSubmitted(s);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <AppShell>
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-5 mt-4">
        
        {/* Left Column: Input */}
        <motion.div variants={itemVariants} className="lg:col-span-2 flex flex-col gap-6">
          <GlassSurface intensity="high" className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground mb-1">
              <Sparkles className="size-5 text-primary" /> Structure input
            </h2>
            <p className="text-sm text-muted-foreground mb-6">Enter a SMILES string, or pick a sample.</p>
            
            <form onSubmit={(e) => { e.preventDefault(); setSubmitted(smiles); }} className="space-y-4">
              <div className="relative">
                <Input 
                  value={smiles} 
                  onChange={(e) => setSmiles(e.target.value)}
                  placeholder="e.g. CC(=O)OC1=CC=CC=C1C(=O)O" 
                  className={cn(
                    "font-mono text-sm bg-black/10 dark:bg-white/5 border-black/20 dark:border-white/10 transition-shadow duration-300",
                    smiles.length > 0 && isValid && "shadow-[0_0_15px_rgba(34,211,238,0.3)] border-cyan-500/50 dark:border-cyan-400/50",
                    invalid && "shadow-[0_0_15px_rgba(251,113,133,0.3)] border-coral-400/50"
                  )} 
                />
                <AnimatePresence>
                  {invalid && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                      className="absolute -bottom-6 left-0 flex items-center gap-1.5 text-xs text-destructive">
                      <TriangleAlert className="size-3.5" /> Invalid SMILES
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              <LiquidButton type="submit" variant="primary" disabled={isLoading || invalid || !smiles.trim()} className="w-full text-sm h-10">
                {isLoading ? "Analyzing..." : "Predict"}
                {isLoading ? <Loader2 className="ml-2 size-4 animate-spin" /> : <ArrowRight className="ml-2 size-4" />}
              </LiquidButton>
            </form>

            <div className="mt-8">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Examples</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button key={ex.name} onClick={() => typeSMILES(ex.smiles)}
                    className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-black/10 dark:hover:bg-white/10 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] active:scale-95">
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
          </GlassSurface>
        </motion.div>

        {/* Right Column: Results */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {!submitted && !isLoading ? (
               <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                  <GlassSurface className="flex h-full min-h-[400px] flex-col items-center justify-center p-8 text-center opacity-60">
                    <div className="mb-4 rounded-full bg-black/10 dark:bg-white/5 p-4 ring-1 ring-black/10 dark:ring-white/10">
                      <Sparkles className="size-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">The biochemical engine is standing by.<br/>Enter a structure to begin.</p>
                  </GlassSurface>
               </motion.div>
            ) : isLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <GlassSurface className="flex h-full min-h-[400px] flex-col items-center justify-center p-8 text-center">
                  <Loader2 className="mb-4 size-10 animate-spin text-primary drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                  <p className="animate-pulse text-sm text-muted-foreground">Computing ADME properties...</p>
                </GlassSurface>
              </motion.div>
            ) : error ? (
              <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <GlassSurface className="flex min-h-[400px] flex-col items-center justify-center border-destructive/50 bg-destructive/10 p-8 text-center">
                  <TriangleAlert className="mb-4 size-10 text-destructive" />
                  <p className="text-sm text-destructive">{error.message}</p>
                </GlassSurface>
              </motion.div>
            ) : result ? (
              <motion.div key="result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                
                {/* Result Header & 3D */}
                <GlassSurface className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-foreground">{result.name || "Compound"}</h3>
                      <p className="font-mono text-xs text-muted-foreground max-w-sm truncate">{result.smiles}</p>
                    </div>
                    <div className="flex gap-2">
                      <LiquidButton variant="secondary" size="sm" className="px-4" onClick={() => navigate({ to: "/compare", search: { a: result.smiles } })}>
                        Compare with... <SplitSquareHorizontal className="ml-2 size-4" />
                      </LiquidButton>
                      <LiquidButton variant="ghost" size="default" onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); toast.success("Copied"); }}>
                        <Copy className="size-4" />
                      </LiquidButton>
                    </div>
                  </div>
                  <div className="h-[320px] overflow-hidden rounded-xl border border-black/10 dark:border-white/5 bg-black/5 dark:bg-black/20">
                     <MoleculeViewer3D smiles={result.smiles} className="h-full border-0" />
                  </div>
                </GlassSurface>

                {/* Predictions */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <GlassSurface className="p-5 flex flex-col gap-2">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Intestinal Absorption</span>
                      <span className={cn("font-mono text-3xl font-bold", band(result.hia.probability, "text-signal-high", "text-signal-mid", "text-signal-low"))}>
                        <CountUp to={result.hia.probability * 100} />%
                      </span>
                    </div>
                    <LiquidProgressBar 
                      p={result.hia.probability} 
                      colorClass={band(result.hia.probability, "bg-signal-high", "bg-signal-mid", "bg-signal-low")} 
                    />
                    <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                      <span>{band(result.hia.probability, "High", "Moderate", "Low")}</span>
                      <span>{result.hia.label}</span>
                    </div>
                  </GlassSurface>

                  <GlassSurface className="p-5 flex flex-col gap-2">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bioavailability</span>
                      <span className={cn("font-mono text-3xl font-bold", band(result.hob.probability, "text-signal-high", "text-signal-mid", "text-signal-low"))}>
                        <CountUp to={result.hob.probability * 100} />%
                      </span>
                    </div>
                    <LiquidProgressBar 
                      p={result.hob.probability} 
                      colorClass={band(result.hob.probability, "bg-signal-high", "bg-signal-mid", "bg-signal-low")} 
                    />
                    <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                      <span>{band(result.hob.probability, "High", "Moderate", "Low")}</span>
                      <span>{result.hob.label}</span>
                    </div>
                  </GlassSurface>
                </div>

                {/* Descriptors */}
                <GlassSurface className="p-6">
                  <h4 className="text-sm font-semibold mb-4">Physicochemical Profile</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {DESCRIPTOR_ROWS.map(({ key, label, unit, limit, help }) => {
                      const val = result.descriptors[key as keyof Prediction["descriptors"]];
                      const isViolation = typeof val === 'number' && val > limit;
                      return (
                        <div key={key} title={help}
                          className={cn(
                            "group relative overflow-hidden rounded-lg border p-3 transition-colors",
                            isViolation ? "border-destructive/30 bg-destructive/10" : "border-black/10 dark:border-white/5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                          )}>
                          <div className={cn("font-mono text-xl font-medium", isViolation ? "text-destructive" : "text-foreground")}>
                            {val} <span className="text-xs opacity-50">{unit}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Violations */}
                  {(result.lipinskiViolations.length > 0 || result.veberViolations.length > 0) && (
                    <div className="mt-6 space-y-2 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                      {[...result.lipinskiViolations, ...result.veberViolations].map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                          <AlertTriangle className="size-4 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassSurface>

              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
