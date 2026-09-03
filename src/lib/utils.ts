import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractCity(address?: string): string {
  if (!address || !address.trim()) return "Steenwijk";
  const trimmed = address.trim();
  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
    const lastPart = parts[parts.length - 1];
    const cleanCity = lastPart.replace(/^\s*\d{4}\s?[A-Za-z]{2}\s+/, "").trim();
    if (cleanCity) return cleanCity;
  }
  const postalMatch = trimmed.match(/\b\d{4}\s?[A-Za-z]{2}\s+(.+)$/);
  if (postalMatch && postalMatch[1]) {
    return postalMatch[1].trim();
  }
  if (!/\d/.test(trimmed)) {
    return trimmed;
  }
  const lastWord = trimmed.split(/\s+/).pop();
  if (lastWord && isNaN(Number(lastWord))) {
    return lastWord;
  }
  return trimmed;
}
