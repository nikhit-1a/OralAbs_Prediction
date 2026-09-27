import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence, type Variants } from "framer-motion";

import { AppShell } from "@/components/AppShell";
import { GlassSurface } from "@/components/ui/glass-surface";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/batch")({
  component: BatchPage,
});

type Row = { 
  smiles: string; 
  hia_prob: number; 
  hob_prob: number; 
  hia_domain: boolean;
  hob_domain: boolean;
  status: string 
};

function BatchPage() {
  const [input, setInput] = useState("CN1C=NC2=C1C(=O)N(C)C(=O)N2C\nCC(=O)OC1=CC=CC=C1C(=O)O\nCN(C)C(=N)NC(=N)N");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    if (!rows) return null;
    const ok = rows.filter((r) => r.status === "Success");
    return {
      total: rows.length, valid: ok.length,
      highHia: ok.filter((r) => r.hia_prob >= 0.8).length,
      highHob: ok.filter((r) => r.hob_prob >= 0.7).length,
    };
  }, [rows]);

  const runBatch = async () => {
    const lines = input.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 200);
    if (lines.length === 0) { toast.error("Paste at least one SMILES per line."); return; }
    
    setLoading(true);
    
    // Create CSV content
    const csvContent = "SMILES\n" + lines.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const formData = new FormData();
    formData.append("file", blob, "batch.csv");
    
    try {
      const res = await fetch("http://127.0.0.1:8000/predict_batch", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Batch prediction failed");
      
      const text = await res.text();
      // Parse simple CSV response
      const outputLines = text.split("\n").map(l => l.trim()).filter(Boolean);
      // Skip header
      const dataRows = outputLines.slice(1).map(line => {
        const parts = line.split(",");
        return {
          smiles: parts[0],
          hia_prob: parseFloat(parts[1]) || 0,
          hia_domain: parts[2] === "True",
          hob_prob: parseFloat(parts[3]) || 0,
          hob_domain: parts[4] === "True",
          status: parts[5] || "Unknown"
        };
      });
      setRows(dataRows);
      toast.success("Batch completed successfully");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!rows) return;
    const header = "SMILES,HIA_Probability,HIA_InDomain,HOB_Probability,HOB_InDomain,Status\n";
    const body = rows.map((r) =>
      `${r.smiles},${r.hia_prob},${r.hia_domain},${r.hob_prob},${r.hob_domain},${r.status}`
    ).join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "oralabspredict-batch.csv" });
    a.click();
    URL.revokeObjectURL(url);
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
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6 mt-4">
        
        <motion.div variants={itemVariants} className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">Batch Screening</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Paste one SMILES per line (up to 200) to rank a compound set by predicted HIA and HOB using the backend API.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Input Panel */}
          <motion.div variants={itemVariants}>
            <GlassSurface intensity="high" className="p-6">
              <h2 className="text-lg font-bold mb-2 text-cyan-400">Compound list</h2>
              <p className="text-sm text-muted-foreground mb-4">One SMILES per line.</p>
              
              <Textarea 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                rows={10}
                className="font-mono text-xs bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 resize-none mb-4" 
                aria-label="Batch SMILES input" 
              />
              <LiquidButton onClick={runBatch} disabled={loading} variant="primary" className="w-full">
                {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FlaskConical className="mr-2 size-4" />} 
                {loading ? "Running batch..." : "Run batch prediction"}
              </LiquidButton>
            </GlassSurface>
          </motion.div>

          {/* Results Panel */}
          <motion.div variants={itemVariants} className="space-y-6 lg:col-span-2">
            
            <AnimatePresence mode="popLayout">
              {stats && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                >
                  {[
                    { label: "Structures", value: stats.total, color: "text-foreground" },
                    { label: "Valid", value: stats.valid, color: "text-cyan-400" },
                    { label: "High HIA (≥80%)", value: stats.highHia, color: "text-signal-high" },
                    { label: "High HOB (≥70%)", value: stats.highHob, color: "text-signal-high" },
                  ].map((s) => (
                    <GlassSurface key={s.label} className="p-4 flex flex-col justify-center items-center text-center">
                      <div className={`font-mono text-3xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                    </GlassSurface>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <GlassSurface className="p-6 flex flex-col h-full min-h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Results Table</h3>
                <AnimatePresence>
                  {rows && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <LiquidButton variant="ghost" size="sm" onClick={downloadCsv}>
                        <Download className="mr-2 size-4" /> Download CSV
                      </LiquidButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {rows ? (
                <div className="overflow-x-auto rounded-lg border border-black/5 dark:border-white/5">
                  <Table>
                    <TableHeader className="bg-black/5 dark:bg-white/5">
                      <TableRow className="border-black/10 dark:border-white/10 hover:bg-transparent">
                        <TableHead className="text-muted-foreground">SMILES</TableHead>
                        <TableHead className="text-right text-muted-foreground">HIA (%)</TableHead>
                        <TableHead className="text-right text-muted-foreground">HOB (%)</TableHead>
                        <TableHead className="text-right text-muted-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {rows.map((r, i) => (
                          <motion.tr 
                            key={`${r.smiles}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="border-black/5 dark:border-white/5 hover:bg-black/5 dark:bg-white/5 transition-colors"
                          >
                            <TableCell className="max-w-[200px] truncate font-mono text-xs">{r.smiles}</TableCell>
                            {r.status === "Success" ? (
                              <>
                                <TableCell className="text-right font-mono text-xs text-signal-high">{Math.round(r.hia_prob * 100)}%</TableCell>
                                <TableCell className="text-right font-mono text-xs">{Math.round(r.hob_prob * 100)}%</TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">Success</TableCell>
                              </>
                            ) : (
                              <TableCell colSpan={3} className="text-right text-xs text-destructive">{r.status}</TableCell>
                            )}
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                  <div className="mb-4 rounded-full bg-black/5 dark:bg-white/5 p-4 ring-1 ring-black/10 dark:ring-white/10">
                    <FlaskConical className="size-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Run a batch prediction to see the ranked table here.</p>
                </div>
              )}
            </GlassSurface>

          </motion.div>
        </div>
      </motion.div>
    </AppShell>
  );
}
