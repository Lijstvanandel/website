import React, { createContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";

export type ContrastMode = "normal" | "high";
export type ColorBlindMode = "none" | "deuteranopia" | "protanopia" | "tritanopia" | "monochrome";

export interface AccessibilityContextType {
  fontSize: number; // percentage: e.g. 85, 100, 115, 130, 145
  contrastMode: ContrastMode;
  colorBlindMode: ColorBlindMode;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  setFontSize: (size: number) => void;
  toggleHighContrast: () => void;
  setContrastMode: (mode: ContrastMode) => void;
  setColorBlindMode: (mode: ColorBlindMode) => void;
  resetAll: () => void;
}

export const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const FONT_SIZE_STEPS = [85, 100, 115, 130, 145];
const STORAGE_KEY_FONT_SIZE = "lva-text-size";
const STORAGE_KEY_CONTRAST = "lva-contrast-mode";
const STORAGE_KEY_COLORBLIND = "lva-colorblind-mode";

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fontSize, setFontSizeState] = useState<number>(() => {
    if (typeof window === "undefined") return 100;
    const stored = localStorage.getItem(STORAGE_KEY_FONT_SIZE);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 70 && parsed <= 160) {
        return parsed;
      }
    }
    return 100;
  });

  const [contrastMode, setContrastModeState] = useState<ContrastMode>(() => {
    if (typeof window === "undefined") return "normal";
    const stored = localStorage.getItem(STORAGE_KEY_CONTRAST);
    return stored === "high" ? "high" : "normal";
  });

  const [colorBlindMode, setColorBlindModeState] = useState<ColorBlindMode>(() => {
    if (typeof window === "undefined") return "none";
    const stored = localStorage.getItem(STORAGE_KEY_COLORBLIND);
    if (
      stored === "deuteranopia" ||
      stored === "protanopia" ||
      stored === "tritanopia" ||
      stored === "monochrome"
    ) {
      return stored;
    }
    return "none";
  });

  // Apply font size to document.documentElement (root)
  useEffect(() => {
    const root = document.documentElement;
    if (fontSize === 100) {
      root.style.fontSize = "";
    } else {
      root.style.fontSize = `${fontSize}%`;
    }
    localStorage.setItem(STORAGE_KEY_FONT_SIZE, fontSize.toString());
  }, [fontSize]);

  // Apply contrast mode and colorblind classes to document.documentElement and root element
  useEffect(() => {
    const docEl = document.documentElement;
    const rootEl = document.getElementById("root");
    
    // High contrast class
    docEl.classList.toggle("contrast-high", contrastMode === "high");
    docEl.setAttribute("data-contrast", contrastMode);
    localStorage.setItem(STORAGE_KEY_CONTRAST, contrastMode);

    // Colorblind classes
    docEl.classList.remove("cb-deuteranopia", "cb-protanopia", "cb-tritanopia", "cb-monochrome");
    if (colorBlindMode !== "none") {
      docEl.classList.add(`cb-${colorBlindMode}`);
    }
    docEl.setAttribute("data-colorblind", colorBlindMode);
    localStorage.setItem(STORAGE_KEY_COLORBLIND, colorBlindMode);

    // Build filter string directly applied to #root
    let filterString = "";
    if (colorBlindMode === "deuteranopia") {
      filterString = "url(#lva-deuteranopia)";
    } else if (colorBlindMode === "protanopia") {
      filterString = "url(#lva-protanopia)";
    } else if (colorBlindMode === "tritanopia") {
      filterString = "url(#lva-tritanopia)";
    } else if (colorBlindMode === "monochrome") {
      filterString = "grayscale(100%)";
    }

    if (contrastMode === "high") {
      filterString = filterString ? `${filterString} contrast(125%)` : "contrast(115%)";
    }

    if (rootEl) {
      rootEl.style.filter = filterString;
    }
  }, [contrastMode, colorBlindMode]);

  const increaseFontSize = () => {
    setFontSizeState((current) => {
      const next = FONT_SIZE_STEPS.find((step) => step > current);
      const newSize = next !== undefined ? next : current;
      if (newSize !== current) {
        toast.info(`Tekstgrootte vergroot naar ${newSize}%`, { id: "lva-accessibility-toast", duration: 1500 });
      }
      return newSize;
    });
  };

  const decreaseFontSize = () => {
    setFontSizeState((current) => {
      const reversed = [...FONT_SIZE_STEPS].reverse();
      const prev = reversed.find((step) => step < current);
      const newSize = prev !== undefined ? prev : current;
      if (newSize !== current) {
        toast.info(`Tekstgrootte verkleind naar ${newSize}%`, { id: "lva-accessibility-toast", duration: 1500 });
      }
      return newSize;
    });
  };

  const resetFontSize = () => {
    setFontSizeState(100);
    toast.info("Standaard tekstgrootte hersteld (100%)", { id: "lva-accessibility-toast", duration: 1500 });
  };

  const setFontSize = (size: number) => {
    setFontSizeState(size);
    toast.info(`Tekstgrootte ingesteld op ${size}%`, { id: "lva-accessibility-toast", duration: 1500 });
  };

  const toggleHighContrast = () => {
    setContrastModeState((curr) => {
      const next = curr === "high" ? "normal" : "high";
      if (next === "high") {
        toast.success("Hoog contrast geactiveerd (WCAG AAA)", { id: "lva-accessibility-toast", duration: 2000 });
      } else {
        toast.info("Standaard contrast hersteld", { id: "lva-accessibility-toast", duration: 2000 });
      }
      return next;
    });
  };

  const setContrastMode = (mode: ContrastMode) => {
    setContrastModeState(mode);
    if (mode === "high") {
      toast.success("Hoog contrast geactiveerd (WCAG AAA)", { id: "lva-accessibility-toast", duration: 2000 });
    } else {
      toast.info("Standaard contrast hersteld", { id: "lva-accessibility-toast", duration: 2000 });
    }
  };

  const setColorBlindMode = (mode: ColorBlindMode) => {
    setColorBlindModeState(mode);
    const labels: Record<ColorBlindMode, string> = {
      none: "Standaard kleuren hersteld",
      deuteranopia: "Deuteranopie filter ingeschakeld (Rood-Groen)",
      protanopia: "Protanopie filter ingeschakeld (Rood-zwakte)",
      tritanopia: "Tritanopie filter ingeschakeld (Blauw-Geel)",
      monochrome: "Monochroom filter ingeschakeld (Grijswaarden)",
    };
    toast.success(labels[mode], { id: "lva-accessibility-toast", duration: 2000 });
  };

  const resetAll = () => {
    setFontSizeState(100);
    setContrastModeState("normal");
    setColorBlindModeState("none");
    toast.info("Alle toegankelijkheidsinstellingen hersteld naar standaard", { id: "lva-accessibility-toast", duration: 2000 });
  };

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        contrastMode,
        colorBlindMode,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize,
        setFontSize,
        toggleHighContrast,
        setContrastMode,
        setColorBlindMode,
        resetAll,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};
