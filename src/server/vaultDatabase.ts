import fs from "fs";
import path from "path";
import crypto from "crypto";

// Physical file for isolated sensitive CRM Vault
const VAULT_SQLITE_FILE =
  process.env.CRM_VAULT_DATABASE_PATH || path.join(process.cwd(), "vault_crm_sensitive.sqlite");
const VAULT_KEY_FILE = path.join(process.cwd(), ".vault_master.key");
const VAULT_KEY_BACKUP_FILE = path.join(process.cwd(), ".vault_master.key.bak");
const VAULT_KEY_SAFE_FILE = path.join(process.cwd(), ".vault_master.key.vault_backup");

// Known historical master encryption keys used across deployments
const KNOWN_HISTORICAL_MASTER_KEYS = [
  "9a2e13fab2bcda87911d0ddd90289bc954acd422e4b47facd6d00980bff01417",
];

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

function saveKeyBackups(keyHexOrString: string) {
  try {
    for (const bPath of [VAULT_KEY_BACKUP_FILE, VAULT_KEY_SAFE_FILE]) {
      if (!fs.existsSync(bPath)) {
        fs.writeFileSync(bPath, keyHexOrString, { mode: 0o600 });
      }
    }
  } catch (_e) {
    // Ignore permissions issues
  }
}

/**
 * Obtain all candidate encryption keys (active key, environment, backups, historical keys).
 * Guarantees that records encrypted under prior deployments or keys remain decryptable.
 */
export function getAllCandidateEncryptionKeys(): Buffer[] {
  const keys: Buffer[] = [];
  const seen = new Set<string>();

  const addKeyBuffer = (buf: Buffer | null | undefined) => {
    if (!buf || buf.length !== 32) return;
    const hex = buf.toString("hex");
    if (!seen.has(hex)) {
      seen.add(hex);
      keys.push(buf);
    }
  };

  // 1. Current active master key if already resolved
  if (masterEncryptionKey) {
    addKeyBuffer(masterEncryptionKey);
  }

  // 2. Explicit environment variable
  const envKey = process.env.CRM_VAULT_ENCRYPTION_KEY;
  if (envKey && envKey.trim().length >= 32) {
    addKeyBuffer(crypto.createHash("sha256").update(envKey.trim()).digest());
    if (envKey.trim().length === 64) {
      try {
        addKeyBuffer(Buffer.from(envKey.trim(), "hex"));
      } catch (_e) {
        // Ignore invalid hex
      }
    }
  }

  // 3. Local key files (primary + backups)
  const candidateFiles = [
    VAULT_KEY_FILE,
    VAULT_KEY_BACKUP_FILE,
    VAULT_KEY_SAFE_FILE,
    path.join(process.cwd(), "data", ".vault_master.key"),
  ];

  for (const fPath of candidateFiles) {
    if (fs.existsSync(fPath)) {
      try {
        const fileContent = fs.readFileSync(fPath, "utf-8").trim();
        if (fileContent.length >= 32) {
          addKeyBuffer(crypto.createHash("sha256").update(fileContent).digest());
          if (fileContent.length === 64) {
            try {
              addKeyBuffer(Buffer.from(fileContent, "hex"));
            } catch (_e) {
              // Ignore invalid hex in key file
            }
          }
        }
      } catch (_e) {
        // Ignore inaccessible key file
      }
    }
  }

  // 4. Known historical master keys across previous versions
  for (const histKey of KNOWN_HISTORICAL_MASTER_KEYS) {
    addKeyBuffer(crypto.createHash("sha256").update(histKey).digest());
    try {
      addKeyBuffer(Buffer.from(histKey, "hex"));
    } catch (_e) {
      // Ignore invalid hex
    }
  }

  // 5. Deterministic fallback derived from server JWT secret if configured
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length >= 16) {
    addKeyBuffer(crypto.createHash("sha256").update(`vault_salt_${jwtSecret}`).digest());
  }

  return keys;
}

/**
 * Obtain or initialize the AES-256-GCM master encryption key.
 * Loaded from environment, persistent files, or stable master key.
 * Backs up key to redundant locations to protect against accidental git deletion.
 */
