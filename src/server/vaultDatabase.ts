import fs from "fs";
import path from "path";
import crypto from "crypto";

// Physical file for isolated sensitive CRM Vault
const VAULT_SQLITE_FILE =
  process.env.CRM_VAULT_DATABASE_PATH || path.join(process.cwd(), "vault_crm_sensitive.sqlite");
const VAULT_KEY_FILE = path.join(process.cwd(), ".vault_master.key");

let vaultSqliteDb: any = null;
let vaultSaveTimeout: NodeJS.Timeout | null = null;
let masterEncryptionKey: Buffer | null = null;

// Sensitive table definitions strictly isolated in the Vault
export const SENSITIVE_TABLE_NAMES = [
  "belafspraken",
  "contactMessages",
  "stellingSubmissions",
  "newsletterSubscribers",
  "eventTickets",
  "eventCancellations",
  "donations",
  "users",
  "pushSubscriptions",
  "pushLogs",
  "auditLogs",
  "treasurerAccounts",
  "treasurerInvoices",
  "treasurerAfdrachten",
  "treasurerBudget",
  "treasurerKascommissie",
  "treasurerSettings",
  "internalCouncilStrategy",
] as const;

export type SensitiveTable = (typeof SENSITIVE_TABLE_NAMES)[number];

const VAULT_TABLE_DEFINITIONS: { [table: string]: string } = {
  belafspraken: "CREATE TABLE IF NOT EXISTS belafspraken (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  contactMessages: "CREATE TABLE IF NOT EXISTS contactMessages (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  stellingSubmissions: "CREATE TABLE IF NOT EXISTS stellingSubmissions (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  newsletterSubscribers: "CREATE TABLE IF NOT EXISTS newsletterSubscribers (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  eventTickets: "CREATE TABLE IF NOT EXISTS eventTickets (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  eventCancellations: "CREATE TABLE IF NOT EXISTS eventCancellations (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  donations: "CREATE TABLE IF NOT EXISTS donations (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  users: "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  pushSubscriptions: "CREATE TABLE IF NOT EXISTS pushSubscriptions (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  pushLogs: "CREATE TABLE IF NOT EXISTS pushLogs (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  auditLogs: "CREATE TABLE IF NOT EXISTS auditLogs (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  treasurerAccounts: "CREATE TABLE IF NOT EXISTS treasurerAccounts (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  treasurerInvoices: "CREATE TABLE IF NOT EXISTS treasurerInvoices (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  treasurerAfdrachten: "CREATE TABLE IF NOT EXISTS treasurerAfdrachten (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  treasurerBudget: "CREATE TABLE IF NOT EXISTS treasurerBudget (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  treasurerKascommissie: "CREATE TABLE IF NOT EXISTS treasurerKascommissie (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  treasurerSettings: "CREATE TABLE IF NOT EXISTS treasurerSettings (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  internalCouncilStrategy: "CREATE TABLE IF NOT EXISTS internalCouncilStrategy (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
  vault_kv: "CREATE TABLE IF NOT EXISTS vault_kv (key TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)",
};

/**
 * Obtain or initialize the AES-256-GCM master encryption key.
 * Loaded from environment or stored in a restricted local key file (chmod 0600).
 */
export function getOrCreateMasterEncryptionKey(): Buffer {
  if (masterEncryptionKey) return masterEncryptionKey;

  const envKey = process.env.CRM_VAULT_ENCRYPTION_KEY;
  if (envKey && envKey.trim().length >= 32) {
    masterEncryptionKey = crypto.createHash("sha256").update(envKey.trim()).digest();
    return masterEncryptionKey;
  }

  if (fs.existsSync(VAULT_KEY_FILE)) {
    try {
      const fileContent = fs.readFileSync(VAULT_KEY_FILE, "utf-8").trim();
      if (fileContent.length >= 32) {
        masterEncryptionKey = crypto.createHash("sha256").update(fileContent).digest();
        return masterEncryptionKey;
      }
    } catch (err) {
      console.warn("[CRM-VAULT] Kon bestaande sleutel niet lezen, genereer nieuwe veilige sleutel:", err);
    }
  }

  // Generate a high-entropy 256-bit random key
  const randomHex = crypto.randomBytes(32).toString("hex");
  try {
    fs.writeFileSync(VAULT_KEY_FILE, randomHex, { mode: 0o600 });
  } catch (err) {
    console.warn("[CRM-VAULT] Kon sleutelbestand niet opslaan met chmod 0600:", err);
  }
  masterEncryptionKey = crypto.createHash("sha256").update(randomHex).digest();
  return masterEncryptionKey;
}

/**
 * AES-256-GCM Encryption at Rest helper
 */
export function encryptVaultPayload(data: any): { ciphertext: string; iv: string; authTag: string } {
  const key = getOrCreateMasterEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const serialized = JSON.stringify(data);
  let encrypted = cipher.update(serialized, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    authTag,
  };
}

/**
 * AES-256-GCM Decryption helper
 */
export function decryptVaultPayload(row: { ciphertext: string; iv: string; authTag: string } | null | undefined): any {
  if (!row || !row.ciphertext || !row.iv || !row.authTag) return null;
  try {
    const key = getOrCreateMasterEncryptionKey();
    const iv = Buffer.from(row.iv, "base64");
    const authTag = Buffer.from(row.authTag, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(row.ciphertext, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  } catch (err) {
    console.error("[CRM-VAULT DECRYPTION ERROR] Mislukt om record te ontsleutelen:", err);
    return null;
  }
}

/**
 * Initialize isolated physical SQLite database for sensitive CRM & Strategy
 */
export async function initVaultDatabase(sqlInstance: any) {
  if (vaultSqliteDb) return vaultSqliteDb;

  getOrCreateMasterEncryptionKey();

  if (fs.existsSync(VAULT_SQLITE_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(VAULT_SQLITE_FILE);
      vaultSqliteDb = new sqlInstance.Database(fileBuffer);
      console.log("[CRM-VAULT] Bestaande vault_crm_sensitive.sqlite succesvol ingeladen met AES-256-GCM encryptie.");
    } catch (err: any) {
      console.error("[CRM-VAULT FOUT] Kon vault database niet lezen, nieuwe wordt aangemaakt:", err);
      vaultSqliteDb = new sqlInstance.Database();
    }
  } else {
    vaultSqliteDb = new sqlInstance.Database();
    console.log("[CRM-VAULT] Nieuwe geïsoleerde CRM-Vault database aangemaakt op disk.");
  }

  vaultSqliteDb.run("PRAGMA journal_mode = WAL;");
  vaultSqliteDb.run("PRAGMA synchronous = NORMAL;");

  for (const table of Object.keys(VAULT_TABLE_DEFINITIONS)) {
    vaultSqliteDb.run(VAULT_TABLE_DEFINITIONS[table]);
  }

  persistVaultSqlite();
  return vaultSqliteDb;
}

/**
 * Persist Vault SQLite database to disk atomically
 */
export function persistVaultSqlite() {
  if (!vaultSqliteDb) return;
  try {
    const parentDir = path.dirname(VAULT_SQLITE_FILE);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    const data = vaultSqliteDb.export();
    const buffer = Buffer.from(data);
    const tempFile = `${VAULT_SQLITE_FILE}.tmp`;
    fs.writeFileSync(tempFile, buffer, { mode: 0o600 });
    fs.renameSync(tempFile, VAULT_SQLITE_FILE);
  } catch (err: any) {
    console.error("[CRM-VAULT PERSIST FOUT]:", err);
  }
}

export function scheduleVaultPersist() {
  if (vaultSaveTimeout) clearTimeout(vaultSaveTimeout);
  vaultSaveTimeout = setTimeout(() => {
    persistVaultSqlite();
  }, 50);
}

/**
 * Load array records from a sensitive table, decrypting on the fly
 */
export function loadVaultTable(tableName: SensitiveTable): any[] {
  if (!vaultSqliteDb) return [];
  try {
    const rows = vaultSqliteDb.exec(`SELECT ciphertext, iv, authTag FROM ${tableName}`);
    if (rows.length > 0 && rows[0].values) {
      return rows[0].values
        .map((v: any) => decryptVaultPayload({ ciphertext: v[0], iv: v[1], authTag: v[2] }))
        .filter(Boolean);
    }
  } catch (err) {
    console.error(`[CRM-VAULT LOAD FOUT] Kon tabel '${tableName}' niet laden:`, err);
  }
  return [];
}

/**
 * Save array records to a sensitive table with AES-256-GCM encryption at rest
 */
export function saveVaultTable(tableName: SensitiveTable, items: any[]) {
  if (!vaultSqliteDb || !Array.isArray(items)) return;
  try {
    vaultSqliteDb.run("BEGIN TRANSACTION;");
    vaultSqliteDb.run(`DELETE FROM ${tableName};`);

    const nowIso = new Date().toISOString();
    for (const item of items) {
      if (!item) continue;
      const itemId = String(item.id || item.email || item.username || item.key || crypto.randomUUID());
      const encrypted = encryptVaultPayload(item);

      vaultSqliteDb.run(
        `INSERT INTO ${tableName} (id, ciphertext, iv, authTag, updatedAt) VALUES (?, ?, ?, ?, ?)`,
        [itemId, encrypted.ciphertext, encrypted.iv, encrypted.authTag, nowIso]
      );
    }

    vaultSqliteDb.run("COMMIT;");
    scheduleVaultPersist();
  } catch (err) {
    console.error(`[CRM-VAULT SAVE FOUT] Kon tabel '${tableName}' niet opslaan:`, err);
    try {
      vaultSqliteDb.run("ROLLBACK;");
    } catch (_e) {
      // ignore
    }
  }
}

/**
 * Load single object table (e.g. treasurerKascommissie, treasurerSettings)
 */
export function loadVaultSingle(tableName: SensitiveTable): any {
  if (!vaultSqliteDb) return null;
  try {
    const rows = vaultSqliteDb.exec(`SELECT ciphertext, iv, authTag FROM ${tableName} WHERE id = 'default' LIMIT 1`);
    if (rows.length > 0 && rows[0].values && rows[0].values.length > 0) {
      const v = rows[0].values[0];
      return decryptVaultPayload({ ciphertext: v[0], iv: v[1], authTag: v[2] });
    }
  } catch (err) {
    console.error(`[CRM-VAULT SINGLE LOAD FOUT] voor '${tableName}':`, err);
  }
  return null;
}

/**
 * Save single object table with encryption
 */
export function saveVaultSingle(tableName: SensitiveTable, item: any) {
  if (!vaultSqliteDb) return;
  try {
    if (!item) {
      vaultSqliteDb.run(`DELETE FROM ${tableName} WHERE id = 'default'`);
    } else {
      const encrypted = encryptVaultPayload(item);
      const nowIso = new Date().toISOString();
      vaultSqliteDb.run(
        `INSERT OR REPLACE INTO ${tableName} (id, ciphertext, iv, authTag, updatedAt) VALUES ('default', ?, ?, ?, ?)`,
        [encrypted.ciphertext, encrypted.iv, encrypted.authTag, nowIso]
      );
    }
    scheduleVaultPersist();
  } catch (err) {
    console.error(`[CRM-VAULT SINGLE SAVE FOUT] voor '${tableName}':`, err);
  }
}

/**
 * Automatic Migration & Sanitization:
 * Migrates sensitive records from the public database into the encrypted Vault,
 * and immediately PURGES the records from the public database to eliminate data cross-contamination!
 */
export function migrateAndSanitizePublicDatabase(publicDb: any) {
  if (!publicDb || !vaultSqliteDb) return;

  try {
    console.log("[CRM-VAULT] Bezig met controleren en scheiden van gevoelige persoons- en fractiedata...");
    let migratedAny = false;

    for (const tableName of SENSITIVE_TABLE_NAMES) {
      try {
        // Check if public database contains records in this sensitive table
        const res = publicDb.exec(`SELECT count(*) FROM ${tableName}`);
        const count = res.length > 0 && res[0].values.length > 0 ? Number(res[0].values[0][0]) : 0;

        if (count > 0) {
          // Check how many we already have in the vault
          const vaultRes = vaultSqliteDb.exec(`SELECT count(*) FROM ${tableName}`);
          const vaultCount = vaultRes.length > 0 && vaultRes[0].values.length > 0 ? Number(vaultRes[0].values[0][0]) : 0;

          if (vaultCount === 0) {
            console.log(`[CRM-VAULT MIGRATIE] ${count} records uit '${tableName}' veilig versleutelen en verplaatsen naar de geïsoleerde Vault...`);
            const rows = publicDb.exec(`SELECT id, data FROM ${tableName}`);
            if (rows.length > 0 && rows[0].values) {
              const items: any[] = [];
              for (const [id, rawData] of rows[0].values) {
                try {
                  const parsed = JSON.parse(rawData);
                  items.push(parsed);
                } catch (_e) {
                  // ignore
                }
              }

              if (tableName === "treasurerKascommissie" || tableName === "treasurerSettings") {
                if (items.length > 0) saveVaultSingle(tableName, items[0]);
              } else {
                saveVaultTable(tableName, items);
              }
              migratedAny = true;
            }
          }

          // PURGE from public database to achieve 100% physical segregation
          console.log(`[DATA-ISOLATIE] Gevoelige persoonsdata tabel '${tableName}' DEFINITIEF wissen uit openbare database...`);
          publicDb.run(`DELETE FROM ${tableName};`);
        }
      } catch (_tableErr) {
        // Table may not exist in public db, ignore
      }
    }

    if (migratedAny) {
      persistVaultSqlite();
      console.log("[CRM-VAULT MIGRATIE] Gevoelige data succesvol geïsoleerd en versleuteld met AES-256-GCM.");
    }
  } catch (err) {
    console.error("[CRM-VAULT MIGRATIE FOUT]:", err);
  }
}

/**
 * AVG Artikel 17 Compliance: Recht op vergetelheid & Inwoner anonimisering
 * Verwijdert herleidbare persoonsgegevens (naam, telefoon, e-mail, vrije notities)
 * met behoud van geaggregeerde statistieken (datum, tijd, categorie, status).
 */
export function anonymizeBelafspraakInVault(appointmentId: string): { success: boolean; data?: any } {
  const appointments = loadVaultTable("belafspraken");
  const index = appointments.findIndex((a: any) => a.id === appointmentId);
  if (index === -1) return { success: false };

  const target = appointments[index];
  target.name = "[Inwoner geanonimiseerd conform AVG Art. 17]";
  target.phone = "[Verwijderd conform AVG]";
  target.email = "";
  target.onderwerp = target.onderwerp ? `[Geanonimiseerd onderwerp: ${target.onderwerp.substring(0, 15)}...]` : "";
  target.notitie = target.notitie ? `[Inhoudelijke burger-notitie gewist conform AVG bewaartermijnen]` : "";
  target.isAnonymized = true;
  target.anonymizedAt = new Date().toISOString();

  appointments[index] = target;
  saveVaultTable("belafspraken", appointments);

  return { success: true, data: target };
}

/**
 * Bulk data retention: Anonimiseer afgehandelde belafspraken ouder dan X dagen (standaard 30 dagen)
 */
export function bulkAnonymizeOldBelafsprakenInVault(retentionDays = 30): { anonymizedCount: number } {
  const appointments = loadVaultTable("belafspraken");
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let count = 0;

  for (const appt of appointments) {
    if (appt.isAnonymized) continue;
    // Check if appointment is handled and older than cutoff
    if (appt.status === "afgehandeld" || appt.status === "nam niet op" || appt.status === "niet afgehandeld") {
      const apptDate = new Date(appt.datum || appt.createdAt).getTime();
      if (apptDate < cutoffTime) {
        appt.name = "[Inwoner geanonimiseerd conform AVG Art. 17]";
        appt.phone = "[Verwijderd conform AVG]";
        appt.email = "";
        appt.notitie = "[Burger-notitie gewist wegens verlopen bewaartermijn]";
        appt.isAnonymized = true;
        appt.anonymizedAt = new Date().toISOString();
        count++;
      }
    }
  }

  if (count > 0) {
    saveVaultTable("belafspraken", appointments);
  }

  return { anonymizedCount: count };
}

export function getVaultFilePath(): string {
  return VAULT_SQLITE_FILE;
}
