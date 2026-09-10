import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        // Simple comma split (assuming no commas in smiles or status)
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

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Batch screening</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Paste one SMILES per line (up to 200) to rank a compound set by predicted HIA and HOB using the backend API.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-panel">
          <CardHeader>
            <CardTitle className="text-base">Compound list</CardTitle>
            <CardDescription>One SMILES per line.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={10}
              className="font-mono text-xs" aria-label="Batch SMILES input" />
            <Button onClick={runBatch} disabled={loading} className="w-full shadow-glow">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />} Run batch prediction
            </Button>
          </CardContent>
        </Card>
        <div className="space-y-6 lg:col-span-2">
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Structures", value: stats.total },
                { label: "Valid", value: stats.valid },
                { label: "High HIA (≥80%)", value: stats.highHia },
                { label: "High HOB (≥70%)", value: stats.highHob },
              ].map((s) => (
                <Card key={s.label} className="shadow-panel">
                  <CardContent className="p-4">
                    <div className="font-mono text-2xl font-semibold text-primary">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Card className="shadow-panel">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Results</CardTitle>
              {rows && (
                <Button variant="outline" size="sm" onClick={downloadCsv}>
                  <Download className="size-3.5" /> CSV
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {rows ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SMILES</TableHead>
                        <TableHead className="text-right">HIA (%)</TableHead>
                        <TableHead className="text-right">HOB (%)</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={`${r.smiles}-${i}`}>
                          <TableCell className="max-w-52 truncate font-mono text-xs">{r.smiles}</TableCell>
                          {r.status === "Success" ? (
                            <>
                              <TableCell className="text-right font-mono text-xs text-signal-high">{Math.round(r.hia_prob * 100)}%</TableCell>
                              <TableCell className="text-right font-mono text-xs">{Math.round(r.hob_prob * 100)}%</TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">Success</TableCell>
                            </>
                          ) : (
                            <TableCell colSpan={3} className="text-right text-xs text-destructive">{r.status}</TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">Run a batch to see the ranked table here.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
