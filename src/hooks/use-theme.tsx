import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { safeLocalStorage } from "@/lib/safeStorage";

type Theme = "dark" | "light";
interface ThemeCtx { theme: Theme; toggle: () => void; }

const ThemeContext = createContext<ThemeCtx>({ theme: "dark", toggle: () => {} });

// Key versioned to v2 so any previous unintentional "light" defaults are cleanly reset to dark
const THEME_KEY = "lva-theme-v2";

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";
  const stored = safeLocalStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  // Lijst van Andel's brand identity is the dark forest-green design system
  return "dark";
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    safeLocalStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(t => (t === "dark" ? "light" : "dark")) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

