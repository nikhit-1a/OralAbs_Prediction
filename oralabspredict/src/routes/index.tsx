import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ArrowRight, Copy, Sparkles, TriangleAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import heroImg from "@/assets/hero-molecules.jpg";
import { MoleculeViewer3D } from "@/components/MoleculeViewer3D";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { EXAMPLES, isValidSmiles, predict, type Prediction } from "@/lib/predict";

export const Route = createFileRoute("/")({
  component: Index,
});

function band(p: number, high: string, mid: string, low: string) {
  return p >= 0.7 ? high : p >= 0.4 ? mid : low;
}

function ProbabilityBar({ label, p }: { label: string; p: number }) {
  const pct = Math.round(p * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-2xl font-semibold text-primary">{pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-gradient-signal transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{band(p, "High", "Moderate", "Low")} probability</p>
    </div>
  );
}

const DESCRIPTOR_ROWS: { key: keyof Prediction["descriptors"]; label: string; unit: string; help: string }[] = [
  { key: "mw", label: "Molecular weight", unit: "Da", help: "Rule-of-5 limit: 500" },
  { key: "logp", label: "cLogP", unit: "", help: "Lipophilicity; sweet spot 0–5" },
  { key: "hbd", label: "H-bond donors", unit: "", help: "Rule-of-5 limit: 5" },
  { key: "hba", label: "H-bond acceptors", unit: "", help: "Rule-of-5 limit: 10" },
  { key: "tpsa", label: "Polar surface area", unit: "Å²", help: "HIA falls sharply above ~90" },
  { key: "rotb", label: "Rotatable bonds", unit: "", help: "Veber limit: 10" },
  { key: "rings", label: "Ring count", unit: "", help: "Total ring closures" },
  { key: "heavyAtoms", label: "Heavy atoms", unit: "", help: "Non-hydrogen atoms" },
];

