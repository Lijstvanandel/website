import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  initVaultDatabase,
  loadVaultTable,
  saveVaultTable,
  loadVaultSingle,
  saveVaultSingle,
  saveVaultItem,
  deleteVaultItem,
  migrateAndSanitizePublicDatabase,
  anonymizeBelafspraakInVault,
  bulkAnonymizeOldBelafsprakenInVault,
  getVaultFilePath,
  SENSITIVE_TABLE_NAMES,
  SensitiveTable,
} from "./vaultDatabase.js";
import {
  initCouncilContributionVault,
  recordCouncilContribution,
  hydrateTopicsWithContributions,
  exportCouncilContributions,
  importCouncilContributions,
} from "./councilContributionVault.js";

const SQLITE_FILE = process.env.DATABASE_PATH || path.join(process.cwd(), "database.sqlite");
const LEGACY_JSON = path.join(process.cwd(), "db.json");

const SENSITIVE_TABLE_SET = new Set<string>(SENSITIVE_TABLE_NAMES);

let sqlInstance: any = null;
let sqliteDb: any = null;
let saveTimeout: NodeJS.Timeout | null = null;

// Tables and their keys in the JSON structure
const TABLE_DEFINITIONS: { [table: string]: string } = {
  users: "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, data TEXT)",
  fractieleden: "CREATE TABLE IF NOT EXISTS fractieleden (id TEXT PRIMARY KEY, data TEXT)",
  videos: "CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, data TEXT)",
  news: "CREATE TABLE IF NOT EXISTS news (id TEXT PRIMARY KEY, data TEXT)",
  events: "CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, data TEXT)",
  categories: "CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, data TEXT)",
  contactMessages: "CREATE TABLE IF NOT EXISTS contactMessages (id TEXT PRIMARY KEY, data TEXT)",
  faqs: "CREATE TABLE IF NOT EXISTS faqs (id TEXT PRIMARY KEY, data TEXT)",
  wijken: "CREATE TABLE IF NOT EXISTS wijken (id TEXT PRIMARY KEY, data TEXT)",
  documents: "CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, data TEXT)",
  stemgedrag: "CREATE TABLE IF NOT EXISTS stemgedrag (id TEXT PRIMARY KEY, data TEXT)",
  membershipSettings: "CREATE TABLE IF NOT EXISTS membershipSettings (id TEXT PRIMARY KEY, data TEXT)",
  stellingSubmissions: "CREATE TABLE IF NOT EXISTS stellingSubmissions (id TEXT PRIMARY KEY, data TEXT)",
  qrLocations: "CREATE TABLE IF NOT EXISTS qrLocations (id TEXT PRIMARY KEY, data TEXT)",
  stellingen: "CREATE TABLE IF NOT EXISTS stellingen (id TEXT PRIMARY KEY, data TEXT)",
  belafspraken: "CREATE TABLE IF NOT EXISTS belafspraken (id TEXT PRIMARY KEY, data TEXT)",
  newsletterSubscribers: "CREATE TABLE IF NOT EXISTS newsletterSubscribers (id TEXT PRIMARY KEY, data TEXT)",
  newsletters: "CREATE TABLE IF NOT EXISTS newsletters (id TEXT PRIMARY KEY, data TEXT)",
  eventTickets: "CREATE TABLE IF NOT EXISTS eventTickets (id TEXT PRIMARY KEY, data TEXT)",
  eventCancellations: "CREATE TABLE IF NOT EXISTS eventCancellations (id TEXT PRIMARY KEY, data TEXT)",
  donations: "CREATE TABLE IF NOT EXISTS donations (id TEXT PRIMARY KEY, data TEXT)",
  pushSubscriptions: "CREATE TABLE IF NOT EXISTS pushSubscriptions (id TEXT PRIMARY KEY, data TEXT)",
  pushLogs: "CREATE TABLE IF NOT EXISTS pushLogs (id TEXT PRIMARY KEY, data TEXT)",
  auditLogs: "CREATE TABLE IF NOT EXISTS auditLogs (id TEXT PRIMARY KEY, data TEXT)",
  councilAgendaTopics: "CREATE TABLE IF NOT EXISTS councilAgendaTopics (id TEXT PRIMARY KEY, data TEXT)",
  councilContributions: "CREATE TABLE IF NOT EXISTS councilContributions (topicId TEXT PRIMARY KEY, topicTitle TEXT, normalizedTitle TEXT, meetingDate TEXT, municipality TEXT, data TEXT, updatedAt TEXT)",
  documentFavorites: "CREATE TABLE IF NOT EXISTS documentFavorites (id TEXT PRIMARY KEY, data TEXT)",
  councilSearchLogs: "CREATE TABLE IF NOT EXISTS councilSearchLogs (id TEXT PRIMARY KEY, data TEXT)",
  navbarSearchLogs: "CREATE TABLE IF NOT EXISTS navbarSearchLogs (id TEXT PRIMARY KEY, data TEXT)",
  councilDocumentViews: "CREATE TABLE IF NOT EXISTS councilDocumentViews (id TEXT PRIMARY KEY, data TEXT)",
  customDossiers: "CREATE TABLE IF NOT EXISTS customDossiers (id TEXT PRIMARY KEY, data TEXT)",
  councilResearchItems: "CREATE TABLE IF NOT EXISTS councilResearchItems (id TEXT PRIMARY KEY, data TEXT)",
  councilToezeggingen: "CREATE TABLE IF NOT EXISTS councilToezeggingen (id TEXT PRIMARY KEY, data TEXT)",
  systemSettings: "CREATE TABLE IF NOT EXISTS systemSettings (id TEXT PRIMARY KEY, data TEXT)",
  treasurerAccounts: "CREATE TABLE IF NOT EXISTS treasurerAccounts (id TEXT PRIMARY KEY, data TEXT)",
  treasurerInvoices: "CREATE TABLE IF NOT EXISTS treasurerInvoices (id TEXT PRIMARY KEY, data TEXT)",
  treasurerAfdrachten: "CREATE TABLE IF NOT EXISTS treasurerAfdrachten (id TEXT PRIMARY KEY, data TEXT)",
  treasurerBudget: "CREATE TABLE IF NOT EXISTS treasurerBudget (id TEXT PRIMARY KEY, data TEXT)",
  treasurerKascommissie: "CREATE TABLE IF NOT EXISTS treasurerKascommissie (id TEXT PRIMARY KEY, data TEXT)",
  treasurerSettings: "CREATE TABLE IF NOT EXISTS treasurerSettings (id TEXT PRIMARY KEY, data TEXT)",
  performanceLogs: "CREATE TABLE IF NOT EXISTS performanceLogs (id TEXT PRIMARY KEY, visitorId TEXT, path TEXT, status TEXT, data TEXT, timestamp TEXT)",
  kv_store: "CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT)",
};

