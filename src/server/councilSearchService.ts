import { getAllDossiers, getDossiers, getDossierBySlug } from "./dossierManager.js";
import {
  getDocumentContent,
  normalizeForSearch,
  extractExactHitSnippet,
  resolveDocumentPath,
} from "./documentTextExtractor.js";
import { getUserFavoriteFilenames, getDbFromSqlite } from "./sqliteDatabase.js";
import type { Dossier, DossierDocument, SearchHit, CouncilSearchResponse } from "../types/dossier.js";

export interface CouncilSearchParams {
  query?: string;
  exactPhrase?: boolean;
  startDate?: string;
  endDate?: string;
  minFiles?: number;
  maxFiles?: number;
  category?: string;
  hasFiles?: boolean;
  type?: "all" | "dossiers" | "documents";
  userId?: string;
  page?: number;
  limit?: number;
}

/**
 * Standardize any date input (DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD) to YYYY-MM-DD
 */
export function parseDateToIso(dateStr?: string | null): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const clean = dateStr.trim();
  if (!clean) return null;

  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Check DD-MM-YYYY or DD/MM/YYYY
  const match = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  // General Date parse fallback
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Perform Meilisearch-style high speed exact full-text search across dossiers and documents
 */
export async function executeCouncilSearch(params: CouncilSearchParams): Promise<CouncilSearchResponse> {
  const startTime = performance.now();

  const rawQuery = (params.query || "").trim();
  const exactPhrase = params.exactPhrase !== false; // Default true
  const normQuery = normalizeForSearch(rawQuery);
  const typeFilter = params.type || "all";

  const isoStart = parseDateToIso(params.startDate);
  const isoEnd = parseDateToIso(params.endDate);
  const minFiles = typeof params.minFiles === "number" ? params.minFiles : 0;
  const maxFiles = typeof params.maxFiles === "number" && params.maxFiles > 0 ? params.maxFiles : 9999;
  const categoryFilter = params.category && params.category !== "all" ? params.category.toLowerCase() : null;
  const hasFilesOnly = params.hasFiles === true;

  const userFavorites = params.userId ? getUserFavoriteFilenames(params.userId) : new Set<string>();

  // Fetch all compiled dossiers including custom SQLite entries
  const db = getDbFromSqlite();
  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || []);

  const matchedHits: SearchHit[] = [];
  const seenHitIds = new Set<string>();
  const addHit = (hit: SearchHit) => {
    if (seenHitIds.has(hit.id)) return;
    seenHitIds.add(hit.id);
    matchedHits.push(hit);
  };
  const matchedDossiersMap = new Map<string, Dossier>();
  const matchedDocumentsMap = new Map<string, DossierDocument>();

  for (const dossier of allDossiers) {
    // 1. Slider filter: documentCount between minFiles and maxFiles
    if (dossier.documentCount < minFiles) continue;
    if (maxFiles < 50 && dossier.documentCount > maxFiles) continue;

    // 2. Category filter
    if (categoryFilter && dossier.category.toLowerCase() !== categoryFilter) {
      continue;
    }

    // 3. Period / Timeline filter for dossier
    // "als ik bijvoorbeeld 06-06-2024 als begin selecteer, dat ik dan dossiers krijg waarvan de documenten actief of gestart zijn op de tijdlijn. Voor eind geld hetzelfde."
    let dossierTimelineMatch = true;
    const dStart = dossier.dateRange.start ? parseDateToIso(dossier.dateRange.start) : null;
    const dEnd = dossier.dateRange.end ? parseDateToIso(dossier.dateRange.end) : null;

    if (isoStart) {
      // Dossier is active on/after isoStart if its end date >= isoStart or any doc >= isoStart
      const activeAfterStart = (dEnd && dEnd >= isoStart) || dossier.documents.some((d) => d.datum && d.datum >= isoStart);
      if (!activeAfterStart) {
        dossierTimelineMatch = false;
      }
    }

    if (isoEnd && dossierTimelineMatch) {
      // Dossier started on/before isoEnd if its start date <= isoEnd or any doc <= isoEnd
      const activeBeforeEnd = (dStart && dStart <= isoEnd) || dossier.documents.some((d) => d.datum && d.datum <= isoEnd);
      if (!activeBeforeEnd) {
        dossierTimelineMatch = false;
      }
    }

    if (!dossierTimelineMatch && (isoStart || isoEnd)) {
      continue;
    }

    // 4. Match Dossier Metadata itself (if searching)
    let dossierMatchedQuery = !normQuery;
    let dossierScore = 0;
    let dossierSnippet = "";
    let dossierMatchField: SearchHit["matchField"] = "title";

    if (normQuery) {
      const normTitle = normalizeForSearch(dossier.title);
      const normDesc = normalizeForSearch(dossier.description);
      const normCat = normalizeForSearch(dossier.category);
      const normTags = normalizeForSearch(dossier.tags.join(" "));

      if (normTitle.includes(normQuery)) {
        dossierMatchedQuery = true;
        dossierScore += 100;
        dossierMatchField = "title";
        const hit = extractExactHitSnippet(dossier.title, rawQuery);
        dossierSnippet = hit.snippet || dossier.description;
      } else if (normDesc.includes(normQuery)) {
        dossierMatchedQuery = true;
        dossierScore += 70;
        dossierMatchField = "description";
        const hit = extractExactHitSnippet(dossier.description, rawQuery);
        dossierSnippet = hit.snippet;
      } else if (normTags.includes(normQuery)) {
        dossierMatchedQuery = true;
        dossierScore += 60;
        dossierMatchField = "entities";
        dossierSnippet = `Tags: ${dossier.tags.join(", ")}`;
      } else if (normCat.includes(normQuery)) {
        dossierMatchedQuery = true;
        dossierScore += 50;
        dossierMatchField = "dossier";
        dossierSnippet = `Categorie: ${dossier.category}`;
      }
    }

    if (dossierMatchedQuery && typeFilter !== "documents") {
      matchedDossiersMap.set(dossier.slug, dossier);
      addHit({
        type: "dossier",
        id: `dossier-${dossier.slug}`,
        title: dossier.title,
        dossierName: dossier.title,
        dossierSlug: dossier.slug,
        category: dossier.category,
        description: dossier.description,
        documentCount: dossier.documentCount,
        uploadedCount: dossier.uploadedCount,
        date: dossier.dateRange.end || dossier.dateRange.start,
        matchField: dossierMatchField,
        snippet: dossierSnippet || dossier.description,
        score: dossierScore || 10,
      });
    }

    // 5. Match individual Documents in this Dossier
    for (const doc of dossier.documents) {
      if (hasFilesOnly && !doc.fileExists) {
        continue;
      }

      // Date filtering for document
      const docDateIso = parseDateToIso(doc.datum);
      if (isoStart && docDateIso && docDateIso < isoStart) {
        continue;
      }
      if (isoEnd && docDateIso && docDateIso > isoEnd) {
        continue;
      }

      const isFav = userFavorites.has(doc.bestandsnaam.toLowerCase().trim());

      // If no query string, every doc meeting the filters matches
      if (!normQuery) {
        if (typeFilter !== "dossiers") {
          matchedDocumentsMap.set(doc.bestandsnaam, {
            ...doc,
            // If user filtered by date, show within dossier
          });
          addHit({
            type: "document",
            id: `doc-${doc.id}`,
            title: doc.titel,
            filename: doc.bestandsnaam,
            dossierName: doc.dossier,
            dossierSlug: dossier.slug,
            date: doc.datum,
            matchField: "title",
            score: 10,
            fileExists: doc.fileExists,
            fileUrl: doc.fileUrl,
            isFavorite: isFav,
          });
        }
        continue;
      }

      // Full text & metadata matching with exact phrase
      const normDocTitle = normalizeForSearch(doc.titel);
      const normDocFilename = normalizeForSearch(doc.bestandsnaam);
      const normEntities = normalizeForSearch(doc.entiteiten.join(" "));
      const normRelations = normalizeForSearch(doc.relaties.join(" "));

      let docMatched = false;
      let docScore = 0;
      let docMatchField: SearchHit["matchField"] = "title";
      let docSnippet = "";

      if (normDocTitle.includes(normQuery)) {
        docMatched = true;
        docScore = 95;
        docMatchField = "title";
        const hit = extractExactHitSnippet(doc.titel, rawQuery);
        docSnippet = hit.snippet;
      } else if (normDocFilename.includes(normQuery)) {
        docMatched = true;
        docScore = 85;
        docMatchField = "filename";
        const hit = extractExactHitSnippet(doc.bestandsnaam, rawQuery);
        docSnippet = hit.snippet;
      } else if (normEntities.includes(normQuery)) {
        docMatched = true;
        docScore = 65;
        docMatchField = "entities";
        const hit = extractExactHitSnippet(doc.entiteiten.join(", "), rawQuery);
        docSnippet = `Entiteiten: ${hit.snippet}`;
      } else if (normRelations.includes(normQuery)) {
        docMatched = true;
        docScore = 60;
        docMatchField = "relations";
        const hit = extractExactHitSnippet(doc.relaties.join(", "), rawQuery);
        docSnippet = `Relaties: ${hit.snippet}`;
      } else if (doc.fileExists) {
        // Search inside the physical document file content (e.g. PDF text)
        const fileContent = await getDocumentContent(doc.bestandsnaam);
        if (fileContent) {
          const hit = extractExactHitSnippet(fileContent, rawQuery);
          if (hit.matched) {
            docMatched = true;
            docScore = 80;
            docMatchField = "content";
            docSnippet = hit.snippet;
          }
        }
      }

      if (docMatched && typeFilter !== "dossiers") {
        matchedDocumentsMap.set(doc.bestandsnaam, doc);
        addHit({
          type: "document",
          id: `doc-${doc.id}`,
          title: doc.titel,
          filename: doc.bestandsnaam,
          dossierName: doc.dossier,
          dossierSlug: dossier.slug,
          date: doc.datum,
          matchField: docMatchField,
          snippet: docSnippet || `${doc.dossier} • ${doc.bestandsnaam}`,
          score: docScore,
          fileExists: doc.fileExists,
          fileUrl: doc.fileUrl,
          isFavorite: isFav,
        });

        // Also ensure the parent dossier is marked as a hit if type is "all"
        if (!matchedDossiersMap.has(dossier.slug) && typeFilter === "all") {
          matchedDossiersMap.set(dossier.slug, dossier);
        }
      }
    }
  }

  // Sort hits by score (descending)
  matchedHits.sort((a, b) => b.score - a.score);

  const tookMs = Math.round((performance.now() - startTime) * 10) / 10;

  return {
    query: rawQuery,
    exactPhrase,
    tookMs,
    totalHits: matchedHits.length,
    totalDossiers: matchedDossiersMap.size,
    totalDocuments: matchedDocumentsMap.size,
    hits: matchedHits,
    dossiers: Array.from(matchedDossiersMap.values()),
    documents: Array.from(matchedDocumentsMap.values()),
  };
}
