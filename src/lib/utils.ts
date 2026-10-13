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

export function isEventExpired(item?: { date?: string; endTime?: string; startTime?: string } | null): boolean {
  if (!item || !item.date) return false;
  try {
    const rawDate = String(item.date).trim();
    const datePart = rawDate.split("T")[0];
    const parts = datePart.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const [year, month, day] = parts;
      let hours = 23;
      let minutes = 59;
      let seconds = 59;

      if (item.endTime) {
        const cleanTime = String(item.endTime).replace(".", ":").trim();
        const tParts = cleanTime.split(":");
        if (tParts.length >= 2 && !isNaN(Number(tParts[0])) && !isNaN(Number(tParts[1]))) {
          hours = Number(tParts[0]);
          minutes = Number(tParts[1]);
          seconds = 0;
        }
      }

      const eventDate = new Date(year, month - 1, day, hours, minutes, seconds);
      return eventDate.getTime() < Date.now();
    }

    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      if (!rawDate.includes(":") && !rawDate.includes("T")) {
        parsed.setHours(23, 59, 59, 999);
      }
      return parsed.getTime() < Date.now();
    }
  } catch {
    return false;
  }
  return false;
}
