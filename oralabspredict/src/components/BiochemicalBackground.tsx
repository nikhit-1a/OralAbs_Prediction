import { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sphere, Line, Preload } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "./theme-provider";

function DNAHelix({ themeMode }: { themeMode: "light" | "dark" }) {
  const group = useRef<THREE.Group>(null);
  const color1 = themeMode === "dark" ? "#22D3EE" : "#0284c7"; // Cyan / Blue
  const color2 = themeMode === "dark" ? "#A78BFA" : "#6366f1"; // Violet / Indigo

  // Generate DNA coordinates
  const dnaPairs = useMemo<{ p1: THREE.Vector3; p2: THREE.Vector3 }[]>(() => {
    const pairs: { p1: THREE.Vector3; p2: THREE.Vector3 }[] = [];
    for (let i = 0; i < 40; i++) {
      const t = i * 0.4;
      pairs.push({
        p1: new THREE.Vector3(Math.cos(t) * 2, i * 0.4 - 8, Math.sin(t) * 2),
        p2: new THREE.Vector3(Math.cos(t + Math.PI) * 2, i * 0.4 - 8, Math.sin(t + Math.PI) * 2),
      });
    }
    return pairs;
  }, []);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.2;
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
    }
  });

  return (
    <group ref={group} position={[6, 0, -10]} rotation={[0.2, 0, -0.2]}>
      {dnaPairs.map((pair, i) => (
        <group key={i}>
          <Sphere args={[0.2, 16, 16]} position={pair.p1}>
            <meshStandardMaterial color={color1} emissive={color1} emissiveIntensity={0.5} />
          </Sphere>
          <Sphere args={[0.2, 16, 16]} position={pair.p2}>
            <meshStandardMaterial color={color2} emissive={color2} emissiveIntensity={0.5} />
          </Sphere>
          <Line
            points={[pair.p1, pair.p2]}
            color={themeMode === "dark" ? "#ffffff" : "#94a3b8"}
            lineWidth={0.5}
            transparent
            opacity={0.3}
          />
        </group>
      ))}
    </group>
  );
}

function FloatingMolecules({ themeMode }: { themeMode: "light" | "dark" }) {
  const group = useRef<THREE.Group>(null);
  const { mouse } = useThree();
  const color = themeMode === "dark" ? "#2DD4BF" : "#0f766e"; // Teal
  
  const particles = useMemo<{ position: THREE.Vector3; factor: number }[]>(() => {
    const temp: { position: THREE.Vector3; factor: number }[] = [];
    for (let i = 0; i < 50; i++) {
      temp.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 15 - 5
        ),
        factor: 0.1 + Math.random() * 0.9,
      });
    }
    return temp;
  }, []);

  useFrame((state) => {
    if (group.current) {
      // Parallax effect with mouse
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, mouse.x * 2, 0.05);
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, mouse.y * 2, 0.05);
      group.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <group ref={group}>
      {particles.map((p, i) => (
        <Sphere key={i} args={[0.08, 8, 8]} position={p.position}>
          <meshBasicMaterial color={color} transparent opacity={0.6 * p.factor} />
        </Sphere>
      ))}
    </group>
  );
}

export function BiochemicalBackground() {
  const { theme } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (theme === "system") {
      setActiveTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } else {
      setActiveTheme(theme);
    }
  }, [theme]);

  if (reducedMotion) {
    return <div className="fixed inset-0 pointer-events-none -z-10" aria-hidden />;
  }

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 bg-transparent transition-colors duration-700">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: false }}
      >
        <ambientLight intensity={activeTheme === "dark" ? 0.2 : 0.8} />
        <pointLight position={[10, 10, 10]} intensity={activeTheme === "dark" ? 1 : 0.5} />
        
        <DNAHelix themeMode={activeTheme} />
        <FloatingMolecules themeMode={activeTheme} />
        
        {/* Soft fog to blend the 3D space into the CSS background */}
        <fog attach="fog" args={[activeTheme === "dark" ? "#0A1224" : "#F8FAFC", 10, 30]} />
        <Preload all />
      </Canvas>
    </div>
  );
}
