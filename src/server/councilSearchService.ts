import { getAllDossiers, getDossiers, getDossierBySlug } from "./dossierManager.js";
import { getHoogeveenDossiers } from "./hoogeveenDossierManager.js";
import {
  getCachedDocumentContentOnly,
  normalizeForSearch,
  extractExactHitSnippet,
  extractTokensHitSnippet,
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
  municipality?: "steenwijkerland" | "hoogeveen";
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

const safeJoin = (val: any): string => {
  if (!val) return "";
  if (Array.isArray(val)) return val.filter(Boolean).join(" ");
  return String(val);
};

const safeCommaJoin = (val: any): string => {
  if (!val) return "";
  if (Array.isArray(val)) return val.filter(Boolean).join(", ");
  return String(val);
};

/**
 * Perform Meilisearch-style high speed exact full-text search across dossiers and documents
 */
export async function executeCouncilSearch(params: CouncilSearchParams): Promise<CouncilSearchResponse> {
  const startTime = performance.now();

  const rawQuery = (params.query || "").trim();
  const exactPhrase = params.exactPhrase !== false; // User toggle (default true)
  // Clean query of trailing file artifacts (like ".pdf" or " 28 KB.pdf") for resilient title matching
  const cleanedQuery = rawQuery
    .replace(/\.pdf\s+\d+\s*(?:kb|mb|bytes)?(?:\.pdf)?$/i, "")
    .replace(/\s+\d+\s*(?:kb|mb|bytes)\.pdf$/i, "")
    .replace(/\.pdf$/i, "")
    .replace(/\s*\(\s*\d+\s*(?:kb|mb|bytes)\s*\)$/i, "")
    .trim();
  const normQuery = normalizeForSearch(cleanedQuery || rawQuery);
  const typeFilter = params.type || "all";

  // Tokenize query words (minimum 2 chars) for multi-token and flexible matching
  const queryTokens = normQuery.split(/\s+/).filter((t) => t.length >= 2);

  const isoStart = parseDateToIso(params.startDate);
  const isoEnd = parseDateToIso(params.endDate);
  const minFiles = typeof params.minFiles === "number" ? params.minFiles : 0;
  const maxFiles = typeof params.maxFiles === "number" && params.maxFiles > 0 ? params.maxFiles : 9999;
  const categoryFilter = params.category && params.category !== "all" ? params.category.toLowerCase() : null;
  const hasFilesOnly = params.hasFiles === true;

  const userFavorites = params.userId ? getUserFavoriteFilenames(params.userId) : new Set<string>();

  // Fetch all compiled dossiers including custom SQLite entries according to municipality
  const targetMunicipality = (params.municipality || "steenwijkerland").toLowerCase().trim() === "hoogeveen" ? "hoogeveen" : "steenwijkerland";
  const db = getDbFromSqlite();
  let allDossiers: Dossier[] = [];
  if (targetMunicipality === "hoogeveen") {
    const hoogeveenDossiers = getHoogeveenDossiers();
    const customHoogeveen = (db.customDossiers || []).filter((d: any) => (d.municipality || "").toLowerCase() === "hoogeveen");
    allDossiers = [...hoogeveenDossiers, ...customHoogeveen];
  } else {
    const customSwl = (db.customDossiers || []).filter((d: any) => (d.municipality || "steenwijkerland").toLowerCase() === "steenwijkerland");
    allDossiers = getAllDossiers(customSwl, db.deletedDossierSlugs || [], db.customSubdossiers || {});
  }

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
    if (minFiles > 0 && dossier.documentCount < minFiles) continue;
    if (typeof params.maxFiles === "number" && params.maxFiles > 0 && params.maxFiles < 35 && dossier.documentCount > params.maxFiles) continue;

    // 2. Category filter
    if (categoryFilter && dossier.category.toLowerCase() !== categoryFilter) {
      continue;
    }

    // 3. Period / Timeline filter for dossier
    let dossierTimelineMatch = true;
    const dStart = dossier.dateRange?.start ? parseDateToIso(dossier.dateRange.start) : null;
    const dEnd = dossier.dateRange?.end ? parseDateToIso(dossier.dateRange.end) : null;

    if (isoStart) {
      const activeAfterStart = (dEnd && dEnd >= isoStart) || dossier.documents.some((d) => d.datum && d.datum >= isoStart);
      if (!activeAfterStart) {
        dossierTimelineMatch = false;
      }
    }

    if (isoEnd && dossierTimelineMatch) {
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

      // Level 1: Exact Phrase
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
      } else if (queryTokens.length > 1) {
        // Level 2: All Tokens match in title or description
        const allInTitle = queryTokens.every((t) => normTitle.includes(t));
        const allInDesc = queryTokens.every((t) => normDesc.includes(t));
        const allInCombo = queryTokens.every((t) => normTitle.includes(t) || normDesc.includes(t) || normTags.includes(t));

        if (allInTitle) {
          dossierMatchedQuery = true;
          dossierScore += 85;
          dossierMatchField = "title";
          const hit = extractTokensHitSnippet(dossier.title, queryTokens);
          dossierSnippet = hit.snippet || dossier.description;
        } else if (allInDesc) {
          dossierMatchedQuery = true;
          dossierScore += 65;
          dossierMatchField = "description";
          const hit = extractTokensHitSnippet(dossier.description, queryTokens);
          dossierSnippet = hit.snippet;
        } else if (allInCombo) {
          dossierMatchedQuery = true;
          dossierScore += 55;
          dossierMatchField = "title";
          const hit = extractTokensHitSnippet(dossier.title + " " + dossier.description, queryTokens);
          dossierSnippet = hit.snippet;
        }
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
        date: dossier.dateRange?.end || dossier.dateRange?.start || null,
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
          matchedDocumentsMap.set(doc.bestandsnaam, doc);
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

      // Multi-level exact & token matching across metadata and file content
      const normDocTitle = normalizeForSearch(doc.titel);
      const normDocFilename = normalizeForSearch(doc.bestandsnaam);
      const normSubdossier = normalizeForSearch(doc.subdossier || "");
      const normEntities = normalizeForSearch(safeJoin(doc.entiteiten));
      const normRelations = normalizeForSearch(safeJoin(doc.relaties));
      const combinedDocMeta = `${normDocTitle} ${normDocFilename} ${normSubdossier} ${normEntities} ${normRelations}`;

      let docMatched = false;
      let docScore = 0;
      let docMatchField: SearchHit["matchField"] = "title";
      let docSnippet = "";

      // LEVEL 1: Exact phrase match
      if (normDocTitle.includes(normQuery)) {
        docMatched = true;
        docScore = 100;
        docMatchField = "title";
        const hit = extractExactHitSnippet(doc.titel, rawQuery);
        docSnippet = hit.snippet;
      } else if (normDocFilename.includes(normQuery)) {
        docMatched = true;
        docScore = 95;
        docMatchField = "filename";
        const hit = extractExactHitSnippet(doc.bestandsnaam, rawQuery);
        docSnippet = hit.snippet;
      } else if (normSubdossier && normSubdossier.includes(normQuery)) {
        docMatched = true;
        docScore = 90;
        docMatchField = "title";
        const hit = extractExactHitSnippet(doc.subdossier!, rawQuery);
        docSnippet = `Subdossier: ${hit.snippet}`;
      } else if (normEntities && normEntities.includes(normQuery)) {
        docMatched = true;
        docScore = 70;
        docMatchField = "entities";
        const hit = extractExactHitSnippet(safeCommaJoin(doc.entiteiten), rawQuery);
        docSnippet = `Entiteiten: ${hit.snippet}`;
      } else if (normRelations && normRelations.includes(normQuery)) {
        docMatched = true;
        docScore = 65;
        docMatchField = "relations";
        const hit = extractExactHitSnippet(safeCommaJoin(doc.relaties), rawQuery);
        docSnippet = `Relaties: ${hit.snippet}`;
      }

      // Check cached text content for exact phrase if not already matched
      let cachedContent: string | null = null;
      if (!docMatched && doc.fileExists) {
        cachedContent = await getCachedDocumentContentOnly(doc.bestandsnaam);
        if (cachedContent) {
          const hit = extractExactHitSnippet(cachedContent, rawQuery);
          if (hit.matched) {
            docMatched = true;
            docScore = 80;
            docMatchField = "content";
            docSnippet = hit.snippet;
          }
        }
      }

      // LEVEL 2: All query tokens present in document (in any order)
      if (!docMatched && queryTokens.length > 1) {
        const allInTitle = queryTokens.every((t) => normDocTitle.includes(t));
        const allInFilename = queryTokens.every((t) => normDocFilename.includes(t));
        const allInSubdossier = normSubdossier ? queryTokens.every((t) => normSubdossier.includes(t)) : false;
        const allInMeta = queryTokens.every((t) => combinedDocMeta.includes(t));

        if (allInTitle) {
          docMatched = true;
          docScore = 90;
          docMatchField = "title";
          const hit = extractTokensHitSnippet(doc.titel, queryTokens);
          docSnippet = hit.snippet;
        } else if (allInFilename) {
          docMatched = true;
          docScore = 85;
          docMatchField = "filename";
          const hit = extractTokensHitSnippet(doc.bestandsnaam, queryTokens);
          docSnippet = hit.snippet;
        } else if (allInSubdossier) {
          docMatched = true;
          docScore = 82;
          docMatchField = "title";
          const hit = extractTokensHitSnippet(doc.subdossier!, queryTokens);
          docSnippet = `Subdossier: ${hit.snippet}`;
        } else if (allInMeta) {
          docMatched = true;
          docScore = 75;
          docMatchField = "title";
          const hit = extractTokensHitSnippet(doc.titel + " " + (doc.subdossier || "") + " " + safeJoin(doc.entiteiten), queryTokens);
          docSnippet = hit.snippet;
        } else if (doc.fileExists) {
          if (!cachedContent) cachedContent = await getCachedDocumentContentOnly(doc.bestandsnaam);
          if (cachedContent) {
            const normText = normalizeForSearch(cachedContent);
            const allInContent = queryTokens.every((t) => normText.includes(t));
            if (allInContent) {
              docMatched = true;
              docScore = 70;
              docMatchField = "content";
              const hit = extractTokensHitSnippet(cachedContent, queryTokens);
              docSnippet = hit.snippet;
            }
          }
        }
      }

      // LEVEL 3: Flexible partial token match (fallback for multi-word search)
      if (!docMatched && queryTokens.length >= 2) {
        let matchedCount = 0;
        for (const t of queryTokens) {
          if (combinedDocMeta.includes(t)) matchedCount++;
        }
        const ratio = matchedCount / queryTokens.length;
        if (ratio >= 0.5 || (queryTokens.length >= 3 && matchedCount >= 2)) {
          docMatched = true;
          docScore = Math.round(50 * ratio);
          docMatchField = "title";
          const hit = extractTokensHitSnippet(doc.titel + " " + (doc.subdossier || "") + " " + doc.bestandsnaam, queryTokens);
          docSnippet = hit.snippet;
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

  // Map dossiers to lightweight objects without full document arrays to keep payload small and fast
  const lightMatchedDossiers = Array.from(matchedDossiersMap.values()).map((d) => ({
    ...d,
    documents: [],
  }));

  return {
    query: rawQuery,
    exactPhrase,
    tookMs,
    totalHits: matchedHits.length,
    totalDossiers: matchedDossiersMap.size,
    totalDocuments: matchedDocumentsMap.size,
    hits: matchedHits,
    dossiers: lightMatchedDossiers,
    documents: Array.from(matchedDocumentsMap.values()),
  };
}
