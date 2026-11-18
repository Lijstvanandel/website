import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { safeLocalStorage } from "@/lib/safeStorage";

type Theme = "dark" | "light";
interface ThemeCtx { theme: Theme; toggle: () => void; }

const ThemeContext = createContext<ThemeCtx>({ theme: "dark", toggle: () => {} });

const THEME_KEY = "osl-theme-v2";
const LEGACY_THEME_KEY = "lva-theme-v2";

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";
  const stored = safeLocalStorage.getItem(THEME_KEY) || safeLocalStorage.getItem(LEGACY_THEME_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  // Onafhankelijk Steenwijkerland (OSL) brand identity is the Diep Woudgroen (#143627) dark design system
  return "dark";
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    safeLocalStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme(t => (t === "dark" ? "light" : "dark")) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

