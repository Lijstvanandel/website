import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { persistSqlite, schedulePersist, getRawSqliteDb } from "./sqliteDatabase.js";
import { GoogleGenAI } from "@google/genai";
import { hoofdstukken } from "../data/partijprogramma.js";
import { MatchedStandpunt, TopicStandpuntSummary, StandpuntStance } from "../types/council.js";

const STEENWIJKERLAND_REPORT_API = "https://steenwijkerland.bestuurlijkeinformatie.nl/Reports/GetReportData/18b100eb-2dba-433e-8737-2dc373dd88e1";
const STEENWIJKERLAND_ITEM_BASE = "https://steenwijkerland.bestuurlijkeinformatie.nl/Reports/Item/";
const STEENWIJKERLAND_BASE = "https://steenwijkerland.bestuurlijkeinformatie.nl";

const SQLITE_FILE = process.env.DATABASE_PATH || path.join(process.cwd(), "database.sqlite");

// Lazy Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

export interface ToezeggingBijlage {
  title: string;
  url: string;
  size?: string;
}

export interface ToezeggingItem {
  id: string; // e.g. "swl_toezegging_5862cba2" or "hgv_toezegging_1206790"
  rowId: string; // DT_RowId or Notubiz item id
  identity: string; // e.g. "312" or "1206790"
  datum: string; // "22-09-2026"
  datumIso?: string; // "2026-09-22"
  year?: number;
  title: string;
  toezeggingText: string;
  toelichting?: string;
  portefeuillehouder: string;
  deadline?: string | null;
  deadlineIso?: string | null;
  datumAfdoening?: string | null;
  datumAfdoeningIso?: string | null;
  status: string;
  isAfgedaan: boolean;
  isOverdue?: boolean;
  standVanZaken?: string;
  agendapuntTitle?: string;
  agendapuntUrl?: string;
  bijlagen?: ToezeggingBijlage[];
  municipality: string;
  detailFetched?: boolean;
  matchedStandpunten?: MatchedStandpunt[];
  standpuntSummary?: TopicStandpuntSummary;
  updatedAt: string;
  createdAt?: string;
}

export interface ToezeggingQueryOptions {
  municipality?: string;
  status?: "all" | "open" | "afgedaan" | "overdue";
  portefeuillehouder?: string;
  year?: string | number;
  search?: string;
  page?: number;
  limit?: number;
  sort?: "date_desc" | "date_asc" | "deadline_asc" | "deadline_desc" | "id_desc" | "id_asc";
}

export interface ToezeggingStats {
  total: number;
  open: number;
  afgedaan: number;
  overdue: number;
  withDeadline: number;
  byPortefeuillehouder: { [name: string]: { total: number; open: number; afgedaan: number } };
  byYear: { [year: string]: { total: number; open: number; afgedaan: number } };
  lastSyncedAt?: string;
}

function parseDutchDate(dStr?: string | null): { iso: string; year: number } | null {
  if (!dStr) return null;
  const parts = dStr.trim().split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      return { iso: `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`, year };
    } else if (parts[2].length === 4) {
      const year = parseInt(parts[2], 10);
      return { iso: `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`, year };
    }
  }
  return null;
}