function Index() {
  const [smiles, setSmiles] = useState("CN1C=NC2=C1C(=O)N(C)C(=O)N2C");
  const [submitted, setSubmitted] = useState(smiles);
  
  const isValid = isValidSmiles(submitted);

  const { data: result, isLoading, error } = useQuery<Prediction>({
    queryKey: ["predict", submitted],
    queryFn: () => predict(submitted),
    enabled: isValid && submitted.trim() !== "",
    retry: false
  });

  const invalid = submitted.trim() !== "" && !isValid;

  const run = (s: string) => { setSmiles(s); setSubmitted(s); };

  return (
    <AppShell>
      <section className="relative mb-10 overflow-hidden rounded-2xl border border-border/60 shadow-panel">
        <img src={heroImg} alt="Glowing molecular network visualization" className="absolute inset-0 size-full object-cover opacity-45" />
        <div className="relative bg-gradient-to-r from-background/90 via-background/70 to-background/20 px-6 py-14 sm:px-12 sm:py-20">
          <Badge variant="secondary" className="mb-4 font-mono text-[11px] uppercase tracking-widest text-primary">
            ADME · QSAR framework
          </Badge>
          <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Predict oral absorption from a <span className="text-primary">chemical structure</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            OralAbsPredict estimates <strong className="text-foreground">human intestinal absorption (HIA)</strong> and{" "}
            <strong className="text-foreground">human oral bioavailability (HOB)</strong> using a Python backend API.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 shadow-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" /> Structure input
            </CardTitle>
            <CardDescription>Enter a SMILES string, or start from an example compound.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={(e) => { e.preventDefault(); setSubmitted(smiles); }} className="space-y-3">
              <div className="flex gap-2">
                <Input value={smiles} onChange={(e) => setSmiles(e.target.value)}
                  placeholder="e.g. CC(=O)OC1=CC=CC=C1C(=O)O" className="font-mono text-sm" aria-label="SMILES string" />
                <Button type="submit" className="shrink-0 shadow-glow" disabled={isLoading}>
                  {isLoading ? <Loader2 className="ml-1 size-4 animate-spin" /> : <>Predict <ArrowRight className="ml-1 size-4" /></>}
                </Button>
              </div>
              {invalid && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <TriangleAlert className="size-3.5" /> This doesn't look like a valid SMILES string.
                </p>
              )}
            </form>
            <Separator />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Examples</p>
            <div className="space-y-1.5">
              {EXAMPLES.map((ex) => (
                <button key={ex.name} onClick={() => run(ex.smiles)}
                  className="group flex w-full items-center justify-between rounded-md border border-border/60 bg-secondary/40 px-3 py-2 text-left transition-colors hover:border-primary/50 hover:bg-secondary">
                  <div>
                    <div className="text-sm font-medium">{ex.name}</div>
                    <div className="text-xs text-muted-foreground">{ex.note}</div>
                  </div>
                  <span className="max-w-28 truncate font-mono text-[10px] text-muted-foreground group-hover:text-primary">
                    {ex.smiles}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-3">
          {error ? (
             <Card className="flex min-h-64 items-center justify-center shadow-panel border-destructive">
               <p className="max-w-xs text-center text-sm text-destructive">
                 Failed to predict: {error.message}
               </p>
             </Card>
          ) : isLoading ? (
             <Card className="flex min-h-64 items-center justify-center shadow-panel">
               <Loader2 className="size-8 animate-spin text-muted-foreground" />
             </Card>
          ) : result ? (
            <>
              <Card className="shadow-panel">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">3D Molecular Structure</CardTitle>
                  <CardDescription>Interactive 3D model generated by the backend engine.</CardDescription>
                </CardHeader>
                <CardContent>
                  <MoleculeViewer3D smiles={result.smiles} />
                </CardContent>
              </Card>

              <Card className="shadow-panel">
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">Prediction results</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        confidence {Math.round(result.confidence * 100)}%
                      </Badge>
                      <Button variant="ghost" size="sm"
                        onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); toast.success("Result copied as JSON"); }}>
                        <Copy className="size-3.5" /> Copy
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="break-all font-mono text-xs">{result.smiles}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-secondary/30 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">HIA · Intestinal absorption</p>
                    <ProbabilityBar label={result.hia.label} p={result.hia.probability} />
                    <div className="mt-4 text-xs text-muted-foreground">
                      <p><strong>Model:</strong> {result.hia.model_used}</p>
                      <p><strong>AD:</strong> {result.hia.ad_info.explanation}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-secondary/30 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">HOB · Oral bioavailability</p>
                    <ProbabilityBar label={result.hob.label} p={result.hob.probability} />
                    <div className="mt-4 text-xs text-muted-foreground">
                      <p><strong>Model:</strong> {result.hob.model_used}</p>
                      <p><strong>AD:</strong> {result.hob.ad_info.explanation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-panel">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Physicochemical profile</CardTitle>
                  <CardDescription>Descriptors estimated from the structure.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {DESCRIPTOR_ROWS.map(({ key, label, unit, help }) => (
                    <div key={key} className="rounded-md border border-border/60 bg-secondary/30 p-3" title={help}>
                      <div className="font-mono text-lg font-semibold text-foreground">
                        {result.descriptors[key]}
                        {unit && <span className="ml-1 text-xs text-muted-foreground">{unit}</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-panel">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Drug-likeness screening</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={result.lipinskiViolations.length === 0 ? "secondary" : "destructive"}
                      className={result.lipinskiViolations.length === 0 ? "text-signal-high" : ""}>
                      Lipinski rule of 5: {result.lipinskiViolations.length === 0 ? "pass" : `${result.lipinskiViolations.length} violation${result.lipinskiViolations.length > 1 ? "s" : ""}`}
                    </Badge>
                    <Badge variant={result.veberViolations.length === 0 ? "secondary" : "destructive"}
                      className={result.veberViolations.length === 0 ? "text-signal-high" : ""}>
                      Veber rules: {result.veberViolations.length === 0 ? "pass" : `${result.veberViolations.length} violation${result.veberViolations.length > 1 ? "s" : ""}`}
                    </Badge>
                  </div>
                  {(result.lipinskiViolations.length > 0 || result.veberViolations.length > 0 || result.flags.length > 0) && (
                    <ul className="space-y-1.5">
                      {[...result.lipinskiViolations, ...result.veberViolations, ...result.flags].map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-signal-mid" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Progress value={result.confidence * 100} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">Heuristic confidence metric based on physicochemical boundaries.</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="flex min-h-64 items-center justify-center shadow-panel">
              <p className="max-w-xs text-center text-sm text-muted-foreground">
                {invalid ? "Fix the SMILES string above to see predictions." : "Enter a SMILES string and press Predict to see HIA and HOB estimates."}
              </p>
            </Card>
          )}
        </div>
      </section>
    </AppShell>
  );
}
