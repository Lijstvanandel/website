import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";

const SQLITE_FILE = process.env.DATABASE_PATH || path.join(process.cwd(), "database.sqlite");
const LEGACY_JSON = path.join(process.cwd(), "db.json");

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
  systemSettings: "CREATE TABLE IF NOT EXISTS systemSettings (id TEXT PRIMARY KEY, data TEXT)",
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
 * Extract full domain state object seamlessly from SQLite
 */
export function getDbFromSqlite(): any {
  if (!sqliteDb) {
    // If not yet initialized synchronously (unlikely), fallback
    return {};
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
  };

  // Load list tables
  const listTables = [
    "users",
    "fractieleden",
    "videos",
    "news",
    "events",
    "categories",
    "contactMessages",
    "faqs",
    "wijken",
    "documents",
    "stemgedrag",
    "stellingSubmissions",
    "qrLocations",
    "stellingen",
    "belafspraken",
    "newsletterSubscribers",
    "newsletters",
    "eventTickets",
    "eventCancellations",
    "donations",
    "pushSubscriptions",
    "pushLogs",
    "auditLogs",
    "councilAgendaTopics",
  ];

  for (const table of listTables) {
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
  }

  // Load single-object tables
  try {
    const memRows = sqliteDb.exec("SELECT data FROM membershipSettings WHERE id = 'default' LIMIT 1");
    if (memRows.length > 0 && memRows[0].values && memRows[0].values.length > 0) {
      result.membershipSettings = JSON.parse(memRows[0].values[0][0]);
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
      }
    }
  } catch (_e) {
    // Keep defaults
  }

  return result;
}

/**
 * Save complete or partial domain state directly to SQLite with high-performance transactions
 */
export function saveDbToSqlite(data: any) {
  if (!sqliteDb || !data) return;

  try {
    sqliteDb.run("BEGIN TRANSACTION;");

    for (const [key, val] of Object.entries(data)) {
      if (TABLE_DEFINITIONS[key] && Array.isArray(val)) {
        // Clear old table and insert updated items
        sqliteDb.run(`DELETE FROM ${key};`);
        for (const item of val) {
          if (!item) continue;
          const itemId = String(item.id || item.email || item.slug || item.key || crypto.randomUUID());
          sqliteDb.run(`INSERT INTO ${key} (id, data) VALUES (?, ?)`, [itemId, JSON.stringify(item)]);
        }
      } else if (key === "membershipSettings" && val && typeof val === "object") {
        sqliteDb.run("INSERT OR REPLACE INTO membershipSettings (id, data) VALUES ('default', ?)", [
          JSON.stringify(val),
        ]);
      } else if (Array.isArray(val) || (typeof val === "object" && val !== null)) {
        sqliteDb.run("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)", [
          key,
          JSON.stringify(val),
        ]);
      } else if (val !== undefined) {
        sqliteDb.run("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)", [
          key,
          JSON.stringify(val),
        ]);
      }
    }

    sqliteDb.run("COMMIT;");
    schedulePersist();
  } catch (err: any) {
    console.error("[SQLITE SAVE FOUT]:", err);
    try {
      sqliteDb.run("ROLLBACK;");
    } catch (_e) {
      // Ignore rollback errors
    }
  }
}
