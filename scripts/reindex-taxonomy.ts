import fs from "fs";
import path from "path";
import {
  normalizeHoofddossier,
  normalizeSubdossier,
  detectWijkOrKern,
  CANONICAL_HOOFDDOSSIERS,
} from "../src/server/taxonomyClassifier.js";
import { rebuildNetworkGraph } from "../src/server/dossierManager.js";
import type { RaadsstukMetadata } from "../src/types/dossier.js";

const PUBLIC_METADATA_JSON = path.join(process.cwd(), "public", "data", "raadsstukken_metadata_tussentijds.json");
const SRC_METADATA_JSON = path.join(process.cwd(), "src", "data", "raadsstukken_metadata_tussentijds.json");
const DIST_METADATA_JSON = path.join(process.cwd(), "dist", "data", "raadsstukken_metadata_tussentijds.json");

const PUBLIC_METADATA_CSV = path.join(process.cwd(), "public", "data", "raadsstukken_metadata_tussentijds.csv");
const DIST_METADATA_CSV = path.join(process.cwd(), "dist", "data", "raadsstukken_metadata_tussentijds.csv");

console.log("=== START RE-INDEXING & TAXONOMY CLASSIFICATION ===");

if (!fs.existsSync(PUBLIC_METADATA_JSON)) {
  console.error("Public metadata JSON not found at:", PUBLIC_METADATA_JSON);
  process.exit(1);
}

const rawData = fs.readFileSync(PUBLIC_METADATA_JSON, "utf-8");
const items: RaadsstukMetadata[] = JSON.parse(rawData);

console.log(`Loaded ${items.length} records.`);

const counts: Record<string, number> = {};
CANONICAL_HOOFDDOSSIERS.forEach((h) => (counts[h] = 0));

const updatedItems: RaadsstukMetadata[] = items.map((item) => {
  const normHoofddossier = normalizeHoofddossier(item.dossier, item.titel, item.entiteiten, `${item.bestandsnaam} ${item.relaties || ""}`);
  const normSubdossier = normalizeSubdossier(normHoofddossier, item.subdossier, item.titel, item.entiteiten, `${item.bestandsnaam} ${item.relaties || ""}`);
  const detectedWijk = item.wijk_of_kern || detectWijkOrKern(`${item.titel || ""} ${item.entiteiten || ""} ${item.bestandsnaam || ""}`);

  counts[normHoofddossier] = (counts[normHoofddossier] || 0) + 1;

  return {
    ...item,
    dossier: normHoofddossier,
    subdossier: normSubdossier,
    wijk_of_kern: detectedWijk || "",
  };
});

console.log("\n=== CLASSIFICATION DISTRIBUTION (10 Hoofddossiers) ===");
Object.entries(counts).forEach(([hd, count]) => {
  console.log(`- ${hd}: ${count} documenten`);
});

// Save updated JSON
const jsonOutput = JSON.stringify(updatedItems, null, 2);
fs.writeFileSync(PUBLIC_METADATA_JSON, jsonOutput, "utf-8");
if (fs.existsSync(path.dirname(SRC_METADATA_JSON))) {
  fs.writeFileSync(SRC_METADATA_JSON, jsonOutput, "utf-8");
}
if (fs.existsSync(path.dirname(DIST_METADATA_JSON))) {
  fs.writeFileSync(DIST_METADATA_JSON, jsonOutput, "utf-8");
}

// Generate CSV
const csvRows: string[] = [
  ["bestandsnaam", "titel", "dossier", "subdossier", "datum", "wijk_of_kern", "entiteiten", "relaties"]
    .map((c) => `"${c}"`)
    .join(";"),
];

updatedItems.forEach((m) => {
  csvRows.push(
    [
      m.bestandsnaam || "",
      m.titel || "",
      m.dossier || "",
      m.subdossier || "",
      m.datum || "",
      m.wijk_of_kern || "",
      m.entiteiten || "",
      m.relaties || "",
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(";")
  );
});

const csvOutput = "\uFEFF" + csvRows.join("\r\n");
fs.writeFileSync(PUBLIC_METADATA_CSV, csvOutput, "utf-8");
if (fs.existsSync(path.dirname(DIST_METADATA_CSV))) {
  fs.writeFileSync(DIST_METADATA_CSV, csvOutput, "utf-8");
}

// Rebuild network graph
console.log("\nRebuilding network graph...");
rebuildNetworkGraph(updatedItems);

console.log("=== COMPLETED SUCCESSFULLY ===");
