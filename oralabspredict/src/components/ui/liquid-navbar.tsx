import { useState, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { GlassSurface } from "./glass-surface";

const NAV_ITEMS = [
  { id: "/", label: "Predictor" },
  { id: "/compare", label: "Compare" },
  { id: "/batch", label: "Batch" },
  { id: "/method", label: "Method" },
];

export function LiquidNavbar() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const activePath = location.pathname;

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setHidden(true); // scrolling down
      } else {
        setHidden(false); // scrolling up
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: hidden ? -100 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
    >
      <GlassSurface
        className="pointer-events-auto flex items-center p-1.5 transition-all duration-300"
        style={{
          borderRadius: "9999px", // Pill shape
          paddingLeft: scrolled ? "1rem" : "1.5rem",
          paddingRight: scrolled ? "1rem" : "1.5rem",
        }}
      >
        <div className="flex items-center gap-1">
          {/* Logo */}
          <Link
            to="/"
            className="mr-4 flex items-center gap-2 px-2 text-sm font-bold tracking-tight text-foreground transition-transform hover:scale-105 active:scale-95"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 to-violet-500 text-white">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            {!scrolled && (
              <span className="hidden sm:inline-block">
                OralAbs<span className="text-violet-500">Predict</span>
              </span>
            )}
          </Link>

          {/* Links */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                to={item.id as any}
                className="relative px-3 py-1.5 text-sm font-medium transition-colors hover:text-cyan-400"
                style={{
                  color: activePath === item.id ? "var(--primary)" : "inherit",
                }}
              >
                {activePath === item.id && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute inset-0 rounded-full bg-cyan-500/15 dark:bg-white/10 shadow-[0_0_10px_rgba(34,211,238,0.2)] dark:shadow-none"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="ml-2 h-4 w-px bg-foreground/20" />

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative ml-2 flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait">
              {theme === "dark" ? (
                <motion.div
                  key="moon"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="h-4 w-4 text-violet-300" />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="h-4 w-4 text-amber-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </GlassSurface>
    </motion.header>
  );
}
