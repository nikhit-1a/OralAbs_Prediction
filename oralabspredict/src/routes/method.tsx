import { createFileRoute } from "@tanstack/react-router";
import { Activity, Database, GitBranch, ShieldCheck, Info } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/method")({
  component: MethodPage,
});

const STEPS = [
  { icon: Database, title: "1. Structure Ingestion", body: "You enter a SMILES string on our Predictor page. Our backend server uses RDKit to parse the chemical structure and generate high-dimensional molecular descriptors (e.g., MACCS/Morgan fingerprints)." },
  { icon: Activity, title: "2. Physicochemical Profiling", body: "Properties like Molecular Weight, Lipophilicity (cLogP), Hydrogen Bond Donors/Acceptors, and Polar Surface Area are estimated to evaluate the molecule's fundamental nature." },
  { icon: GitBranch, title: "3. ML Model Prediction", body: "The FastAPI backend runs the descriptors through highly trained Machine Learning models (Random Forest) to predict the exact probability of HIA and HOB." },
  { icon: ShieldCheck, title: "4. Confidence & 3D Rendering", body: "We check if the molecule passes the Lipinski/Veber rules (drug-likeness) and determine model confidence. Finally, a 3D structural model is generated and sent back to your browser." },
];

function MethodPage() {
  return (
    <AppShell>
      <div className="mb-8 max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">How OralAbsPredict Works</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          OralAbsPredict is an educational and triage tool that connects to a robust backend pipeline for estimating human intestinal absorption (HIA) and human oral bioavailability (HOB) directly from a chemical structure using Machine Learning.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card className="shadow-panel border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="size-5 text-primary" /> What is a SMILES string?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/80 leading-relaxed space-y-3">
            <p>
              <strong>SMILES</strong> stands for <em>Simplified Molecular-Input Line-Entry System</em>. It is a specification in the form of a line notation for describing the structure of chemical species using short ASCII strings.
            </p>
            <p>
              Think of it as a way to write a complex 2D or 3D molecule as a single line of text that a computer can easily read. 
              For example, the SMILES string for water (H₂O) is simply <code>O</code>. The SMILES string for Aspirin is <code>CC(=O)OC1=CC=CC=C1C(=O)O</code>. 
            </p>
            <p>
              On our Predictor and Batch pages, you just need to paste these strings, and our system reconstructs the entire chemical graph!
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-panel">
            <CardHeader>
              <CardTitle className="text-lg">What is Intestinal Absorption (HIA)?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/80 leading-relaxed">
              <strong>Human Intestinal Absorption (HIA)</strong> represents the fraction of an orally administered drug that crosses the intestinal wall and enters the portal vein. For a drug to be effective as a pill, it must first be absorbed through the gut lining. High HIA is a critical prerequisite for most oral medications.
            </CardContent>
          </Card>
          
          <Card className="shadow-panel">
            <CardHeader>
              <CardTitle className="text-lg">What is Oral Bioavailability (HOB)?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/80 leading-relaxed">
              <strong>Human Oral Bioavailability (HOB)</strong> is the actual fraction of the drug that reaches the systemic blood circulation unchanged. Even if a drug has high intestinal absorption, it might be heavily metabolized and destroyed by the liver (the "first-pass effect") before reaching the rest of the body. Thus, HOB is the ultimate measure of oral drug efficiency.
            </CardContent>
          </Card>
        </div>
      </div>

      <h2 className="text-xl font-bold tracking-tight sm:text-2xl mb-4 mt-12">The Prediction Pipeline</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {STEPS.map((s, i) => (
          <Card key={s.title} className="shadow-panel">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-2">
                <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-primary">
                  <s.icon className="size-4.5" />
                </span>
                <div>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed">{s.body}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-signal-mid/40 shadow-panel">
        <CardContent className="p-5 text-sm text-muted-foreground flex items-start gap-3">
          <Info className="size-5 text-signal-mid shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground">How to use this website:</strong> Navigate to the <strong>Predictor</strong> tab to analyze a single molecule in detail, including its 3D interactive structure and physicochemical profile. Use the <strong>Batch</strong> tab to paste up to 200 SMILES strings at once to rapidly screen and rank a library of compounds for drug discovery triage.
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
