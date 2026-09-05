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

  // Apply contrast mode and colorblind classes to document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast class
    root.classList.toggle("contrast-high", contrastMode === "high");
    root.setAttribute("data-contrast", contrastMode);
    localStorage.setItem(STORAGE_KEY_CONTRAST, contrastMode);

    // Colorblind classes
    root.classList.remove("cb-deuteranopia", "cb-protanopia", "cb-tritanopia", "cb-monochrome");
    if (colorBlindMode !== "none") {
      root.classList.add(`cb-${colorBlindMode}`);
    }
    root.setAttribute("data-colorblind", colorBlindMode);
    localStorage.setItem(STORAGE_KEY_COLORBLIND, colorBlindMode);
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
      {/* SVG Color Blindness Color Matrix Filters (standards-compliant feColorMatrix) */}
      <svg
        className="sr-only"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}
        aria-hidden="true"
      >
        <defs>
          {/* Deuteranopia (green blindness / weakness - most common) */}
          <filter id="lva-deuteranopia" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                0.625, 0.375, 0,     0, 0
                0.700, 0.300, 0,     0, 0
                0,     0.300, 0.700, 0, 0
                0,     0,     0,     1, 0
              "
            />
          </filter>

          {/* Protanopia (red blindness / weakness) */}
          <filter id="lva-protanopia" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                0.567, 0.433, 0,     0, 0
                0.558, 0.442, 0,     0, 0
                0,     0.242, 0.758, 0, 0
                0,     0,     0,     1, 0
              "
            />
          </filter>

          {/* Tritanopia (blue blindness / weakness) */}
          <filter id="lva-tritanopia" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                0.950, 0.050, 0,     0, 0
                0,     0.433, 0.567, 0, 0
                0,     0.475, 0.525, 0, 0
                0,     0,     0,     1, 0
              "
            />
          </filter>

          {/* Monochrome (Achromatopsia / high-contrast grayscale) */}
          <filter id="lva-monochrome" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                0.299, 0.587, 0.114, 0, 0
                0.299, 0.587, 0.114, 0, 0
                0.299, 0.587, 0.114, 0, 0
                0,     0,     0,     1, 0
              "
            />
          </filter>
        </defs>
      </svg>
      {children}
    </AccessibilityContext.Provider>
  );
};
