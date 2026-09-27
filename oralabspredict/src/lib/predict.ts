export type Descriptors = {
  mw: number; logp: number; hbd: number; hba: number; tpsa: number;
  rotb: number; rings: number; aromaticRings: number; heavyAtoms: number; formalCharge: number;
};

export type Feature = { name: string; value: number };
export type ADInfo = { in_domain: boolean; explanation: string };

export type Prediction = {
  smiles: string;
  name?: string;
  iupacName?: string;
  descriptors: Descriptors;
  hia: { probability: number; label: string; model_used: string; top_features: Feature[]; ad_info: ADInfo };
  hob: { probability: number; label: string; model_used: string; top_features: Feature[]; ad_info: ADInfo };
  lipinskiViolations: string[];
  veberViolations: string[];
  flags: string[];
  confidence: number;
};

const ATOM_WEIGHTS: Record<string, number> = {
  C: 12.011, N: 14.007, O: 15.999, S: 32.06, P: 30.974, F: 18.998,
  Cl: 35.45, Br: 79.904, I: 126.904, B: 10.81, Si: 28.085, H: 1.008,
};

const ATOM_LOGP: Record<string, number> = {
  C: 0.32, N: -0.55, O: -0.45, S: 0.4, P: -0.2, F: 0.35,
  Cl: 0.7, Br: 0.9, I: 1.1, B: 0.1, Si: 0.5,
};

const TWO_LETTER = ["Cl", "Br", "Si"];

export function isValidSmiles(raw: string): boolean {
  const s = raw.trim();
  if (!s || /\s/.test(s)) return false;
  if (!/^[A-Za-z0-9@+\-[\]()=#$%/\\.*]+$/.test(s)) return false;
  let depth = 0;
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth < 0) return false;
  }
  if (depth !== 0) return false;
  const open = (s.match(/\[/g) ?? []).length;
  const close = (s.match(/\]/g) ?? []).length;
  if (open !== close) return false;
  return /[A-Za-z]/.test(s);
}

