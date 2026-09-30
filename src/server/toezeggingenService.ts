import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { persistSqlite, schedulePersist, getRawSqliteDb } from "./sqliteDatabase.js";

const STEENWIJKERLAND_REPORT_API = "https://steenwijkerland.bestuurlijkeinformatie.nl/Reports/GetReportData/18b100eb-2dba-433e-8737-2dc373dd88e1";
const STEENWIJKERLAND_ITEM_BASE = "https://steenwijkerland.bestuurlijkeinformatie.nl/Reports/Item/";
const STEENWIJKERLAND_BASE = "https://steenwijkerland.bestuurlijkeinformatie.nl";

const SQLITE_FILE = process.env.DATABASE_PATH || path.join(process.cwd(), "database.sqlite");

export interface ToezeggingBijlage {
  title: string;
  url: string;
  size?: string;
}

export interface ToezeggingItem {
  id: string; // e.g. "swl_toezegging_5862cba2-ce1b-4ce9-91a0-47e0a20eef2d"
  rowId: string; // DT_RowId
  identity: string; // e.g. "312"
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
let isSyncing = false;

/**
 * Read all toezeggingen from SQLite
 */
export function getAllToezeggingenFromDb(municipality?: string): ToezeggingItem[] {
  try {
    if (memoryToezeggingenCache.length > 0) {
      if (municipality) {
        return memoryToezeggingenCache.filter((it) => (it.municipality || "steenwijkerland") === municipality);
      }
      return memoryToezeggingenCache;
    }

    const db = getRawSqliteDb();
    if (db) {
      const rows = db.exec("SELECT data FROM councilToezeggingen");
      if (rows.length > 0 && rows[0].values) {
        memoryToezeggingenCache = rows[0].values.map((v: any) => {
          try {
            return JSON.parse(v[0]);
          } catch {
            return null;
          }
        }).filter(Boolean);

        if (municipality) {
          return memoryToezeggingenCache.filter((it) => (it.municipality || "steenwijkerland") === municipality);
        }
        return memoryToezeggingenCache;
      }
    }
  } catch (err) {
    console.warn("[TOEZEGGINGEN DB READ ERROR]:", err);
  }
  return memoryToezeggingenCache.filter((item) => !municipality || item.municipality === municipality);
}

export function saveToezeggingenToDb(items: ToezeggingItem[]) {
  memoryToezeggingenCache = items;
  lastSyncTimestamp = new Date().toISOString();

  try {
    const db = getRawSqliteDb();
    if (db) {
      db.run("CREATE TABLE IF NOT EXISTS councilToezeggingen (id TEXT PRIMARY KEY, data TEXT)");
      db.run("BEGIN TRANSACTION;");
      for (const item of items) {
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
      signal: AbortSignal.timeout(10000),
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
  } catch (err: any) {
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
  if (isSyncing) {
    console.log("[LTA TOEZEGGINGEN] Synchronisatie is reeds bezig...");
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

  isSyncing = true;
  console.log("[LTA TOEZEGGINGEN] Start volledige synchronisatie met Steenwijkerland iBabs...");
  const fetchFullDetails = options.fetchFullDetails !== false;
  const concurrency = options.concurrency || 8;

  try {
    // 1. Fetch all pages of the report
    const rawRows: any[] = [];
    let start = 0;
    const pageSize = 100;
    let recordsTotal = 0;

    while (true) {
      const res = await fetch(STEENWIJKERLAND_REPORT_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
        body: `draw=1&start=${start}&length=${pageSize}`,
        signal: AbortSignal.timeout(20000),
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

    console.log(`[LTA TOEZEGGINGEN] ${rawRows.length} van totaal ${recordsTotal} toezeggingen rijen opgehaald.`);

    const existingMap = new Map<string, ToezeggingItem>();
    const currentDbItems = getAllToezeggingenFromDb("steenwijkerland");
    for (const item of currentDbItems) {
      existingMap.set(item.rowId, item);
    }

    const now = new Date().toISOString();
    const todayIso = now.slice(0, 10);
    let newCount = 0;
    let updatedCount = 0;

    // 2. Map table data to initial objects
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

    // Save base items immediately so queries return results instantly
    saveToezeggingenToDb(baseItems);

    // 3. Fetch details for items needing detail or if fetchFullDetails is enabled
    if (fetchFullDetails) {
      const itemsToFetchDetails = baseItems.filter(
        (item) => !item.detailFetched || !item.toezeggingText || item.toezeggingText === item.title
      );

      if (itemsToFetchDetails.length > 0) {
        console.log(`[LTA TOEZEGGINGEN] Ophalen detailpagina's voor ${itemsToFetchDetails.length} toezeggingen...`);

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

        // Re-save with updated details
        saveToezeggingenToDb(baseItems);
      }
    }

    // 4. Save to database
    saveToezeggingenToDb(baseItems);

    const openCount = baseItems.filter((i) => !i.isAfgedaan).length;
    const afgedaanCount = baseItems.filter((i) => i.isAfgedaan).length;

    console.log(`[LTA TOEZEGGINGEN] Synchronisatie succesvol voltooid. Totaal: ${baseItems.length} (Open: ${openCount}, Afgedaan: ${afgedaanCount}).`);

    return {
      totalFetched: baseItems.length,
      newCount,
      updatedCount,
      openCount,
      afgedaanCount,
      lastSyncedAt: now,
    };
  } finally {
    isSyncing = false;
  }
}

/**
 * Query and filter toezeggingen with rich stats
 */
export function queryToezeggingen(options: ToezeggingQueryOptions = {}) {
  const municipality = options.municipality || "steenwijkerland";
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
    // Default: id_desc
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

  if (found && !found.detailFetched) {
    const detail = await fetchToezeggingDetail(found.rowId);
    if (detail) {
      Object.assign(found, detail);
      found.detailFetched = true;
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