/**
 * Initialize SQLite database engine with atomic persistence & schema migration
 */
export async function initDatabase() {
  if (sqliteDb) return sqliteDb;

  sqlInstance = await initSqlJs();

  if (fs.existsSync(SQLITE_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(SQLITE_FILE);
      sqliteDb = new sqlInstance.Database(fileBuffer);
      console.log("[SQLITE] Bestaande database.sqlite succesvol ingeladen.");
    } catch (err: any) {
      console.error("[SQLITE FOUT] Kon database.sqlite niet lezen, nieuwe database wordt aangemaakt:", err);
      sqliteDb = new sqlInstance.Database();
    }
  } else {
    sqliteDb = new sqlInstance.Database();
    console.log("[SQLITE] Nieuwe SQLite database geïnitialiseerd.");
  }

  // Create tables
  sqliteDb.run("PRAGMA journal_mode = WAL;");
  sqliteDb.run("PRAGMA synchronous = NORMAL;");

  for (const table of Object.keys(TABLE_DEFINITIONS)) {
    sqliteDb.run(TABLE_DEFINITIONS[table]);
  }

  // Migrate legacy customDossiers from kv_store if customDossiers table is empty
  try {
    const customCountRes = sqliteDb.exec("SELECT count(*) FROM customDossiers");
    const hasCustomInTable = customCountRes.length > 0 && customCountRes[0].values[0][0] > 0;
    if (!hasCustomInTable) {
      const kvCustom = sqliteDb.exec("SELECT value FROM kv_store WHERE key = 'customDossiers'");
      if (kvCustom.length > 0 && kvCustom[0].values && kvCustom[0].values[0]) {
        const rawJson = kvCustom[0].values[0][0];
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[SQLITE MIGRATIE] ${parsed.length} customDossiers migreren van kv_store naar tabel...`);
          for (const item of parsed) {
            const itemId = String(item.id || item.slug || crypto.randomUUID());
            sqliteDb.run("INSERT OR REPLACE INTO customDossiers (id, data) VALUES (?, ?)", [
              itemId,
              JSON.stringify(item),
            ]);
          }
          sqliteDb.run("DELETE FROM kv_store WHERE key = 'customDossiers'");
          persistSqlite();
        }
      }
    }
  } catch (migCustomErr) {
    console.warn("[SQLITE MIGRATIE] Kon customDossiers uit kv_store niet migreren:", migCustomErr);
  }

  // Check if we need to migrate existing db.json to SQLite
  const rowCountRes = sqliteDb.exec("SELECT count(*) FROM kv_store WHERE key = '__migrated'");
  const isMigrated = rowCountRes.length > 0 && rowCountRes[0].values.length > 0 && rowCountRes[0].values[0][0] > 0;

  if (!isMigrated && fs.existsSync(LEGACY_JSON)) {
    try {
      console.log("[SQLITE MIGRATIE] Migreren van db.json naar SQLite database...");
      const rawData = fs.readFileSync(LEGACY_JSON, "utf-8");
      const jsonData = JSON.parse(rawData);

      // Begin transaction
      sqliteDb.run("BEGIN TRANSACTION;");

      for (const [key, val] of Object.entries(jsonData)) {
        if (Array.isArray(val)) {
          // Table with array items
          const tableName = TABLE_DEFINITIONS[key] ? key : "kv_store";
          if (tableName === key) {
            for (const item of val) {
              const itemId = (item && (item.id || item.email || item.slug || item.key)) || crypto.randomUUID();
              sqliteDb.run(`INSERT OR REPLACE INTO ${tableName} (id, data) VALUES (?, ?)`, [
                String(itemId),
                JSON.stringify(item),
              ]);
            }
          } else {
            sqliteDb.run("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)", [
              key,
              JSON.stringify(val),
            ]);
          }
        } else if (typeof val === "object" && val !== null) {
          if (TABLE_DEFINITIONS[key]) {
            sqliteDb.run(`INSERT OR REPLACE INTO ${key} (id, data) VALUES (?, ?)`, [
              "default",
              JSON.stringify(val),
            ]);
          } else {
            sqliteDb.run("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)", [
              key,
              JSON.stringify(val),
            ]);
          }
        } else {
          sqliteDb.run("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)", [
            key,
            JSON.stringify(val),
          ]);
        }
      }

      sqliteDb.run("INSERT OR REPLACE INTO kv_store (key, value) VALUES ('__migrated', 'true')");
      sqliteDb.run("COMMIT;");
      persistSqlite();
      console.log("[SQLITE MIGRATIE] Migratie van db.json naar SQLite succesvol voltooid!");
    } catch (migErr) {
      console.error("[SQLITE MIGRATIE FOUT]:", migErr);
      try {
        sqliteDb.run("ROLLBACK;");
      } catch (_e) {
        // Ignore rollback errors if transaction was not active
      }
    }
  }

  // Initialize isolated physical Vault database for sensitive CRM & Strategy
  try {
    await initVaultDatabase(sqlInstance);
    // Sanitize public database: Migrate any sensitive records to encrypted Vault and purge from public db
    migrateAndSanitizePublicDatabase(sqliteDb);
    initCouncilContributionVault();
    try {
      const contribRows = sqliteDb.exec("SELECT data FROM councilContributions");
      if (contribRows.length > 0 && contribRows[0].values) {
        const records = contribRows[0].values.map((v: any) => {
          try { return JSON.parse(v[0]); } catch { return null; }
        }).filter(Boolean);
        if (records.length > 0) {
          importCouncilContributions(records);
          console.log(`[SQLITE] 🛡️ ${records.length} raadsbijdragen uit SQLite tabel councilContributions geladen in kluis.`);
        }
      }
    } catch (_loadErr) {
      // ignore
    }
    persistSqlite();
  } catch (vaultErr) {
    console.error("[CRM-VAULT INIT FOUT]:", vaultErr);
  }

  return sqliteDb;
}

/**
 * Flush SQLite in-memory database to disk atomically
 */
export function persistSqlite() {
  if (!sqliteDb) return;
  try {
    const parentDir = path.dirname(SQLITE_FILE);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    const data = sqliteDb.export();
    const buffer = Buffer.from(data);
    const tempFile = `${SQLITE_FILE}.tmp`;
    fs.writeFileSync(tempFile, buffer);
    fs.renameSync(tempFile, SQLITE_FILE);
  } catch (err: any) {
    console.error("[SQLITE PERSIST FOUT]:", err);
  }
}

const publicTableSignatures = new Map<string, string>();
const vaultTableSignatures = new Map<string, string>();
let cachedFullDb: any = null;

export function invalidateSqliteMemoryCache(): void {
  cachedFullDb = null;
}

function computePublicSignature(data: any): string {
  if (!data) return "null";
  try {
    const serialized = JSON.stringify(data);
    return crypto.createHash("sha1").update(serialized).digest("base64");
  } catch {
    return String(Math.random());
  }
}

/**
 * Schedule a debounced flush to disk (max 50ms) for high-performance non-blocking queries
 */
export function schedulePersist() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    persistSqlite();
  }, 50);
}

/**
 * Extract full domain state object seamlessly from SQLite (with fast in-memory snapshot caching)
 */
export function getDbFromSqlite(forceReload = false): any {
  if (!sqliteDb) {
    // If not yet initialized synchronously (unlikely), fallback
    return {};
  }

  if (!forceReload && cachedFullDb) {
    return cachedFullDb;
  }

  const result: any = {
    users: [],
    fractieleden: [],
    videos: [],
    news: [],
    events: [],
    categories: [],
    contactMessages: [],
    faqs: [],
    wijken: [],
    documents: [],
    stemgedrag: [],
    membershipSettings: null,
    stellingSubmissions: [],
    qrLocations: [],
    stellingen: [],
    belafspraken: [],
    newsletterSubscribers: [],
    newsletters: [],
    eventTickets: [],
    eventCancellations: [],
    donations: [],
    pushSubscriptions: [],
    pushLogs: [],
    auditLogs: [],
    systemSettings: {},
    treasurerAccounts: [],
    treasurerInvoices: [],
    treasurerAfdrachten: [],
    treasurerBudget: [],
    treasurerKascommissie: null,
    treasurerSettings: null,
    councilResearchItems: [],
    councilToezeggingen: [],
  };

  // Public list tables strictly residing in public database.sqlite
  const publicListTables = [
    "fractieleden",
    "videos",
    "news",
    "events",
    "categories",
    "faqs",
    "wijken",
    "documents",
    "stemgedrag",
    "qrLocations",
    "stellingen",
    "newsletters",
    "councilAgendaTopics",
    "documentFavorites",
    "councilSearchLogs",
    "councilDocumentViews",
    "customDossiers",
    "councilResearchItems",
    "councilToezeggingen",
  ];

  for (const table of publicListTables) {
    try {
      const rows = sqliteDb.exec(`SELECT data FROM ${table}`);
      if (rows.length > 0 && rows[0].values) {
        result[table] = rows[0].values.map((v: any) => {
          try {
            return JSON.parse(v[0]);
          } catch (_e) {
            return null;
          }
        }).filter(Boolean);
      } else {
        result[table] = [];
      }
    } catch (_err) {
      result[table] = [];
    }
    publicTableSignatures.set(table, computePublicSignature(result[table]));
  }

  // Immunity layer: Guarantee all user-written contributions & parked topics are preserved
  if (Array.isArray(result.councilAgendaTopics)) {
    result.councilAgendaTopics = hydrateTopicsWithContributions(result.councilAgendaTopics);
  }

  // Sensitive tables strictly retrieved from isolated, AES-256-GCM encrypted CRM-Vault
  try {
    result.users = loadVaultTable("users");
    result.belafspraken = loadVaultTable("belafspraken");
    result.contactMessages = loadVaultTable("contactMessages");
    result.stellingSubmissions = loadVaultTable("stellingSubmissions");
    result.newsletterSubscribers = loadVaultTable("newsletterSubscribers");
    result.eventTickets = loadVaultTable("eventTickets");
    result.eventCancellations = loadVaultTable("eventCancellations");
    result.donations = loadVaultTable("donations");
    result.pushSubscriptions = loadVaultTable("pushSubscriptions");
    result.pushLogs = loadVaultTable("pushLogs");
    result.auditLogs = loadVaultTable("auditLogs");
    result.treasurerAccounts = loadVaultTable("treasurerAccounts");
    result.treasurerInvoices = loadVaultTable("treasurerInvoices");
    result.treasurerAfdrachten = loadVaultTable("treasurerAfdrachten");
    result.treasurerBudget = loadVaultTable("treasurerBudget");
    result.treasurerKascommissie = loadVaultSingle("treasurerKascommissie");
    result.treasurerSettings = loadVaultSingle("treasurerSettings");
    result.internalCouncilStrategy = loadVaultTable("internalCouncilStrategy");

    for (const vKey of SENSITIVE_TABLE_NAMES) {
      vaultTableSignatures.set(vKey, computePublicSignature(result[vKey]));
    }
  } catch (vaultErr) {
    console.error("[CRM-VAULT LOAD ERROR]:", vaultErr);
  }

  // Load single-object tables from public db
  try {
    const memRows = sqliteDb.exec("SELECT data FROM membershipSettings WHERE id = 'default' LIMIT 1");
    if (memRows.length > 0 && memRows[0].values && memRows[0].values.length > 0) {
      result.membershipSettings = JSON.parse(memRows[0].values[0][0]);
      publicTableSignatures.set("membershipSettings", computePublicSignature(result.membershipSettings));
    }
  } catch (_e) {
    result.membershipSettings = null;
  }

  // Load kv_store
  try {
    const kvRows = sqliteDb.exec("SELECT key, value FROM kv_store");
    if (kvRows.length > 0 && kvRows[0].values) {
      for (const [k, v] of kvRows[0].values) {
        if (k === "__migrated") continue;
        try {
          result[k] = JSON.parse(v);
        } catch (_e) {
          result[k] = v;
        }
        publicTableSignatures.set(k, computePublicSignature(result[k]));
      }
    }
  } catch (_e) {
    // Keep defaults
  }

  cachedFullDb = result;
  return result;
}

/**
 * Save complete or partial domain state directly to SQLite with high-performance transactions
 * Routing sensitive citizen CRM & internal strategy exclusively to the encrypted Vault!
 */
export function saveDbToSqlite(data: any) {
  if (!sqliteDb || !data) return;

  cachedFullDb = data;

  try {
    // 1. Route sensitive data to isolated encrypted CRM Vault ONLY when changed
    for (const [key, val] of Object.entries(data)) {
      if (SENSITIVE_TABLE_SET.has(key)) {
        const currentVaultSig = computePublicSignature(val);
        if (vaultTableSignatures.get(key) === currentVaultSig) {
          continue; // Unchanged sensitive table: skip expensive AES-256-GCM re-encryption & disk write
        }
        if (key === "treasurerKascommissie" || key === "treasurerSettings") {
          saveVaultSingle(key as SensitiveTable, val);
        } else if (Array.isArray(val)) {
          saveVaultTable(key as SensitiveTable, val);
        }
        vaultTableSignatures.set(key, currentVaultSig);
      }
    }

    // 2. Persist public data to public database.sqlite
    let hasChanges = false;
    sqliteDb.run("BEGIN TRANSACTION;");

    for (const [key, val] of Object.entries(data)) {
      // Strictly skip sensitive tables from being saved to public database.sqlite
      if (SENSITIVE_TABLE_SET.has(key)) {
        continue;
      }

      if (TABLE_DEFINITIONS[key] && Array.isArray(val)) {
        if (key === "councilAgendaTopics") {
          // Safeguard & Vault Sync: Record user-authored contributions & protect from partial wipes
          try {
            for (const t of val) {
              if (t?.id && (t?.bijdragePolitiekeMarkt || t?.bijdrageRaadsvergadering || t?.isParked || (t?.notes && t.notes.length > 0) || t?.compiledDossier || t?.assignedTo || t?.markAsHamerstuk)) {
                const rec = recordCouncilContribution(t);
                if (rec) {
                  sqliteDb.run(
                    "INSERT OR REPLACE INTO councilContributions (topicId, topicTitle, normalizedTitle, meetingDate, municipality, data, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [rec.topicId, rec.topicTitle, rec.normalizedTitle, rec.meetingDate || "", rec.municipality, JSON.stringify(rec), rec.updatedAt]
                  );
                }
              }
            }
          } catch (_vErr) {
            // ignore
          }

          try {
            const existingRows = sqliteDb.exec(`SELECT id, data FROM ${key}`);
            if (existingRows.length > 0 && existingRows[0].values) {
              const valIds = new Set(val.map((item: any) => String(item?.id || "")));
              for (const [rowId, rowData] of existingRows[0].values) {
                if (!valIds.has(String(rowId))) {
                  try {
                    const parsed = JSON.parse(rowData);
                    val.push(parsed);
                  } catch {
                    // ignore
                  }
                }
              }
            }
          } catch {
            // ignore
          }
        }

        const currentSig = computePublicSignature(val);
        if (publicTableSignatures.get(key) === currentSig) {
          continue; // Unchanged: skip wiping and re-inserting entire table!
        }
        hasChanges = true;
        // Clear old table and insert updated items safely
        sqliteDb.run(`DELETE FROM ${key};`);
        const seenIds = new Set<string>();
        for (const item of val) {
          if (!item) continue;
          let itemId = String(item.id || item.email || item.slug || item.key || crypto.randomUUID());
          // De-duplicate IDs within the array to guarantee UNIQUE constraints are never violated
          if (seenIds.has(itemId)) {
            itemId = `${itemId}_${crypto.randomUUID().slice(0, 6)}`;
            if (typeof item === "object" && item !== null && item.id) {
              item.id = itemId;
            }
          }
          seenIds.add(itemId);
          sqliteDb.run(`INSERT OR REPLACE INTO ${key} (id, data) VALUES (?, ?)`, [itemId, JSON.stringify(item)]);
        }
        publicTableSignatures.set(key, currentSig);
      } else if (key === "membershipSettings" && val && typeof val === "object") {
        const currentSig = computePublicSignature(val);
        if (publicTableSignatures.get(key) !== currentSig) {
          hasChanges = true;
          sqliteDb.run(`INSERT OR REPLACE INTO ${key} (id, data) VALUES ('default', ?)`, [
            JSON.stringify(val),
          ]);
          publicTableSignatures.set(key, currentSig);
        }
      } else if (Array.isArray(val) || (typeof val === "object" && val !== null)) {
        const currentSig = computePublicSignature(val);
        if (publicTableSignatures.get(key) !== currentSig) {
          hasChanges = true;
          sqliteDb.run("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)", [
            key,
            JSON.stringify(val),
          ]);
          publicTableSignatures.set(key, currentSig);
        }
      } else if (val !== undefined) {
        const currentSig = String(val);
        if (publicTableSignatures.get(key) !== currentSig) {
          hasChanges = true;
          sqliteDb.run("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)", [
            key,
            JSON.stringify(val),
          ]);
          publicTableSignatures.set(key, currentSig);
        }
      }
    }

    sqliteDb.run("COMMIT;");
    if (hasChanges) {
      schedulePersist();
    }
  } catch (err: any) {
    console.error("[SQLITE SAVE FOUT]:", err);
    try {
      sqliteDb.run("ROLLBACK;");
    } catch (_e) {
      // Ignore rollback errors
    }
  }
}

/**
 * Fast atomic save for a single item in a public table
 */
export function savePublicItem(tableName: string, item: any) {
  if (!sqliteDb || !item || !TABLE_DEFINITIONS[tableName]) return;
  try {
    const itemId = String(item.id || item.email || item.slug || item.key || crypto.randomUUID());
    sqliteDb.run(`INSERT OR REPLACE INTO ${tableName} (id, data) VALUES (?, ?)`, [itemId, JSON.stringify(item)]);
    publicTableSignatures.delete(tableName);
    cachedFullDb = null;
    schedulePersist();
  } catch (err) {
    console.error(`[SQLITE SAVE ITEM FOUT] voor tabel '${tableName}':`, err);
  }
}

export function saveVaultItemAndInvalidate(tableName: SensitiveTable, item: any) {
  saveVaultItem(tableName, item);
  vaultTableSignatures.delete(tableName);
  cachedFullDb = null;
}

export { saveVaultItem, deleteVaultItem };

export function getSqliteFilePath(): string {
  return SQLITE_FILE;
}

/**
 * Get custom value from kv_store
 */
export function getKv(key: string): any {
  if (!sqliteDb || !key) return null;
  try {
    const res = sqliteDb.exec("SELECT value FROM kv_store WHERE key = ?", [key]);
    if (res.length > 0 && res[0].values && res[0].values[0]) {
      return JSON.parse(res[0].values[0][0]);
    }
  } catch (_e) {
    // ignore parse error
  }
  return null;
}

/**
 * Set custom value in kv_store and persist atomically
 */
export function setKv(key: string, value: any): void {
  if (!sqliteDb || !key) return;
  try {
    sqliteDb.run("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)", [
      key,
      JSON.stringify(value),
    ]);
    publicTableSignatures.delete(key);
    if (cachedFullDb) {
      cachedFullDb[key] = value;
    }
    schedulePersist();
  } catch (err) {
    console.error(`[SQLITE setKv FOUT] voor key ${key}:`, err);
  }
}

/**
 * Get all favorited documents for a specific user
 */
export function getUserDocumentFavorites(userId: string): any[] {
  if (!sqliteDb || !userId) return [];
  try {
    const rows = sqliteDb.exec("SELECT data FROM documentFavorites");
    if (rows.length > 0 && rows[0].values) {
      return rows[0].values
        .map((v: any) => {
          try {
            return JSON.parse(v[0]);
          } catch {
            return null;
          }
        })
        .filter((item: any) => item && String(item.userId) === String(userId))
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
  } catch (e) {
    console.warn("[SQLITE] Could not query documentFavorites:", e);
  }
  return [];
}

/**
 * Get set of lowercase filenames favorited by a user
 */
export function getUserFavoriteFilenames(userId: string): Set<string> {
  const set = new Set<string>();
  if (!userId) return set;
  const list = getUserDocumentFavorites(userId);
  for (const item of list) {
    if (item.filename) {
      set.add(item.filename.toLowerCase().trim());
    }
  }
  return set;
}

/**
 * Toggle favorite status of a document for a user
 */
export function toggleUserDocumentFavorite(
  userId: string,
  doc: {
    filename: string;
    title?: string;
    dossier?: string;
    date?: string | null;
    fileExists?: boolean;
    fileUrl?: string;
    fileSize?: number;
  }
): { isFavorite: boolean; favorites: any[] } {
  if (!sqliteDb || !userId || !doc?.filename) {
    return { isFavorite: false, favorites: [] };
  }

  const cleanFn = doc.filename.trim();
  const id = `${String(userId)}_${cleanFn.toLowerCase()}`;

  let isFavorite = false;
  try {
    const existing = sqliteDb.exec("SELECT id FROM documentFavorites WHERE id = ?", [id]);
    if (existing.length > 0 && existing[0].values && existing[0].values.length > 0) {
      // Unfavorite
      sqliteDb.run("DELETE FROM documentFavorites WHERE id = ?", [id]);
      isFavorite = false;
    } else {
      // Favorite
      const record = {
        id,
        userId: String(userId),
        filename: cleanFn,
        title: doc.title || cleanFn.replace(/\.pdf$/i, ""),
        dossier: doc.dossier || "Overig",
        date: doc.date || null,
        fileExists: doc.fileExists ?? true,
        fileUrl: doc.fileUrl || `/uploads/documents/${encodeURIComponent(cleanFn)}`,
        fileSize: doc.fileSize,
        createdAt: new Date().toISOString(),
      };
      sqliteDb.run("INSERT OR REPLACE INTO documentFavorites (id, data) VALUES (?, ?)", [
        id,
        JSON.stringify(record),
      ]);
      isFavorite = true;
    }
    schedulePersist();
  } catch (err) {
    console.error("[SQLITE] Error toggling document favorite:", err);
  }

  const favorites = getUserDocumentFavorites(userId);
  return { isFavorite, favorites };
}

// ---------------------------------------------------------
// Council Search & Document Views Audit Logging
// ---------------------------------------------------------

export interface CouncilSearchLogEntry {
  id: string;
  query: string;
  userId?: string | null;
  userName?: string;
  userEmail?: string | null;
  userRole?: string;
  isAnonymous: boolean;
  totalHits: number;
  documentsCount: number;
  dossiersCount: number;
  tookMs?: number;
  filters?: any;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

export interface CouncilDocumentViewEntry {
  id: string;
  filename: string;
  title: string;
  dossierName?: string;
  documentId?: string | null;
  userId?: string | null;
  userName?: string;
  userEmail?: string | null;
  userRole?: string;
  isAnonymous: boolean;
  source?: string;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

/**
 * Record a council search event to SQLite audit logs
 */
export function recordCouncilSearchLog(entry: Omit<CouncilSearchLogEntry, "id" | "timestamp">): CouncilSearchLogEntry | null {
  if (!sqliteDb) return null;
  try {
    const id = `srch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const logItem: CouncilSearchLogEntry = {
      id,
      ...entry,
      timestamp: new Date().toISOString(),
    };
    sqliteDb.run("INSERT OR REPLACE INTO councilSearchLogs (id, data) VALUES (?, ?)", [
      id,
      JSON.stringify(logItem),
    ]);
    schedulePersist();
    return logItem;
  } catch (err) {
    console.error("[SQLITE] Error recording council search log:", err);
    return null;
  }
}

/**
 * Record a council document view/open event to SQLite audit logs
 */
export function recordCouncilDocumentView(entry: Omit<CouncilDocumentViewEntry, "id" | "timestamp">): CouncilDocumentViewEntry | null {
  if (!sqliteDb) return null;
  try {
    const id = `view_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const logItem: CouncilDocumentViewEntry = {
      id,
      ...entry,
      timestamp: new Date().toISOString(),
    };
    sqliteDb.run("INSERT OR REPLACE INTO councilDocumentViews (id, data) VALUES (?, ?)", [
      id,
      JSON.stringify(logItem),
    ]);
    schedulePersist();
    return logItem;
  } catch (err) {
    console.error("[SQLITE] Error recording council document view log:", err);
    return null;
  }
}

/**
 * Retrieve council search logs with limit
 */
export function getCouncilSearchLogs(limit = 500): CouncilSearchLogEntry[] {
  if (!sqliteDb) return [];
  const safeLimit = Math.max(1, Math.min(2000, Number.isInteger(Number(limit)) ? Math.floor(Number(limit)) : 500));
  try {
    const rows = sqliteDb.exec(`SELECT data FROM councilSearchLogs ORDER BY rowid DESC LIMIT ${safeLimit}`);
    if (rows.length > 0 && rows[0].values) {
      return rows[0].values
        .map((v: any) => {
          try {
            return JSON.parse(v[0]);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    }
  } catch (err) {
    console.error("[SQLITE] Error retrieving council search logs:", err);
  }
  return [];
}

/**
 * Retrieve council document view logs with limit
 */
export function getCouncilDocumentViews(limit = 500): CouncilDocumentViewEntry[] {
  if (!sqliteDb) return [];
  const safeLimit = Math.max(1, Math.min(2000, Number.isInteger(Number(limit)) ? Math.floor(Number(limit)) : 500));
  try {
    const rows = sqliteDb.exec(`SELECT data FROM councilDocumentViews ORDER BY rowid DESC LIMIT ${safeLimit}`);
    if (rows.length > 0 && rows[0].values) {
      return rows[0].values
        .map((v: any) => {
          try {
            return JSON.parse(v[0]);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    }
  } catch (err) {
    console.error("[SQLITE] Error retrieving council document views:", err);
  }
  return [];
}

/**
 * Clear all council search logs
 */
export function clearCouncilSearchLogs(): boolean {
  if (!sqliteDb) return false;
  try {
    sqliteDb.run("DELETE FROM councilSearchLogs");
    schedulePersist();
    return true;
  } catch (err) {
    console.error("[SQLITE] Error clearing council search logs:", err);
    return false;
  }
}

/**
 * Clear all council document views
 */
export function clearCouncilDocumentViews(): boolean {
  if (!sqliteDb) return false;
  try {
    sqliteDb.run("DELETE FROM councilDocumentViews");
    schedulePersist();
    return true;
  } catch (err) {
    console.error("[SQLITE] Error clearing council document views:", err);
    return false;
  }
}

// ---------------------------------------------------------
// Global Navbar Search Audit Logging
// ---------------------------------------------------------

export interface NavbarSearchLogEntry {
  id: string;
  query: string;
  userId?: string | null;
  userName?: string;
  userEmail?: string | null;
  userRole?: string;
  isAnonymous: boolean;
  resultsCount: number;
  countsBreakdown?: {
    all: number;
    nieuws: number;
    standpunt: number;
    agenda: number;
  } | null;
  activeTab?: string;
  source?: string;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

/**
 * Record a navbar search query event to SQLite audit logs
 */
export function recordNavbarSearchLog(entry: Omit<NavbarSearchLogEntry, "id" | "timestamp">): NavbarSearchLogEntry | null {
  if (!sqliteDb) return null;
  try {
    const id = `navsrch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const logItem: NavbarSearchLogEntry = {
      id,
      ...entry,
      timestamp: new Date().toISOString(),
    };
    sqliteDb.run("INSERT OR REPLACE INTO navbarSearchLogs (id, data) VALUES (?, ?)", [
      id,
      JSON.stringify(logItem),
    ]);
    schedulePersist();
    return logItem;
  } catch (err) {
    console.error("[SQLITE] Error recording navbar search log:", err);
    return null;
  }
}

/**
 * Retrieve navbar search logs with limit
 */
export function getNavbarSearchLogs(limit = 1000): NavbarSearchLogEntry[] {
  if (!sqliteDb) return [];
  const safeLimit = Math.max(1, Math.min(2000, Number.isInteger(Number(limit)) ? Math.floor(Number(limit)) : 1000));
  try {
    const rows = sqliteDb.exec(`SELECT data FROM navbarSearchLogs ORDER BY rowid DESC LIMIT ${safeLimit}`);
    if (rows.length > 0 && rows[0].values) {
      return rows[0].values
        .map((v: any) => {
          try {
            return JSON.parse(v[0]);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    }
  } catch (err) {
    console.error("[SQLITE] Error retrieving navbar search logs:", err);
  }
  return [];
}

/**
 * Clear all navbar search logs
 */
export function clearNavbarSearchLogs(): boolean {
  if (!sqliteDb) return false;
  try {
    sqliteDb.run("DELETE FROM navbarSearchLogs");
    schedulePersist();
    return true;
  } catch (err) {
    console.error("[SQLITE] Error clearing navbar search logs:", err);
    return false;
  }
}

// ---------------------------------------------------------
// Visitor Performance & Page Load Diagnostics Audit Logging
// ---------------------------------------------------------

export interface PerformanceLogEntry {
  id: string;
  timestamp: string;
  visitorId: string;
  sessionId?: string;
  navigationType: "initial_load" | "route_change" | "reload";
  path: string;
  fromPath?: string;
  pageTitle?: string;
  pageLoadDurationMs: number;
  fetchDurationMs: number;
  renderDurationMs: number;
  ttfbMs?: number;
  domInteractiveMs?: number;
  domContentLoadedMs?: number;
  componentsBuilt?: { name: string; durationMs: number }[];
  fetchCallsCount: number;
  failedFetchCount: number;
  hasBadGateway: boolean;
  hasServerError: boolean;
  hasFetchError: boolean;
  status: "success" | "warning" | "error" | "bad_gateway";
  httpStatusCode?: number;
  errorDetails?: {
    url: string;
    status?: number;
    statusText?: string;
    durationMs?: number;
    errorMessage?: string;
  }[];
  deviceType?: "desktop" | "mobile" | "tablet";
  browser?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  ip?: string;
  userAgent?: string;
}

/**
 * Record a visitor performance & page transition log entry
 */
export function recordPerformanceLog(
  entry: Omit<PerformanceLogEntry, "id" | "timestamp"> & { id?: string; timestamp?: string }
): PerformanceLogEntry | null {
  if (!sqliteDb) return null;
  try {
    const id = entry.id || `perf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = entry.timestamp || new Date().toISOString();
    const logItem: PerformanceLogEntry = {
      ...entry,
      id,
      timestamp,
      visitorId: entry.visitorId || "anoniem",
      path: entry.path || "/",
      pageLoadDurationMs: Number(entry.pageLoadDurationMs) || 0,
      fetchDurationMs: Number(entry.fetchDurationMs) || 0,
      renderDurationMs: Number(entry.renderDurationMs) || 0,
      fetchCallsCount: Number(entry.fetchCallsCount) || 0,
      failedFetchCount: Number(entry.failedFetchCount) || 0,
      hasBadGateway: Boolean(entry.hasBadGateway),
      hasServerError: Boolean(entry.hasServerError),
      hasFetchError: Boolean(entry.hasFetchError),
      status: entry.status || (entry.hasBadGateway ? "bad_gateway" : entry.hasServerError || entry.hasFetchError ? "error" : "success"),
    };

    sqliteDb.run(
      "INSERT OR REPLACE INTO performanceLogs (id, visitorId, path, status, data, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
      [id, logItem.visitorId, logItem.path, logItem.status, JSON.stringify(logItem), timestamp]
    );

    // Keep table bounded to last 5000 entries to prevent infinite growth
    sqliteDb.run("DELETE FROM performanceLogs WHERE rowid IN (SELECT rowid FROM performanceLogs ORDER BY rowid DESC LIMIT -1 OFFSET 5000)");

    schedulePersist();
    return logItem;
  } catch (err) {
    console.error("[SQLITE] Error recording performance log:", err);
    return null;
  }
}

/**
 * Retrieve performance logs with filtering
 */
export function getPerformanceLogs(options: {
  limit?: number;
  visitorId?: string;
  status?: string;
  path?: string;
  hasErrorsOnly?: boolean;
} = {}): PerformanceLogEntry[] {
  if (!sqliteDb) return [];
  const limit = Math.max(1, Math.min(2000, Number.isInteger(Number(options.limit)) ? Math.floor(Number(options.limit)) : 500));

  try {
    let query = "SELECT data FROM performanceLogs WHERE 1=1";
    const params: any[] = [];

    if (options.visitorId) {
      query += " AND visitorId = ?";
      params.push(options.visitorId);
    }

    if (options.status) {
      query += " AND status = ?";
      params.push(options.status);
    }

    if (options.path) {
      query += " AND path LIKE ?";
      params.push(`%${options.path}%`);
    }

    query += " ORDER BY rowid DESC LIMIT " + limit;

    const rows = sqliteDb.exec(query, params);
    if (rows.length > 0 && rows[0].values) {
      const logs: PerformanceLogEntry[] = rows[0].values
        .map((v: any) => {
          try {
            return JSON.parse(v[0]);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      if (options.hasErrorsOnly) {
        return logs.filter((l) => l.hasBadGateway || l.hasServerError || l.hasFetchError || l.status === "bad_gateway" || l.status === "error");
      }
      return logs;
    }
  } catch (err) {
    console.error("[SQLITE] Error retrieving performance logs:", err);
  }
  return [];
}

/**
 * Get aggregated performance statistics
 */
export function getPerformanceStats(): {
  totalLogs: number;
  uniqueVisitors: number;
  avgLoadTimeMs: number;
  avgFetchDurationMs: number;
  avgRenderDurationMs: number;
  badGatewayCount: number;
  serverErrorCount: number;
  fetchErrorCount: number;
  recentSlowestRoutes: { path: string; avgLoadTimeMs: number; count: number }[];
} {
  const defaultStats = {
    totalLogs: 0,
    uniqueVisitors: 0,
    avgLoadTimeMs: 0,
    avgFetchDurationMs: 0,
    avgRenderDurationMs: 0,
    badGatewayCount: 0,
    serverErrorCount: 0,
    fetchErrorCount: 0,
    recentSlowestRoutes: [],
  };

  if (!sqliteDb) return defaultStats;

  try {
    const allLogs = getPerformanceLogs({ limit: 1500 });
    if (allLogs.length === 0) return defaultStats;

    const visitorsSet = new Set<string>();
    let totalLoadTime = 0;
    let totalFetchTime = 0;
    let totalRenderTime = 0;
    let badGateways = 0;
    let serverErrors = 0;
    let fetchErrors = 0;

    const routeStatsMap = new Map<string, { totalTime: number; count: number }>();

    for (const log of allLogs) {
      if (log.visitorId) visitorsSet.add(log.visitorId);
      totalLoadTime += log.pageLoadDurationMs || 0;
      totalFetchTime += log.fetchDurationMs || 0;
      totalRenderTime += log.renderDurationMs || 0;
      if (log.hasBadGateway || log.status === "bad_gateway") badGateways++;
      if (log.hasServerError) serverErrors++;
      if (log.hasFetchError) fetchErrors++;

      const p = log.path || "/";
      const existing = routeStatsMap.get(p) || { totalTime: 0, count: 0 };
      existing.totalTime += log.pageLoadDurationMs || 0;
      existing.count += 1;
      routeStatsMap.set(p, existing);
    }

    const slowestRoutes = Array.from(routeStatsMap.entries())
      .map(([path, data]) => ({
        path,
        avgLoadTimeMs: Math.round((data.totalTime / data.count) * 10) / 10,
        count: data.count,
      }))
      .sort((a, b) => b.avgLoadTimeMs - a.avgLoadTimeMs)
      .slice(0, 5);

    return {
      totalLogs: allLogs.length,
      uniqueVisitors: visitorsSet.size,
      avgLoadTimeMs: Math.round((totalLoadTime / allLogs.length) * 10) / 10,
      avgFetchDurationMs: Math.round((totalFetchTime / allLogs.length) * 10) / 10,
      avgRenderDurationMs: Math.round((totalRenderTime / allLogs.length) * 10) / 10,
      badGatewayCount: badGateways,
      serverErrorCount: serverErrors,
      fetchErrorCount: fetchErrors,
      recentSlowestRoutes: slowestRoutes,
    };
  } catch (err) {
    console.error("[SQLITE] Error calculating performance stats:", err);
    return defaultStats;
  }
}

/**
 * Clear all performance logs
 */
export function clearPerformanceLogs(): boolean {
  if (!sqliteDb) return false;
  try {
    sqliteDb.run("DELETE FROM performanceLogs");
    schedulePersist();
    return true;
  } catch (err) {
    console.error("[SQLITE] Error clearing performance logs:", err);
    return false;
  }
}

/**
 * Export performance logs formatted as CSV or JSON
 */
export function exportPerformanceLogs(format: "csv" | "json" = "csv"): string {
  const logs = getPerformanceLogs({ limit: 2000 });

  if (format === "json") {
    return JSON.stringify(logs, null, 2);
  }

  // Generate CSV with BOM for full Excel UTF-8 support
  const headers = [
    "Tijdstip",
    "Bezoeker ID",
    "Sessie ID",
    "Navigatie Type",
    "Van Pagina",
    "Naar Pagina",
    "Pagina Titel",
    "Totale Laadtijd (ms)",
    "Fetch Duur (ms)",
    "Render Duur (ms)",
    "TTFB (ms)",
    "DOM Interactive (ms)",
    "Status",
    "HTTP Code",
    "Bad Gateway (502)",
    "Server Fout (500)",
    "Fetch Mislukt",
    "Aantal Fetches",
    "Mislukte Fetches",
    "Foutdetails",
    "Apparaat",
    "Browser",
    "Resolutie",
  ];

  const escapeCsv = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = logs.map((log) => {
    const errorSummary = (log.errorDetails || [])
      .map((e) => `${e.status ? e.status + " " : ""}${e.url}${e.errorMessage ? " (" + e.errorMessage + ")" : ""}`)
      .join(" | ");

    const resolution = log.viewportWidth && log.viewportHeight ? `${log.viewportWidth}x${log.viewportHeight}` : "";

    return [
      escapeCsv(log.timestamp),
      escapeCsv(log.visitorId),
      escapeCsv(log.sessionId || ""),
      escapeCsv(log.navigationType === "initial_load" ? "Eerste laadbeurt" : "Routewissel"),
      escapeCsv(log.fromPath || "-"),
      escapeCsv(log.path),
      escapeCsv(log.pageTitle || ""),
      escapeCsv(log.pageLoadDurationMs),
      escapeCsv(log.fetchDurationMs),
      escapeCsv(log.renderDurationMs),
      escapeCsv(log.ttfbMs ?? ""),
      escapeCsv(log.domInteractiveMs ?? ""),
      escapeCsv(log.status),
      escapeCsv(log.httpStatusCode ?? (log.hasBadGateway ? 502 : log.hasServerError ? 500 : 200)),
      escapeCsv(log.hasBadGateway ? "JA (502)" : "Nee"),
      escapeCsv(log.hasServerError ? "JA (500)" : "Nee"),
      escapeCsv(log.hasFetchError ? "JA" : "Nee"),
      escapeCsv(log.fetchCallsCount),
      escapeCsv(log.failedFetchCount),
      escapeCsv(errorSummary),
      escapeCsv(log.deviceType || "desktop"),
      escapeCsv(log.browser || "Onbekend"),
      escapeCsv(resolution),
    ].join(";");
  });

  return "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
}

export function getRawSqliteDb(): any {
  return sqliteDb;
}

export {
  anonymizeBelafspraakInVault,
  bulkAnonymizeOldBelafsprakenInVault,
  getVaultFilePath,
};