export function computeDescriptors(raw: string): Descriptors {
  const smiles = raw.trim();
  const atoms: { symbol: string; aromatic: boolean; bracket: boolean }[] = [];
  let ringClosures = 0;
  let formalCharge = 0;
  let doubleTriple = 0;
  let singleBonds = 0;

  for (let i = 0; i < smiles.length; i++) {
    const ch = smiles[i]!;
    if (ch === "[") {
      const end = smiles.indexOf("]", i);
      const inner = smiles.slice(i + 1, end < 0 ? smiles.length : end);
      const sym = inner.match(/[A-Z][a-z]?|[a-z]/)?.[0] ?? "C";
      const plus = (inner.match(/\+/g) ?? []).length;
      const minus = (inner.match(/-/g) ?? []).length;
      const numAfter = inner.match(/([+-])(\d)/);
      formalCharge += numAfter
        ? (numAfter[1] === "+" ? 1 : -1) * Number(numAfter[2])
        : plus - minus;
      atoms.push({
        symbol: sym[0]!.toUpperCase() + sym.slice(1),
        aromatic: sym === sym.toLowerCase() && sym.length === 1,
        bracket: true,
      });
      i = end < 0 ? smiles.length : end;
      continue;
    }
    if (ch === "=" || ch === "#") { doubleTriple++; continue; }
    if (ch === "-") { singleBonds++; continue; }
    if (ch === "%") { ringClosures += 0.5; i += 2; continue; }
    if (/\d/.test(ch)) { ringClosures += 0.5; continue; }
    if (ch === "(" || ch === ")" || ch === "/" || ch === "\\" || ch === "." || ch === "@" || ch === "+") continue;
    const two = smiles.slice(i, i + 2);
    if (TWO_LETTER.includes(two)) { atoms.push({ symbol: two, aromatic: false, bracket: false }); i++; continue; }
    if (/[A-Za-z]/.test(ch)) {
      const aromatic = ch === ch.toLowerCase();
      atoms.push({ symbol: ch.toUpperCase(), aromatic, bracket: false });
    }
  }

  const heavy = atoms.filter((a) => a.symbol !== "H");
  const count = (sym: string) => heavy.filter((a) => a.symbol === sym).length;
  const nN = count("N"); const nO = count("O"); const nS = count("S");

  const valence: Record<string, number> = { C: 4, N: 3, O: 2, S: 2, P: 3, F: 1, Cl: 1, Br: 1, I: 1 };
  let hCount = 0;
  for (const a of heavy) {
    const v = valence[a.symbol];
    if (v === undefined) continue;
    hCount += Math.max(0, v - (a.aromatic ? 2.4 : 2.1));
  }
  hCount = Math.max(0, Math.round(hCount - doubleTriple));

  const mw = heavy.reduce((sum, a) => sum + (ATOM_WEIGHTS[a.symbol] ?? 12), 0) + hCount * (ATOM_WEIGHTS['H'] || 1);

  const aromaticAtoms = heavy.filter((a) => a.aromatic).length;
  let logp = heavy.reduce((sum, a) => sum + (ATOM_LOGP[a.symbol] ?? 0.2), 0);
  logp += aromaticAtoms * 0.12;
  logp -= (smiles.match(/O\)?=|=O/g) ?? []).length * 0.45;
  logp -= (smiles.match(/N/gi) ?? []).length * 0.15;
  logp -= Math.abs(formalCharge) * 1.2;

  const hbd = Math.max(0, Math.round(
    nO * 0.45 + nN * 0.5 - (smiles.match(/=O/g) ?? []).length * 0.35 - (smiles.match(/O[CS]/g) ?? []).length * 0.3,
  ));
  const hba = nN + nO + Math.round(nS * 0.3);

  const tpsa = Math.max(0,
    nO * 17.07 + nN * 12.36 + hbd * 8.5 + (smiles.match(/=O/g) ?? []).length * 3.2 + Math.abs(formalCharge) * 9,
  );

  const rings = Math.round(ringClosures);
  const aromaticRings = Math.max(0, Math.round(aromaticAtoms / 5.6));
  const branchBonds = heavy.length - 1;
  const rotb = Math.max(0, Math.round(branchBonds * 0.32 - doubleTriple * 0.5 - rings * 1.6 + singleBonds * 0.5));

  return {
    mw: round(mw, 1), logp: round(logp, 2), hbd, hba, tpsa: round(tpsa, 1),
    rotb, rings, aromaticRings, heavyAtoms: heavy.length, formalCharge,
  };
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export async function predict(raw: string): Promise<Prediction> {
  const smiles = raw.trim();
  const d = computeDescriptors(smiles);
  
  // Call backend API and PubChem concurrently
  const [res, pubchemRes] = await Promise.all([
    fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smiles })
    }),
    fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/property/Title,IUPACName/JSON`).catch(() => null)
  ]);
  
  if (!res.ok) {
    throw new Error(`API error: ${res.statusText}`);
  }
  const data = await res.json();

  let name = undefined;
  let iupacName = undefined;
  if (pubchemRes && pubchemRes.ok) {
    try {
      const pubData = await pubchemRes.json();
      if (pubData.PropertyTable?.Properties?.[0]) {
        name = pubData.PropertyTable.Properties[0].Title;
        iupacName = pubData.PropertyTable.Properties[0].IUPACName;
      }
    } catch (e) {
      console.warn("Failed to parse PubChem response");
    }
  }
  
  const hiaP = data.HIA?.probability ?? 0;
  const hobP = data.HOB?.probability ?? 0;

  const lipinski: string[] = [];
  if (d.mw > 500) lipinski.push(`MW ${d.mw} > 500`);
  if (d.logp > 5) lipinski.push(`cLogP ${d.logp} > 5`);
  if (d.hbd > 5) lipinski.push(`H-bond donors ${d.hbd} > 5`);
  if (d.hba > 10) lipinski.push(`H-bond acceptors ${d.hba} > 10`);

  const veber: string[] = [];
  if (d.rotb > 10) veber.push(`Rotatable bonds ${d.rotb} > 10`);
  if (d.tpsa > 140) veber.push(`TPSA ${d.tpsa} > 140 Å²`);

  const flags: string[] = [];
  if (Math.abs(d.formalCharge) > 0) flags.push("Permanently charged species — passive permeation limited");
  if (d.tpsa > 120) flags.push("High polar surface area reduces transcellular uptake");
  if (d.logp > 5.5) flags.push("High lipophilicity — first-pass metabolism risk");
  if (d.mw < 150) flags.push("Very small molecule — descriptor estimate less reliable");

  const confidence = round(
    Math.max(0.35, Math.min(0.95,
      0.92 - Math.abs(hiaP - 0.5) * 0.1 - lipinski.length * 0.08 - (d.heavyAtoms > 60 ? 0.15 : 0)
    )), 2,
  );

  return {
    smiles, name, iupacName, descriptors: d,
    hia: { 
      probability: round(hiaP, 3), 
      label: bandLabel(hiaP, "HIA"),
      model_used: data.HIA?.model_used ?? "Unknown",
      top_features: data.HIA?.top_features ?? [],
      ad_info: data.HIA?.ad_info ?? { in_domain: true, explanation: "" }
    },
    hob: { 
      probability: round(hobP, 3), 
      label: bandLabel(hobP, "HOB"),
      model_used: data.HOB?.model_used ?? "Unknown",
      top_features: data.HOB?.top_features ?? [],
      ad_info: data.HOB?.ad_info ?? { in_domain: true, explanation: "" }
    },
    lipinskiViolations: lipinski, veberViolations: veber, flags, confidence,
  };
}

export function bandLabel(p: number, kind: "HIA" | "HOB") {
  if (kind === "HIA") {
    if (p >= 0.8) return "High absorption";
    if (p >= 0.5) return "Moderate absorption";
    return "Low absorption";
  }
  if (p >= 0.7) return "High bioavailability";
  if (p >= 0.4) return "Moderate bioavailability";
  return "Low bioavailability";
}

export const EXAMPLES: { name: string; smiles: string; note: string }[] = [
  { name: "Caffeine", smiles: "CN1C=NC2=C1C(=O)N(C)C(=O)N2C", note: "Well absorbed CNS stimulant" },
  { name: "Aspirin", smiles: "CC(=O)OC1=CC=CC=C1C(=O)O", note: "Small acidic NSAID" },
  { name: "Atorvastatin", smiles: "CC(C)C1=C(C(=O)NC2=CC=CC=C2)C(C3=CC=C(F)C=C3)=C(N1CCC(O)CC(O)CC(=O)O)C4=CC=CC=C4", note: "Large, low bioavailability" },
  { name: "Ibuprofen", smiles: "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O", note: "Near-complete absorption" },
  { name: "Metformin", smiles: "CN(C)C(=N)NC(=N)N", note: "Polar, transporter-dependent" },
  { name: "Cyclosporine-like fragment", smiles: "CC(C)CC(NC(=O)C(C)NC(=O)C(CC(C)C)NC(=O)C)C(=O)O", note: "Peptidic, poorly absorbed" },
];
