import * as cheerio from "cheerio";
import { getDbFromSqlite, saveDbToSqlite, getKv, setKv, initDatabase } from "./sqliteDatabase.js";
import type { ToezeggingItem, ToezeggingStats, ToezeggingAttachment } from "../types/council.js";

const STEENWIJKERLAND_REPORT_API = "https://steenwijkerland.bestuurlijkeinformatie.nl/Reports/GetReportData/18b100eb-2dba-433e-8737-2dc373dd88e1";
const STEENWIJKERLAND_ITEM_BASE = "https://steenwijkerland.bestuurlijkeinformatie.nl/Reports/Item/";
const BASE_URL = "https://steenwijkerland.bestuurlijkeinformatie.nl";

let isSyncingToezeggingen = false;
let lastSyncTimestamp: string | null = null;

// Parse "DD-MM-YYYY" to Date
function parseDmyDate(dmy?: string | null): Date | null {
  if (!dmy || typeof dmy !== "string") return null;
  const parts = dmy.trim().split(/[-/.]/);
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return new Date(y, m, d);
    }
  }
  const fallback = new Date(dmy);
  return isNaN(fallback.getTime()) ? null : fallback;
}

// Clean string
function cleanText(str?: string | null): string {
  if (!str) return "";
  return str.replace(/\s+/g, " ").trim();
}

/**
 * Fetch and scrape single toezegging detail page from iBabs
 */