function cleanHtmlEntities(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// In-memory runtime cache for lightning-fast querying
let memoryToezeggingenCache: ToezeggingItem[] = [];
let lastSyncTimestamp: string | null = null;
let isSyncingSWL = false;

/**
 * Read all toezeggingen from SQLite
 */
export function getAllToezeggingenFromDb(municipality?: string): ToezeggingItem[] {
  try {
    if (memoryToezeggingenCache.length === 0) {
      const db = getRawSqliteDb();
      if (db) {
        db.run("CREATE TABLE IF NOT EXISTS councilToezeggingen (id TEXT PRIMARY KEY, data TEXT)");
        const rows = db.exec("SELECT data FROM councilToezeggingen");
        if (rows.length > 0 && rows[0].values && rows[0].values.length > 0) {
          memoryToezeggingenCache = rows[0].values.map((v: any) => {
            try {
              return JSON.parse(v[0]);
            } catch {
              return null;
            }
          }).filter(Boolean);
        } else {
          // Database is brand new/empty -> Seed from pre-baked seed file for instant VPS & deployment availability
          try {
            const seedFilePath = path.join(process.cwd(), "src", "server", "seedToezeggingen.json");
            if (fs.existsSync(seedFilePath)) {
              const seedDataRaw = fs.readFileSync(seedFilePath, "utf8");
              const seedItems: ToezeggingItem[] = JSON.parse(seedDataRaw);
              if (Array.isArray(seedItems) && seedItems.length > 0) {
                console.log(`[LTA SEED] Eerste start: Laden van ${seedItems.length} gebundelde toezeggingen naar database...`);
                saveToezeggingenToDb(seedItems);
              }
            }
          } catch (seedErr) {
            console.warn("[LTA SEED ERROR]:", seedErr);
          }
        }
      }
    }

    if (municipality && municipality !== "all") {
      const targetMuni = municipality.toLowerCase().trim();
      return memoryToezeggingenCache.filter((it) => (it.municipality || "steenwijkerland") === targetMuni);
    }
    return memoryToezeggingenCache;
  } catch (err) {
    console.warn("[TOEZEGGINGEN DB READ ERROR]:", err);
  }
  return memoryToezeggingenCache.filter((item) => !municipality || municipality === "all" || item.municipality === municipality);
}

/**
 * Save / Merge items into SQLite database and memory cache
 */
export function saveToezeggingenToDb(itemsToSave: ToezeggingItem[]) {
  const map = new Map<string, ToezeggingItem>();
  for (const existing of memoryToezeggingenCache) {
    map.set(existing.id, existing);
  }
  for (const newIt of itemsToSave) {
    map.set(newIt.id, newIt);
  }

  memoryToezeggingenCache = Array.from(map.values());
  lastSyncTimestamp = new Date().toISOString();

  try {
    const db = getRawSqliteDb();
    if (db) {
      db.run("CREATE TABLE IF NOT EXISTS councilToezeggingen (id TEXT PRIMARY KEY, data TEXT)");
      db.run("BEGIN TRANSACTION;");
      for (const item of itemsToSave) {
        db.run("INSERT OR REPLACE INTO councilToezeggingen (id, data) VALUES (?, ?)", [
          item.id,
          JSON.stringify(item),
        ]);
      }
      db.run("COMMIT;");
      persistSqlite();
    }
  } catch (err) {
    console.error("[TOEZEGGINGEN DB WRITE ERROR]:", err);
  }
}

/**
 * Fetch detail fields for a single toezegging item from Steenwijkerland iBabs
 */
async function fetchToezeggingDetail(rowId: string): Promise<Partial<ToezeggingItem> | null> {
  try {
    const url = `${STEENWIJKERLAND_ITEM_BASE}${rowId}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    const fields: { [k: string]: string } = {};
    const dtRegex = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
    let match;
    while ((match = dtRegex.exec(html)) !== null) {
      const key = cleanHtmlEntities(match[1].replace(/<[^>]+>/g, ""));
      const val = match[2].trim();
      fields[key] = val;
    }

    const toezeggingText = cleanHtmlEntities((fields["Toezegging"] || "").replace(/<[^>]+>/g, ""));
    const toelichting = cleanHtmlEntities((fields["Toelichting"] || "").replace(/<[^>]+>/g, ""));
    const standVanZaken = cleanHtmlEntities((fields["Stand van zaken"] || "").replace(/<[^>]+>/g, ""));

    const afgedaanHtml = fields["Afgedaan"] || "";
    const isAfgedaan =
      afgedaanHtml.includes("fa-check-square") ||
      (afgedaanHtml.toLowerCase().includes("afgedaan") && !afgedaanHtml.toLowerCase().includes("niet afgedaan"));

    let agendapuntTitle = "";
    let agendapuntUrl = "";
    const agendaLinkMatch = (fields["Agendapunt"] || "").match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (agendaLinkMatch) {
      agendapuntUrl = agendaLinkMatch[1].startsWith("http") ? agendaLinkMatch[1] : `${STEENWIJKERLAND_BASE}${agendaLinkMatch[1]}`;
      agendapuntTitle = cleanHtmlEntities(agendaLinkMatch[2].replace(/<[^>]+>/g, " "));
    } else if (fields["Agendapunt"]) {
      agendapuntTitle = cleanHtmlEntities(fields["Agendapunt"].replace(/<[^>]+>/g, " "));
    }

    const bijlagen: ToezeggingBijlage[] = [];
    const attachHtml = fields["Bijlage(s)"] || "";
    const attachRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let aMatch;
    while ((aMatch = attachRegex.exec(attachHtml)) !== null) {
      const rawHref = aMatch[1];
      const attachUrl = rawHref.startsWith("http") ? rawHref : `${STEENWIJKERLAND_BASE}${rawHref}`;
      const attachTitle = cleanHtmlEntities(aMatch[2].replace(/<[^>]+>/g, ""));
      if (attachTitle) {
        bijlagen.push({
          title: attachTitle,
          url: attachUrl,
        });
      }
    }

    return {
      toezeggingText: toezeggingText || undefined,
      toelichting,
      standVanZaken,
      isAfgedaan,
      agendapuntTitle,
      agendapuntUrl,
      bijlagen,
      detailFetched: true,
    };
  } catch (_err) {
    return null;
  }
}

/**
 * Concurrently run async tasks with a pool
 */
async function promisePool<T, R>(
  items: T[],
  concurrency: number,
  taskFn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      try {
        results[idx] = await taskFn(items[idx], idx);
      } catch (_err) {
        // tolerate failure
      }
    }
  });

  await Promise.all(workers);
  return results;
}


/**
 * Synchronize full LTA Toezeggingen list and details from Steenwijkerland iBabs portal
 */
export async function syncSteenwijkerlandToezeggingen(options: {
  fetchFullDetails?: boolean;
  concurrency?: number;
} = {}): Promise<{
  totalFetched: number;
  newCount: number;
  updatedCount: number;
  openCount: number;
  afgedaanCount: number;
  lastSyncedAt: string;
}> {
  if (isSyncingSWL) {
    console.log("[LTA STEENWIJKERLAND] Synchronisatie is reeds bezig...");
    const current = getAllToezeggingenFromDb("steenwijkerland");
    return {
      totalFetched: current.length,
      newCount: 0,
      updatedCount: 0,
      openCount: current.filter((i) => !i.isAfgedaan).length,
      afgedaanCount: current.filter((i) => i.isAfgedaan).length,
      lastSyncedAt: lastSyncTimestamp || new Date().toISOString(),
    };
  }

  isSyncingSWL = true;
  console.log("[LTA STEENWIJKERLAND] Start volledige synchronisatie met Steenwijkerland iBabs...");
  const fetchFullDetails = options.fetchFullDetails !== false;
  const concurrency = options.concurrency || 8;

  try {
    const rawRows: any[] = [];
    let start = 0;
    const pageSize = 100;
    let recordsTotal = 0;

    try {
      while (true) {
        const res = await fetch(STEENWIJKERLAND_REPORT_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          body: `draw=1&start=${start}&length=${pageSize}`,
          signal: AbortSignal.timeout(25000),
        });

        if (!res.ok) {
          throw new Error(`iBabs Toezeggingen rapport API gaf HTTP status ${res.status}`);
        }

        const payload: any = await res.json();
        recordsTotal = payload.recordsTotal || 0;
        const rows: any[] = Array.isArray(payload.data) ? payload.data : [];
        if (rows.length === 0) break;

        rawRows.push(...rows);
        start += rows.length;
        if (start >= recordsTotal) break;
      }
    } catch (swlFetchErr: any) {
      const current = getAllToezeggingenFromDb("steenwijkerland");
      console.log(`[LTA STEENWIJKERLAND] Externe iBabs server niet direct bereikbaar (${swlFetchErr?.name === "TimeoutError" ? "time-out" : swlFetchErr?.message || swlFetchErr}). Actief met ${current.length} lokale toezeggingen.`);
      return {
        totalFetched: current.length,
        newCount: 0,
        updatedCount: 0,
        openCount: current.filter((i) => !i.isAfgedaan).length,
        afgedaanCount: current.filter((i) => i.isAfgedaan).length,
        lastSyncedAt: lastSyncTimestamp || new Date().toISOString(),
      };
    }

    console.log(`[LTA STEENWIJKERLAND] ${rawRows.length} van totaal ${recordsTotal} toezeggingen rijen opgehaald.`);

    const existingMap = new Map<string, ToezeggingItem>();
    const currentDbItems = getAllToezeggingenFromDb("steenwijkerland");
    for (const item of currentDbItems) {
      existingMap.set(item.rowId, item);
    }

    const now = new Date().toISOString();
    const todayIso = now.slice(0, 10);
    let newCount = 0;
    let updatedCount = 0;

    const baseItems: ToezeggingItem[] = rawRows.map((row) => {
      const existing = existingMap.get(row.DT_RowId);
      const parsedDatum = parseDutchDate(row.datum);
      const parsedDeadline = parseDutchDate(row.einddatum);
      const parsedAfdoening = parseDutchDate(row.datumafdoening);

      const isAfgedaanFromRow = Boolean(
        row.datumafdoening ||
        (row.status && row.status.toLowerCase().includes("afgedaan")) ||
        (existing && existing.isAfgedaan)
      );

      const rawStatus = cleanHtmlEntities(row.status || (isAfgedaanFromRow ? "Afgedaan" : "Openstaand"));

      let isOverdue = false;
      if (!isAfgedaanFromRow && parsedDeadline?.iso) {
        if (parsedDeadline.iso < todayIso) {
          isOverdue = true;
        }
      }

      if (!existing) {
        newCount++;
      } else {
        updatedCount++;
      }

      return {
        id: existing?.id || `swl_toezegging_${row.DT_RowId}`,
        rowId: row.DT_RowId,
        identity: String(row.identity || "").trim(),
        datum: String(row.datum || "").trim(),
        datumIso: parsedDatum?.iso,
        year: parsedDatum?.year || (parsedDatum?.iso ? parseInt(parsedDatum.iso.slice(0, 4), 10) : 2026),
        title: cleanHtmlEntities(row.title || ""),
        toezeggingText: existing?.toezeggingText || cleanHtmlEntities(row.title || ""),
        toelichting: existing?.toelichting || "",
        portefeuillehouder: cleanHtmlEntities(row.portefeuillehouder || "Onbekend"),
        deadline: row.einddatum ? String(row.einddatum).trim() : null,
        deadlineIso: parsedDeadline?.iso || null,
        datumAfdoening: row.datumafdoening ? String(row.datumafdoening).trim() : null,
        datumAfdoeningIso: parsedAfdoening?.iso || null,
        status: rawStatus,
        isAfgedaan: isAfgedaanFromRow,
        isOverdue,
        standVanZaken: existing?.standVanZaken || "",
        agendapuntTitle: existing?.agendapuntTitle || "",
        agendapuntUrl: existing?.agendapuntUrl || "",
        bijlagen: existing?.bijlagen || [],
        municipality: "steenwijkerland",
        detailFetched: existing?.detailFetched || false,
        updatedAt: now,
        createdAt: existing?.createdAt || now,
      };
    });

    saveToezeggingenToDb(baseItems);

    if (fetchFullDetails) {
      const itemsToFetchDetails = baseItems.filter(
        (item) => !item.detailFetched || !item.toezeggingText || item.toezeggingText === item.title
      );

      if (itemsToFetchDetails.length > 0) {
        console.log(`[LTA STEENWIJKERLAND] Ophalen detailpagina's voor ${itemsToFetchDetails.length} toezeggingen...`);

        await promisePool(itemsToFetchDetails, concurrency, async (item) => {
          const details = await fetchToezeggingDetail(item.rowId);
          if (details) {
            if (details.toezeggingText) item.toezeggingText = details.toezeggingText;
            if (details.toelichting !== undefined) item.toelichting = details.toelichting;
            if (details.standVanZaken !== undefined) item.standVanZaken = details.standVanZaken;
            if (details.isAfgedaan !== undefined) {
              item.isAfgedaan = details.isAfgedaan;
              if (item.isAfgedaan && !item.status.toLowerCase().includes("afgedaan")) {
                item.status = "Afgedaan";
              }
            }
            if (details.agendapuntTitle) item.agendapuntTitle = details.agendapuntTitle;
            if (details.agendapuntUrl) item.agendapuntUrl = details.agendapuntUrl;
            if (details.bijlagen && details.bijlagen.length > 0) item.bijlagen = details.bijlagen;
            item.detailFetched = true;

            if (item.isAfgedaan) {
              item.isOverdue = false;
            }
          }
        });

        saveToezeggingenToDb(baseItems);
      }
    }

    const openCount = baseItems.filter((i) => !i.isAfgedaan).length;
    const afgedaanCount = baseItems.filter((i) => i.isAfgedaan).length;

    console.log(`[LTA STEENWIJKERLAND] Synchronisatie succesvol voltooid. Totaal: ${baseItems.length} (Open: ${openCount}, Afgedaan: ${afgedaanCount}).`);

    return {
      totalFetched: baseItems.length,
      newCount,
      updatedCount,
      openCount,
      afgedaanCount,
      lastSyncedAt: now,
    };
  } finally {
    isSyncingSWL = false;
  }
}

