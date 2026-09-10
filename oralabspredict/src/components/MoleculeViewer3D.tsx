import { useEffect, useRef, useState } from "react";
import * as $3Dmol from "3dmol";

export function MoleculeViewer3D({ smiles }: { smiles: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!viewerRef.current) {
      viewerRef.current = $3Dmol.createViewer(containerRef.current, {
        backgroundColor: "transparent",
      });
    }

    const viewer = viewerRef.current;

    async function fetchAndRender() {
      if (!smiles) return;
      try {
        setError(null);
        // Using the backend's /molecule_3d endpoint
        const res = await fetch(`http://127.0.0.1:8000/molecule_3d?smiles=${encodeURIComponent(smiles)}`);
        if (!res.ok) {
          throw new Error("Failed to fetch 3D coordinates");
        }
        const sdfData = await res.text();
        viewer.clear();
        viewer.addModel(sdfData, "sdf");
        viewer.setStyle({}, { stick: { colorscheme: "Jmol" } });
        viewer.zoomTo();
        viewer.render();
      } catch (err) {
        console.error("Error rendering 3D molecule:", err);
        setError("Could not generate 3D model.");
      }
    }

    fetchAndRender();

    return () => {
      // Clean up if needed
    };
  }, [smiles]);

  return (
    <div className="relative w-full h-64 bg-background/50 rounded-lg overflow-hidden border border-border/60">
      <div ref={containerRef} className="w-full h-full" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground bg-background/80">
          {error}
        </div>
      )}
    </div>
  );
}
