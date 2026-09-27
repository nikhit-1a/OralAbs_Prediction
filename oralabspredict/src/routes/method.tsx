import { createFileRoute } from "@tanstack/react-router";
import { Activity, Database, GitBranch, ShieldCheck, Info } from "lucide-react";
import { motion, type Variants } from "framer-motion";

import { AppShell } from "@/components/AppShell";
import { GlassSurface } from "@/components/ui/glass-surface";

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
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <AppShell>
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col mt-4">
        
        <motion.div variants={itemVariants} className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">How OralAbsPredict Works</h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            OralAbsPredict is an educational and triage tool that connects to a robust backend pipeline for estimating human intestinal absorption (HIA) and human oral bioavailability (HOB) directly from a chemical structure using Machine Learning.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2 mb-12">
          <motion.div variants={itemVariants}>
            <GlassSurface className="p-6 h-full border-cyan-400/30 bg-cyan-400/5">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-cyan-400">
                <Info className="size-5" /> What is a SMILES string?
              </h2>
              <div className="text-sm text-foreground/80 leading-relaxed space-y-4">
                <p>
                  <strong>SMILES</strong> stands for <em>Simplified Molecular-Input Line-Entry System</em>. It is a specification in the form of a line notation for describing the structure of chemical species using short ASCII strings.
                </p>
                <p>
                  Think of it as a way to write a complex 2D or 3D molecule as a single line of text that a computer can easily read. 
                  For example, the SMILES string for water (H₂O) is simply <code className="bg-black/5 dark:bg-black/20 px-1 rounded text-cyan-300">O</code>. The SMILES string for Aspirin is <code className="bg-black/5 dark:bg-black/20 px-1 rounded text-cyan-300">CC(=O)OC1=CC=CC=C1C(=O)O</code>. 
                </p>
                <p>
                  On our Predictor and Batch pages, you just need to paste these strings, and our system reconstructs the entire chemical graph!
                </p>
              </div>
            </GlassSurface>
          </motion.div>

          <motion.div variants={containerVariants} className="flex flex-col gap-6">
            <motion.div variants={itemVariants}>
              <GlassSurface className="p-6 h-full">
                <h2 className="text-lg font-bold mb-2 text-violet-400">What is Intestinal Absorption (HIA)?</h2>
                <div className="text-sm text-foreground/80 leading-relaxed">
                  <strong>Human Intestinal Absorption (HIA)</strong> represents the fraction of an orally administered drug that crosses the intestinal wall and enters the portal vein. For a drug to be effective as a pill, it must first be absorbed through the gut lining. High HIA is a critical prerequisite for most oral medications.
                </div>
              </GlassSurface>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <GlassSurface className="p-6 h-full">
                <h2 className="text-lg font-bold mb-2 text-teal-400">What is Oral Bioavailability (HOB)?</h2>
                <div className="text-sm text-foreground/80 leading-relaxed">
                  <strong>Human Oral Bioavailability (HOB)</strong> is the actual fraction of the drug that reaches the systemic blood circulation unchanged. Even if a drug has high intestinal absorption, it might be heavily metabolized and destroyed by the liver (the "first-pass effect") before reaching the rest of the body. Thus, HOB is the ultimate measure of oral drug efficiency.
                </div>
              </GlassSurface>
            </motion.div>
          </motion.div>
        </div>

        <motion.h2 variants={itemVariants} className="text-2xl font-bold tracking-tight mb-6">The Prediction Pipeline</motion.h2>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          {STEPS.map((s) => (
            <motion.div 
              key={s.title} 
              variants={itemVariants}
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <GlassSurface className="p-6 h-full flex flex-col group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <s.icon className="size-24 text-primary absolute -top-4 -right-4 rotate-12" />
                </div>
                <div className="flex size-12 items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-primary mb-6 group-hover:scale-110 transition-transform">
                  <s.icon className="size-5 text-cyan-400" />
                </div>
                <h3 className="text-base font-bold mb-3">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </GlassSurface>
            </motion.div>
          ))}
        </div>

        <motion.div variants={itemVariants}>
          <GlassSurface className="p-6 border-amber-400/30 bg-amber-400/5 flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-400">
              <Info className="size-5" />
            </div>
            <div className="text-sm text-foreground/80 leading-relaxed">
              <strong className="text-amber-400 font-bold block mb-1">How to use this website:</strong> 
              Navigate to the <strong>Predictor</strong> tab to analyze a single molecule in detail, including its 3D interactive structure and physicochemical profile. Use the <strong>Batch</strong> tab to paste up to 200 SMILES strings at once to rapidly screen and rank a library of compounds for drug discovery triage.
            </div>
          </GlassSurface>
        </motion.div>

      </motion.div>
    </AppShell>
  );
}