/**
 * Use Gemini AI to semantically match and link relevant party standpoints to a B&W Promise / Toezegging
 */
export async function matchToezeggingWithStandpunten(item: ToezeggingItem): Promise<ToezeggingItem> {
  if (item.matchedStandpunten && item.matchedStandpunten.length > 0) {
    return item;
  }

  const ai = getGemini();
  if (!ai) {
    return item;
  }

  try {
    const activeChapters = hoofdstukken;
    const partyName = "Lijst van Andel";
    const municipalityName = "Steenwijkerland";

    const programmaLines = [];
    for (const h of activeChapters) {
      programmaLines.push(`\n### HOOFDSTUK ${h.nr}: ${h.titel.toUpperCase()}`);
      for (const s of h.standpunten) {
        programmaLines.push(`- H${h.nr}.${s.nr}: "${s.titel}" -> ${s.standpunt}`);
      }
    }
    const programmaContext = programmaLines.join("\n");

    const prompt = `Je bent de politieke fractie-analist van ${partyName} in de gemeenteraad van ${municipalityName}.
Je taak is om een officiële toezegging/belofte van het college van Burgemeester en Wethouders (B&W) te analyseren en te koppelen aan de relevante standpunten uit ons partijprogramma.

TOEZEGGING DETAILS:
- ID: "${item.identity}"
- Onderwerp: "${item.title}"
- Gedane Belofte / Citaat: "${item.toezeggingText}"
- Portefeuillehouder: "${item.portefeuillehouder}"
- Stand van Zaken / Toelichting: "${item.toelichting || item.standVanZaken || ""}"
- Status: "${item.status}" (${item.isAfgedaan ? "Afgedaan" : "Openstaand"})

ONS PARTIJPROGRAMMA:
${programmaContext}

OPDRACHT:
Koppel de toezegging aan de meest relevante standpunten uit ons partijprogramma (meestal 1 tot 3 standpunten). Bepaal of deze toezegging een positieve, negatieve of genuanceerde invloed heeft op onze standpunten.

GEEF UITSLUITEND ANTWOORD IN DIT JSON FORMAAT (GEEN MARKDOWN OF ANDERE TEKST):
{
  "standpunten": [
    {
      "hoofdstukNr": 1-10,
      "standpuntNr": 1-20,
      "stance": "positief" | "negatief" | "genuanceerd",
      "explanation": "Inhoudelijke toelichting waarom deze toezegging raakvlakken heeft met ons standpunt en wat dit betekent voor onze fractiepositionering."
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const raw = response.text?.trim() || "";
    const cleanJson = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    if (cleanJson) {
      const parsed = JSON.parse(cleanJson);
      if (parsed && Array.isArray(parsed.standpunten)) {
        const matched: MatchedStandpunt[] = parsed.standpunten.map((sp: any, idx: number) => {
          const h = activeChapters.find((ch) => ch.nr === Number(sp.hoofdstukNr));
          const st = h?.standpunten.find((stItem) => stItem.nr === Number(sp.standpuntNr));

          return {
            id: `${item.id}_ai_h${sp.hoofdstukNr}_s${sp.standpuntNr}_${idx}`,
            hoofdstukNr: Number(sp.hoofdstukNr),
            hoofdstukTitel: h ? h.titel : `Hoofdstuk ${sp.hoofdstukNr}`,
            standpuntNr: Number(sp.standpuntNr),
            standpuntTitel: st ? st.titel : `Standpunt ${sp.standpuntNr}`,
            standpuntText: st ? st.standpunt : "",
            stance: (sp.stance === "positief" || sp.stance === "negatief" || sp.stance === "genuanceerd" ? sp.stance : "genuanceerd") as StandpuntStance,
            explanation: sp.explanation || "",
            relevanceScore: 90,
            matchedKeywords: ["AI Gemini Link"],
            manuallyAdjusted: false,
            adjustedBy: "Gemini 2.5 Flash",
            adjustedAt: new Date().toISOString(),
          };
        });

        item.matchedStandpunten = matched;

        const posCount = matched.filter((m) => m.stance === "positief").length;
        const negCount = matched.filter((m) => m.stance === "negatief").length;
        const genCount = matched.filter((m) => m.stance === "genuanceerd").length;

        item.standpuntSummary = {
          total: matched.length,
          positiefCount: posCount,
          negatiefCount: negCount,
          genuanceerdCount: genCount,
          primaryStance: negCount > 0 ? "negatief" : posCount > 0 ? "positief" : "neutraal",
          summaryText: `AI-Koppeling: Gekoppeld met ${matched.length} standpunt(en) van de fractie.`,
          keyArguments: matched.map((m) => m.explanation),
        };
      }
    }
  } catch (err) {
    console.warn("[LTA STANDPUNT MATCH ERR]:", err);
  }

  return item;
}

/**
 * Query and filter toezeggingen with rich stats
 */
export function queryToezeggingen(options: ToezeggingQueryOptions = {}) {
  const municipality = (options.municipality || "steenwijkerland").toLowerCase().trim();
  let items = getAllToezeggingenFromDb(municipality);

  // Status filter
  if (options.status && options.status !== "all") {
    if (options.status === "open") {
      items = items.filter((i) => !i.isAfgedaan);
    } else if (options.status === "afgedaan") {
      items = items.filter((i) => i.isAfgedaan);
    } else if (options.status === "overdue") {
      items = items.filter((i) => !i.isAfgedaan && i.isOverdue);
    }
  }

  // Portefeuillehouder filter
  if (options.portefeuillehouder && options.portefeuillehouder !== "all") {
    const pfLower = options.portefeuillehouder.toLowerCase().trim();
    items = items.filter((i) => (i.portefeuillehouder || "").toLowerCase().includes(pfLower));
  }

  // Year filter
  if (options.year && options.year !== "all") {
    const yr = parseInt(String(options.year), 10);
    items = items.filter((i) => i.year === yr || (i.datum && i.datum.includes(String(yr))));
  }

  // Search filter
  if (options.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim();
    items = items.filter((i) => {
      return (
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.identity && i.identity.includes(q)) ||
        (i.toezeggingText && i.toezeggingText.toLowerCase().includes(q)) ||
        (i.toelichting && i.toelichting.toLowerCase().includes(q)) ||
        (i.standVanZaken && i.standVanZaken.toLowerCase().includes(q)) ||
        (i.portefeuillehouder && i.portefeuillehouder.toLowerCase().includes(q)) ||
        (i.agendapuntTitle && i.agendapuntTitle.toLowerCase().includes(q))
      );
    });
  }

  // Calculate full stats across all items for this municipality
  const allItems = getAllToezeggingenFromDb(municipality);
  const stats: ToezeggingStats = {
    total: allItems.length,
    open: allItems.filter((i) => !i.isAfgedaan).length,
    afgedaan: allItems.filter((i) => i.isAfgedaan).length,
    overdue: allItems.filter((i) => !i.isAfgedaan && i.isOverdue).length,
    withDeadline: allItems.filter((i) => Boolean(i.deadline)).length,
    byPortefeuillehouder: {},
    byYear: {},
    lastSyncedAt: lastSyncTimestamp || undefined,
  };

  for (const it of allItems) {
    const pf = it.portefeuillehouder || "Onbekend";
    if (!stats.byPortefeuillehouder[pf]) {
      stats.byPortefeuillehouder[pf] = { total: 0, open: 0, afgedaan: 0 };
    }
    stats.byPortefeuillehouder[pf].total++;
    if (it.isAfgedaan) stats.byPortefeuillehouder[pf].afgedaan++;
    else stats.byPortefeuillehouder[pf].open++;

    const yr = String(it.year || "Onbekend");
    if (!stats.byYear[yr]) {
      stats.byYear[yr] = { total: 0, open: 0, afgedaan: 0 };
    }
    stats.byYear[yr].total++;
    if (it.isAfgedaan) stats.byYear[yr].afgedaan++;
    else stats.byYear[yr].open++;
  }

  // Sort
  const sort = options.sort || "id_desc";
  items.sort((a, b) => {
    if (sort === "date_desc") {
      const dA = a.datumIso || a.datum || "";
      const dB = b.datumIso || b.datum || "";
      return dB.localeCompare(dA);
    }
    if (sort === "date_asc") {
      const dA = a.datumIso || a.datum || "";
      const dB = b.datumIso || b.datum || "";
      return dA.localeCompare(dB);
    }
    if (sort === "deadline_asc") {
      const dlA = a.deadlineIso || "9999-99-99";
      const dlB = b.deadlineIso || "9999-99-99";
      return dlA.localeCompare(dlB);
    }
    if (sort === "deadline_desc") {
      const dlA = a.deadlineIso || "0000-00-00";
      const dlB = b.deadlineIso || "0000-00-00";
      return dlB.localeCompare(dlA);
    }
    if (sort === "id_asc") {
      const idA = parseInt(a.identity, 10) || 0;
      const idB = parseInt(b.identity, 10) || 0;
      return idA - idB;
    }
    const idA = parseInt(a.identity, 10) || 0;
    const idB = parseInt(b.identity, 10) || 0;
    return idB - idA;
  });

  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 25));
  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / limit);
  const startIndex = (page - 1) * limit;
  const paginatedItems = items.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    totalCount,
    page,
    totalPages,
    stats,
  };
}

/**
 * Get single toezegging item by rowId or ID
 */
export async function getSingleToezegging(rowIdOrId: string, municipality?: string): Promise<ToezeggingItem | null> {
  const items = getAllToezeggingenFromDb(municipality);
  const found = items.find((i) => i.rowId === rowIdOrId || i.id === rowIdOrId || i.identity === rowIdOrId);

  if (found) {
    let changed = false;
    
    // Fetch details for Steenwijkerland if not loaded yet
    if (!found.detailFetched && found.municipality === "steenwijkerland") {
      const detail = await fetchToezeggingDetail(found.rowId);
      if (detail) {
        Object.assign(found, detail);
        found.detailFetched = true;
        changed = true;
      }
    }

    // AI Semantic Standpoint Matching on-demand
    if (!found.matchedStandpunten || found.matchedStandpunten.length === 0) {
      await matchToezeggingWithStandpunten(found);
      if (found.matchedStandpunten && found.matchedStandpunten.length > 0) {
        changed = true;
      }
    }

    if (changed) {
      saveToezeggingenToDb(items);
    }
  }

  return found || null;
}

/**
 * Get stats only
 */
export function getToezeggingenStats(municipality: string = "steenwijkerland"): ToezeggingStats {
  const q = queryToezeggingen({ municipality, limit: 1 });
  return q.stats;
}
