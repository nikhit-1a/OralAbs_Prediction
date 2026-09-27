import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeftRight, Loader2, Medal } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

import { AppShell } from "@/components/AppShell";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { Badge } from "@/components/ui/badge";
import { MoleculeViewer3D } from "@/components/MoleculeViewer3D";
import { EXAMPLES, predict, isValidSmiles } from "@/lib/predict";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/ui/count-up";

// Get query param for 'a' to prefill slot A
type CompareSearch = { a?: string };

export const Route = createFileRoute("/compare")({
  validateSearch: (search: Record<string, unknown>): CompareSearch => {
    return { a: typeof search.a === "string" ? search.a : undefined };
  },
  component: ComparePage,
});

function ComparePage() {
  const { a: initialA } = Route.useSearch();
  const [smilesA, setSmilesA] = useState(initialA || "");
  const [smilesB, setSmilesB] = useState("");

  const [submittedA, setSubmittedA] = useState(initialA || "");
  const [submittedB, setSubmittedB] = useState("");

  const queryA = useQuery({
    queryKey: ["predict", submittedA],
    queryFn: () => predict(submittedA),
    enabled: isValidSmiles(submittedA) && submittedA.trim() !== "",
  });

  const queryB = useQuery({
    queryKey: ["predict", submittedB],
    queryFn: () => predict(submittedB),
    enabled: isValidSmiles(submittedB) && submittedB.trim() !== "",
  });

  const handleSwap = () => {
    const tempA = smilesA;
    const tempSubA = submittedA;
    setSmilesA(smilesB);
    setSubmittedA(submittedB);
    setSmilesB(tempA);
    setSubmittedB(tempSubA);
  };

  const radarData = useMemo(() => {
    if (!queryA.data && !queryB.data) return [];
    const keys = ["mw", "logp", "hbd", "hba", "tpsa", "rotb"] as const;
    const maxVals = { mw: 500, logp: 5, hbd: 5, hba: 10, tpsa: 140, rotb: 10 };
    
    return keys.map((key) => {
      const valA = queryA.data?.descriptors[key] as number || 0;
      const valB = queryB.data?.descriptors[key] as number || 0;
      // Normalize values to 0-100 for the radar chart based on their limits
      return {
        subject: key.toUpperCase(),
        A: Math.min((valA / maxVals[key]) * 100, 100),
        B: Math.min((valB / maxVals[key]) * 100, 100),
        rawA: valA,
        rawB: valB,
      };
    });
  }, [queryA.data, queryB.data]);

  const winner = useMemo(() => {
    if (!queryA.data || !queryB.data) return null;
    const scoreA = queryA.data.hia.probability + queryA.data.hob.probability - (queryA.data.lipinskiViolations.length * 0.2);
    const scoreB = queryB.data.hia.probability + queryB.data.hob.probability - (queryB.data.lipinskiViolations.length * 0.2);
    if (scoreA === scoreB) return null;
    return scoreA > scoreB ? "A" : "B";
  }, [queryA.data, queryB.data]);

  return (
    <AppShell>
      <div className="flex flex-col gap-8 mt-4">
        
        {/* Top Section: Inputs */}
        <div className="relative flex flex-col lg:flex-row gap-6 items-start w-full">
          {/* Molecule A */}
          <motion.div layout className="flex-1 w-full min-w-0">
            <GlassSurface className="p-5" intensity="high">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-cyan-600 dark:text-cyan-400">Molecule A</span>
                {winner === "A" && <Badge className="bg-primary/20 text-primary border-primary/50"><Medal className="w-3 h-3 mr-1" /> Best Pick</Badge>}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); setSubmittedA(smilesA); }} className="flex flex-col sm:flex-row gap-3">
                <Input value={smilesA} onChange={(e) => setSmilesA(e.target.value)} placeholder="SMILES string A" className="font-mono bg-black/5 dark:bg-black/20 border-black/10 dark:border-white/10" />
                <LiquidButton type="submit" size="default" variant="primary" className="shrink-0">Predict</LiquidButton>
              </form>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button key={ex.name} onClick={() => { setSmilesA(ex.smiles); setSubmittedA(ex.smiles); }}
                    className="rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2.5 py-1 text-[10px] font-medium text-foreground transition-all hover:bg-black/10 dark:hover:bg-white/10">
                    {ex.name}
                  </button>
                ))}
              </div>
            </GlassSurface>
          </motion.div>

          {/* Swap Button */}
          <motion.button 
            layout 
            whileHover={{ scale: 1.1, rotate: 180 }} 
            whileTap={{ scale: 0.9 }}
            onClick={handleSwap}
            className="z-10 mt-14 self-center lg:self-start bg-black/5 dark:bg-white/10 p-3 rounded-full border border-black/10 dark:border-white/20 backdrop-blur-md shadow-glow text-foreground lg:mt-12"
          >
            <ArrowLeftRight className="w-5 h-5" />
          </motion.button>

          {/* Molecule B */}
          <motion.div layout className="flex-1 w-full min-w-0">
            <GlassSurface className="p-5" intensity="high">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-violet-600 dark:text-violet-400">Molecule B</span>
                {winner === "B" && <Badge className="bg-primary/20 text-primary border-primary/50"><Medal className="w-3 h-3 mr-1" /> Best Pick</Badge>}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); setSubmittedB(smilesB); }} className="flex flex-col sm:flex-row gap-3">
                <Input value={smilesB} onChange={(e) => setSmilesB(e.target.value)} placeholder="SMILES string B" className="font-mono bg-black/5 dark:bg-black/20 border-black/10 dark:border-white/10" />
                <LiquidButton type="submit" size="default" variant="secondary" className="shrink-0">Predict</LiquidButton>
              </form>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button key={ex.name} onClick={() => { setSmilesB(ex.smiles); setSubmittedB(ex.smiles); }}
                    className="rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2.5 py-1 text-[10px] font-medium text-foreground transition-all hover:bg-black/10 dark:hover:bg-white/10">
                    {ex.name}
                  </button>
                ))}
              </div>
            </GlassSurface>
          </motion.div>
        </div>

        {/* Middle Section: 3D Viewers & Basic Probabilities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { id: "A", query: queryA, color: "text-cyan-600 dark:text-cyan-400" },
            { id: "B", query: queryB, color: "text-violet-600 dark:text-violet-400" }
          ].map(({ id, query, color }) => (
            <GlassSurface key={id} className="p-0 overflow-hidden flex flex-col h-full min-h-[400px]">
              {query.isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : query.data ? (
                <>
                  {/* Expanded 3D Viewer Space */}
                  <div className="h-[320px] bg-black/5 dark:bg-black/20 border-b border-black/10 dark:border-white/10 relative">
                    <MoleculeViewer3D smiles={query.data.smiles} className="h-[320px] rounded-none border-0" />
                  </div>
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-2">
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Intestinal Absorption</span>
                      <span className={cn("font-mono text-2xl font-bold", color)}><CountUp to={query.data.hia.probability * 100} />%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Oral Bioavailability</span>
                      <span className={cn("font-mono text-2xl font-bold", color)}><CountUp to={query.data.hob.probability * 100} />%</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                  <div className="p-4 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                    <span className={cn("font-bold text-2xl opacity-50", color)}>{id}</span>
                  </div>
                  Waiting for Molecule {id}
                </div>
              )}
            </GlassSurface>
          ))}
        </div>

        {/* Bottom Section: Radar Chart & Rules */}
        {(queryA.data || queryB.data) && (
          <GlassSurface className="p-6 lg:p-8">
            <h3 className="text-xl font-bold mb-8">Physicochemical Comparison</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              {/* Radar Chart */}
              <div className="h-[350px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.15)" strokeOpacity={0.15} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.8)', opacity: 0.9, fontSize: 11, fontWeight: 600 }} />
                    <Radar name="Molecule A" dataKey="A" stroke="#22D3EE" fill="#22D3EE" fillOpacity={0.3} />
                    <Radar name="Molecule B" dataKey="B" stroke="#A78BFA" fill="#A78BFA" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Data Table */}
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b border-black/10 dark:border-white/10 pb-3">
                  <span>Descriptor</span>
                  <span className="text-cyan-600 dark:text-cyan-400 text-right">Molecule A</span>
                  <span className="text-violet-600 dark:text-violet-400 text-right">Molecule B</span>
                </div>
                {radarData.map((row) => (
                  <div key={row.subject} className="grid grid-cols-3 text-sm border-b border-black/5 dark:border-white/5 pb-3 items-center">
                    <span className="font-semibold text-foreground">{row.subject}</span>
                    <span className="font-mono text-right text-muted-foreground">{row.rawA !== undefined ? row.rawA.toFixed(2) : '-'}</span>
                    <span className="font-mono text-right text-muted-foreground">{row.rawB !== undefined ? row.rawB.toFixed(2) : '-'}</span>
                  </div>
                ))}
              </div>

            </div>
          </GlassSurface>
        )}

      </div>
    </AppShell>
  );
}