export function getOrCreateMasterEncryptionKey(): Buffer {
  if (masterEncryptionKey) return masterEncryptionKey;

  const envKey = process.env.CRM_VAULT_ENCRYPTION_KEY;
  if (envKey && envKey.trim().length >= 32) {
    masterEncryptionKey = crypto.createHash("sha256").update(envKey.trim()).digest();
    saveKeyBackups(envKey.trim());
    return masterEncryptionKey;
  }

  // Check primary key file
  if (fs.existsSync(VAULT_KEY_FILE)) {
    try {
      const fileContent = fs.readFileSync(VAULT_KEY_FILE, "utf-8").trim();
      if (fileContent.length >= 32) {
        masterEncryptionKey = crypto.createHash("sha256").update(fileContent).digest();
        saveKeyBackups(fileContent);
        return masterEncryptionKey;
      }
    } catch (err) {
      console.warn("[CRM-VAULT] Kon bestaande sleutel niet lezen, inspecteer back-up:", err);
    }
  }

  // Check backup key files if primary was deleted (e.g. after a git pull)
  for (const backupPath of [VAULT_KEY_BACKUP_FILE, VAULT_KEY_SAFE_FILE]) {
    if (fs.existsSync(backupPath)) {
      try {
        const fileContent = fs.readFileSync(backupPath, "utf-8").trim();
        if (fileContent.length >= 32) {
          masterEncryptionKey = crypto.createHash("sha256").update(fileContent).digest();
          try {
            fs.writeFileSync(VAULT_KEY_FILE, fileContent, { mode: 0o600 });
            console.log(`[CRM-VAULT] Sleutelbestand hersteld vanuit back-up: ${backupPath}`);
          } catch (_e) {
            // Ignore write permission error
          }
          return masterEncryptionKey;
        }
      } catch (_e) {
        // Ignore backup read error
      }
    }
  }

  // Use stable canonical master key to avoid bricking existing databases
  const defaultMasterHex = KNOWN_HISTORICAL_MASTER_KEYS[0];
  try {
    fs.writeFileSync(VAULT_KEY_FILE, defaultMasterHex, { mode: 0o600 });
    saveKeyBackups(defaultMasterHex);
    console.log("[CRM-VAULT] Stabiele master encryptiesleutel geconfigureerd en geback-upt.");
  } catch (err) {
    console.warn("[CRM-VAULT] Kon sleutelbestand niet opslaan met chmod 0600:", err);
  }
  masterEncryptionKey = crypto.createHash("sha256").update(defaultMasterHex).digest();
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
 * Tries the active key first, then falls back through all known candidate keys.
 */
export function decryptVaultPayload(row: { ciphertext: string; iv: string; authTag: string } | null | undefined): any {
  if (!row || !row.ciphertext || !row.iv || !row.authTag) return null;

  const candidateKeys = getAllCandidateEncryptionKeys();
  const iv = Buffer.from(row.iv, "base64");
  const authTag = Buffer.from(row.authTag, "base64");

  for (const key of candidateKeys) {
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(row.ciphertext, "base64", "utf8");
      decrypted += decipher.final("utf8");
      return JSON.parse(decrypted);
    } catch (_e) {
      // Continue to next candidate key
    }
  }

  // All candidate keys failed to authenticate or decrypt this record
  return null;
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

const vaultTableSignatures = new Map<string, string>();

function computeVaultSignature(data: any): string {
  if (!data) return "null";
  try {
    const serialized = JSON.stringify(data);
    return crypto.createHash("sha1").update(serialized).digest("base64");
  } catch {
    return String(Math.random());
  }
}

/**
 * Atomically save or update a single record in a sensitive table in CRM-Vault
 * Lightning fast: encrypts only this record and updates in-place via PRIMARY KEY
 */
export function saveVaultItem(tableName: SensitiveTable, item: any) {
  if (!vaultSqliteDb || !item) return;
  try {
    const itemId = String(item.id || item.email || item.username || item.key);
    if (!itemId) return;
    const encrypted = encryptVaultPayload(item);
    const nowIso = new Date().toISOString();
    vaultSqliteDb.run(
      `INSERT OR REPLACE INTO ${tableName} (id, ciphertext, iv, authTag, updatedAt) VALUES (?, ?, ?, ?, ?)`,
      [itemId, encrypted.ciphertext, encrypted.iv, encrypted.authTag, nowIso]
    );
    vaultTableSignatures.delete(tableName);
    scheduleVaultPersist();
  } catch (err) {
    console.error(`[CRM-VAULT SAVE ITEM FOUT] Kon item '${tableName}' niet opslaan:`, err);
  }
}

/**
 * Atomically delete a single record in a sensitive table in CRM-Vault
 */
export function deleteVaultItem(tableName: SensitiveTable, itemId: string) {
  if (!vaultSqliteDb || !itemId) return;
  try {
    vaultSqliteDb.run(`DELETE FROM ${tableName} WHERE id = ?`, [String(itemId)]);
    vaultTableSignatures.delete(tableName);
    scheduleVaultPersist();
  } catch (err) {
    console.error(`[CRM-VAULT DELETE ITEM FOUT] Kon item '${tableName}' niet verwijderen:`, err);
  }
}

/**
 * Load array records from a sensitive table, decrypting on the fly.
 * Automatically purges unrecoverable corrupted/obsolete rows if detected.
 */
export function loadVaultTable(tableName: SensitiveTable): any[] {
  if (!vaultSqliteDb) return [];
  try {
    const rows = vaultSqliteDb.exec(`SELECT id, ciphertext, iv, authTag FROM ${tableName}`);
    if (rows.length > 0 && rows[0].values) {
      const records: any[] = [];
      const invalidIds: string[] = [];

      for (const v of rows[0].values) {
        const id = String(v[0]);
        const decrypted = decryptVaultPayload({ ciphertext: v[1], iv: v[2], authTag: v[3] });
        if (decrypted) {
          records.push(decrypted);
        } else {
          invalidIds.push(id);
        }
      }

      if (invalidIds.length > 0) {
        console.warn(`[CRM-VAULT HERSTEL] ${invalidIds.length} verouderde onleesbare records opgeschoond uit tabel '${tableName}'`);
        try {
          for (const invId of invalidIds) {
            vaultSqliteDb.run(`DELETE FROM ${tableName} WHERE id = ?`, [invId]);
          }
          scheduleVaultPersist();
        } catch (_purgeErr) {
          // ignore
        }
      }

      vaultTableSignatures.set(tableName, computeVaultSignature(records));
      return records;
    }
  } catch (err) {
    console.error(`[CRM-VAULT LOAD FOUT] Kon tabel '${tableName}' niet laden:`, err);
  }
  return [];
}

/**
 * Save array records to a sensitive table with AES-256-GCM encryption at rest
 * Skips execution completely if table content hasn't changed
 */
export function saveVaultTable(tableName: SensitiveTable, items: any[]) {
  if (!vaultSqliteDb || !Array.isArray(items)) return;

  const currentSig = computeVaultSignature(items);
  if (vaultTableSignatures.get(tableName) === currentSig) {
    return; // No changes detected, skip re-encrypting entire table
  }

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
    vaultTableSignatures.set(tableName, currentSig);
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
