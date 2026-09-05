import { useContext } from "react";
import { AccessibilityContext, AccessibilityContextType } from "@/context/AccessibilityContext";

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
};