export async function scrapeToezeggingDetail(rowId: string): Promise<Partial<ToezeggingItem> | null> {
  try {
    const url = `${STEENWIJKERLAND_ITEM_BASE}${rowId}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LijstVanAndel/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      console.warn(`[TOEZEGGINGEN SCRAPER] Kon detail voor ${rowId} niet ophalen (status: ${res.status})`);
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const fields: Record<string, string> = {};
    $("dl.row dt").each((_, dt) => {
      const key = $(dt).text().trim().toLowerCase();
      const dd = $(dt).next("dd");
      const val = dd.text().replace(/\s+/g, " ").trim();
      fields[key] = val;
    });

    // Extract exact Toezegging block
    const toezeggingText = fields["toezegging"] || "";
    const toelichtingText = fields["toelichting"] || "";
    const standVanZakenText = fields["stand van zaken"] || "";
    const afgedaanText = fields["afgedaan"] || "";
    const statusText = fields["status"] || "";

    // Agendapunt reference & link
    const agendaLinkEl = $("dd a[href*='/Agenda/']").first();
    const agendapuntTitle = agendaLinkEl.text().replace(/\s+/g, " ").trim() || fields["agendapunt"] || undefined;
    const agendapuntRelHref = agendaLinkEl.attr("href");
    const agendapuntUrl = agendapuntRelHref
      ? (agendapuntRelHref.startsWith("http") ? agendapuntRelHref : `${BASE_URL}${agendapuntRelHref.startsWith("/") ? "" : "/"}${agendapuntRelHref}`)
      : undefined;

    // Attachments
    const bijlagen: ToezeggingAttachment[] = [];
    $("dd ul.list-attachments a").each((_, aEl) => {
      const href = $(aEl).attr("href");
      if (!href) return;
      const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
      const title = $(aEl).text().replace(/\s+/g, " ").trim() || "Bijlage";
      bijlagen.push({
        title,
        url: fullUrl,
        fileType: fullUrl.toLowerCase().endsWith(".pdf") ? "PDF" : fullUrl.toLowerCase().endsWith(".docx") ? "DOCX" : "DOC",
      });
    });

    const isAfgedaan =
      afgedaanText.toLowerCase().includes("afgedaan") && !afgedaanText.toLowerCase().includes("niet afgedaan") ||
      statusText.toLowerCase().includes("afgehandeld");

    return {
      toezegging: toezeggingText,
      toelichting: toelichtingText,
      standVanZaken: standVanZakenText,
      isAfgedaan,
      agendapuntTitle,
      agendapuntUrl,
      bijlagen,
    };
  } catch (err: any) {
    console.warn(`[TOEZEGGINGEN DETAIL WARN] Fout bij ophalen detail ${rowId}:`, err?.message);
    return null;
  }
}

/**
 * Main scraper to pull all LTA Toezeggingen from iBabs for Steenwijkerland
 */
export async function syncSteenwijkerlandToezeggingen(options: { fetchFullDetails?: boolean } = {}): Promise<{
  success: boolean;
  totalFetched: number;
  newItemsCount: number;
  updatedItemsCount: number;
  stats: ToezeggingStats;
}> {
  if (isSyncingToezeggingen) {
    console.log("[TOEZEGGINGEN] Synchronisatie draait al op de achtergrond.");
    const currentStats = getToezeggingenStats("steenwijkerland");
    return {
      success: true,
      totalFetched: currentStats.total,
      newItemsCount: 0,
      updatedItemsCount: 0,
      stats: currentStats,
    };
  }

  isSyncingToezeggingen = true;
  await initDatabase();

  try {
    console.log("[TOEZEGGINGEN SCRAPER] Ophalen LTA Toezeggingen van iBabs Steenwijkerland...");

    const res = await fetch(STEENWIJKERLAND_REPORT_API, {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LijstVanAndel/1.0",
      },
      body: new URLSearchParams({
        draw: "1",
        start: "0",
        length: "1000",
      }).toString(),
    });

    if (!res.ok) {
      throw new Error(`iBabs Toezeggingen rapport API gaf foutcode: ${res.status}`);
    }

    const reportJson = await res.json();
    const rows: any[] = Array.isArray(reportJson.data) ? reportJson.data : [];

    console.log(`[TOEZEGGINGEN SCRAPER] ${rows.length} toezeggingen ontvangen uit iBabs.`);

    const db = getDbFromSqlite();
    if (!Array.isArray(db.toezeggingen)) {
      db.toezeggingen = [];
    }

    const existingMap = new Map<string, ToezeggingItem>();
    db.toezeggingen.forEach((t: ToezeggingItem) => {
      if (t.rowId) existingMap.set(t.rowId, t);
      if (t.id) existingMap.set(`id_${t.id}`, t);
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let newItemsCount = 0;
    let updatedItemsCount = 0;
    const syncedItems: ToezeggingItem[] = [];

    // Details to fetch in background if needed (e.g. top 25 newest or all openstaande)
    const detailsQueue: ToezeggingItem[] = [];

    for (const row of rows) {
      const rowId = String(row.DT_RowId || "").trim();
      const numId = String(row.identity || "").trim();
      if (!rowId && !numId) continue;

      const datumRaad = cleanText(row.datum);
      const onderwerp = cleanText(row.title);
      const portefeuillehouder = cleanText(row.portefeuillehouder) || "College B&W";
      const deadlineStr = cleanText(row.einddatum) || null;
      const datumAfdoeningStr = cleanText(row.datumafdoening) || null;
      const rawStatus = cleanText(row.status);

      const isAfgedaan =
        rawStatus.toLowerCase().includes("afgehandeld") ||
        Boolean(datumAfdoeningStr && datumAfdoeningStr.length > 3);

      const deadlineDate = parseDmyDate(deadlineStr);
      let calculatedStatus: "Afgehandeld" | "Openstaand" | "Verlopen" = "Openstaand";

      if (isAfgedaan) {
        calculatedStatus = "Afgehandeld";
      } else if (deadlineDate && deadlineDate.getTime() < today.getTime()) {
        calculatedStatus = "Verlopen";
      } else {
        calculatedStatus = "Openstaand";
      }

      const existing = existingMap.get(rowId) || existingMap.get(`id_${numId}`);

      const item: ToezeggingItem = {
        id: numId || rowId,
        rowId: rowId || numId,
        datumRaad: datumRaad || existing?.datumRaad || "",
        onderwerp: onderwerp || existing?.onderwerp || "Toezegging",
        portefeuillehouder: portefeuillehouder || existing?.portefeuillehouder || "College van B&W",
        deadline: deadlineStr || existing?.deadline || null,
        datumAfdoening: datumAfdoeningStr || existing?.datumAfdoening || null,
        status: calculatedStatus,
        isAfgedaan,
        toezegging: existing?.toezegging || "",
        toelichting: existing?.toelichting || "",
        standVanZaken: existing?.standVanZaken || "",
        agendapuntTitle: existing?.agendapuntTitle || undefined,
        agendapuntUrl: existing?.agendapuntUrl || undefined,
        bijlagen: existing?.bijlagen || [],
        municipality: "steenwijkerland",
        updatedAt: now.toISOString(),
      };

      if (!existing) {
        newItemsCount++;
        detailsQueue.push(item);
      } else {
        updatedItemsCount++;
        if (!existing.toezegging && (calculatedStatus !== "Afgehandeld" || detailsQueue.length < 15)) {
          detailsQueue.push(item);
        }
      }

      syncedItems.push(item);
    }

    // Sort newest first by datum raad
    syncedItems.sort((a, b) => {
      const da = parseDmyDate(a.datumRaad)?.getTime() || 0;
      const dbDate = parseDmyDate(b.datumRaad)?.getTime() || 0;
      return dbDate - da;
    });

    // Save preliminary synced list to SQLite
    db.toezeggingen = syncedItems;
    saveDbToSqlite(db);
    setKv("toezeggingen_steenwijkerland", syncedItems);
    lastSyncTimestamp = now.toISOString();

    console.log(`[TOEZEGGINGEN SCRAPER] Basislijst opgeslagen (${syncedItems.length} items). Nu details ophalen voor ${Math.min(detailsQueue.length, 30)} actieve items...`);

    const itemsToEnrich = detailsQueue.slice(0, 30);
    const batchSize = 5;

    for (let i = 0; i < itemsToEnrich.length; i += batchSize) {
      const batch = itemsToEnrich.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (targetItem) => {
          if (!targetItem.rowId) return;
          const detail = await scrapeToezeggingDetail(targetItem.rowId);
          if (detail) {
            targetItem.toezegging = detail.toezegging || targetItem.toezegging;
            targetItem.toelichting = detail.toelichting || targetItem.toelichting;
            targetItem.standVanZaken = detail.standVanZaken || targetItem.standVanZaken;
            targetItem.agendapuntTitle = detail.agendapuntTitle || targetItem.agendapuntTitle;
            targetItem.agendapuntUrl = detail.agendapuntUrl || targetItem.agendapuntUrl;
            targetItem.bijlagen = detail.bijlagen || targetItem.bijlagen;
            if (detail.isAfgedaan !== undefined) {
              targetItem.isAfgedaan = detail.isAfgedaan;
              if (detail.isAfgedaan) targetItem.status = "Afgehandeld";
            }
          }
        })
      );
    }

    // Save final enriched items to database
    saveDbToSqlite(db);
    setKv("toezeggingen_steenwijkerland", syncedItems);

    console.log(`[TOEZEGGINGEN SCRAPER] Voltooid! Totaal: ${syncedItems.length}, Nieuw: ${newItemsCount}, Bijgewerkt: ${updatedItemsCount}`);

    const stats = getToezeggingenStats("steenwijkerland");
    return {
      success: true,
      totalFetched: syncedItems.length,
      newItemsCount,
      updatedItemsCount,
      stats,
    };
  } catch (err: any) {
    console.error("[TOEZEGGINGEN SCRAPER ERROR]:", err);
    throw err;
  } finally {
    isSyncingToezeggingen = false;
  }
}

/**
 * Returns summary stats for toezeggingen
 */
export function getToezeggingenStats(municipality = "steenwijkerland"): ToezeggingStats {
  const db = getDbFromSqlite();
  const items: ToezeggingItem[] = Array.isArray(db.toezeggingen)
    ? db.toezeggingen.filter((t: ToezeggingItem) => (t.municipality || "steenwijkerland") === municipality)
    : [];

  let openstaand = 0;
  let afgehandeld = 0;
  let verlopen = 0;
  const perPortefeuillehouder: Record<string, number> = {};
  const perJaar: Record<string, number> = {};

  items.forEach((item) => {
    if (item.status === "Afgehandeld") {
      afgehandeld++;
    } else if (item.status === "Verlopen") {
      verlopen++;
      openstaand++;
    } else {
      openstaand++;
    }

    const p = item.portefeuillehouder || "Onbekend";
    perPortefeuillehouder[p] = (perPortefeuillehouder[p] || 0) + 1;

    const parsed = parseDmyDate(item.datumRaad);
    const year = parsed ? String(parsed.getFullYear()) : "Onbekend";
    perJaar[year] = (perJaar[year] || 0) + 1;
  });

  return {
    total: items.length,
    openstaand,
    afgehandeld,
    verlopen,
    perPortefeuillehouder,
    perJaar,
    lastSyncedAt: lastSyncTimestamp || new Date().toISOString(),
  };
}

export interface GetToezeggingenParams {
  municipality?: string;
  status?: "all" | "openstaand" | "afgehandeld" | "verlopen";
  portefeuillehouder?: string;
  year?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: "date_desc" | "date_asc" | "id_desc" | "id_asc" | "deadline_asc";
}

/**
 * Query and filter toezeggingen
 */
export function queryToezeggingen(params: GetToezeggingenParams): {
  items: ToezeggingItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: ToezeggingStats;
} {
  const muni = params.municipality || "steenwijkerland";
  const db = getDbFromSqlite();
  let list: ToezeggingItem[] = Array.isArray(db.toezeggingen)
    ? db.toezeggingen.filter((t: ToezeggingItem) => (t.municipality || "steenwijkerland") === muni)
    : [];

  const stats = getToezeggingenStats(muni);

  // Status filter
  if (params.status && params.status !== "all") {
    if (params.status === "openstaand") {
      list = list.filter((t) => t.status === "Openstaand" || t.status === "Verlopen");
    } else if (params.status === "afgehandeld") {
      list = list.filter((t) => t.status === "Afgehandeld");
    } else if (params.status === "verlopen") {
      list = list.filter((t) => t.status === "Verlopen");
    }
  }

  // Portefeuillehouder filter
  if (params.portefeuillehouder && params.portefeuillehouder !== "all") {
    const targetP = params.portefeuillehouder.toLowerCase();
    list = list.filter((t) => t.portefeuillehouder?.toLowerCase().includes(targetP));
  }

  // Year filter
  if (params.year && params.year !== "all") {
    list = list.filter((t) => {
      const parsed = parseDmyDate(t.datumRaad);
      return parsed ? String(parsed.getFullYear()) === params.year : false;
    });
  }

  // Search filter
  if (params.search && params.search.trim().length > 0) {
    const q = params.search.toLowerCase().trim();
    list = list.filter((t) => {
      return (
        t.id?.toLowerCase().includes(q) ||
        t.onderwerp?.toLowerCase().includes(q) ||
        t.toezegging?.toLowerCase().includes(q) ||
        t.toelichting?.toLowerCase().includes(q) ||
        t.portefeuillehouder?.toLowerCase().includes(q) ||
        t.agendapuntTitle?.toLowerCase().includes(q)
      );
    });
  }

  // Sorting
  const sort = params.sort || "date_desc";
  list.sort((a, b) => {
    if (sort === "date_desc") {
      const da = parseDmyDate(a.datumRaad)?.getTime() || 0;
      const dbDate = parseDmyDate(b.datumRaad)?.getTime() || 0;
      return dbDate - da;
    }
    if (sort === "date_asc") {
      const da = parseDmyDate(a.datumRaad)?.getTime() || 0;
      const dbDate = parseDmyDate(b.datumRaad)?.getTime() || 0;
      return da - dbDate;
    }
    if (sort === "id_desc") {
      return (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0);
    }
    if (sort === "id_asc") {
      return (parseInt(a.id, 10) || 0) - (parseInt(b.id, 10) || 0);
    }
    if (sort === "deadline_asc") {
      const da = parseDmyDate(a.deadline)?.getTime() || Infinity;
      const dbDate = parseDmyDate(b.deadline)?.getTime() || Infinity;
      return da - dbDate;
    }
    return 0;
  });

  const totalCount = list.length;
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(5, params.limit || 25));
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginatedItems = list.slice((page - 1) * pageSize, page * pageSize);

  return {
    items: paginatedItems,
    totalCount,
    page,
    pageSize,
    totalPages,
    stats,
  };
}

/**
 * Get single toezegging item with live detail fetch fallback
 */
export async function getSingleToezegging(rowId: string, municipality = "steenwijkerland"): Promise<ToezeggingItem | null> {
  const db = getDbFromSqlite();
  const items: ToezeggingItem[] = Array.isArray(db.toezeggingen) ? db.toezeggingen : [];
  let item = items.find((t) => t.rowId === rowId || t.id === rowId);

  if (!item) {
    const detail = await scrapeToezeggingDetail(rowId);
    if (!detail) return null;
    item = {
      id: rowId,
      rowId,
      datumRaad: "",
      onderwerp: "Toezegging",
      portefeuillehouder: "College B&W",
      status: detail.isAfgedaan ? "Afgehandeld" : "Openstaand",
      isAfgedaan: !!detail.isAfgedaan,
      ...detail,
      municipality: "steenwijkerland",
      updatedAt: new Date().toISOString(),
    };
    items.push(item);
    saveDbToSqlite(db);
    return item;
  }

  if (!item.toezegging) {
    const detail = await scrapeToezeggingDetail(item.rowId);
    if (detail) {
      item.toezegging = detail.toezegging || item.toezegging;
      item.toelichting = detail.toelichting || item.toelichting;
      item.standVanZaken = detail.standVanZaken || item.standVanZaken;
      item.agendapuntTitle = detail.agendapuntTitle || item.agendapuntTitle;
      item.agendapuntUrl = detail.agendapuntUrl || item.agendapuntUrl;
      item.bijlagen = detail.bijlagen || item.bijlagen;
      if (detail.isAfgedaan !== undefined) {
        item.isAfgedaan = detail.isAfgedaan;
        if (detail.isAfgedaan) item.status = "Afgehandeld";
      }
      saveDbToSqlite(db);
    }
  }

  return item;
}
