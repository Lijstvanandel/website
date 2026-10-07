/**
 * scripts/reset-admin.cjs
 *
 * Emergency CLI tool to reset or create an administrator account directly on the server.
 * Usage: node scripts/reset-admin.cjs [username] [password]
 * Example: node scripts/reset-admin.cjs admin MijnVeiligWachtwoord123!
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const rootDir = process.cwd();
const VAULT_SQLITE_FILE = process.env.CRM_VAULT_DATABASE_PATH || path.join(rootDir, "vault_crm_sensitive.sqlite");
const VAULT_KEY_FILE = path.join(rootDir, ".vault_master.key");

const targetUsername = process.argv[2] ? String(process.argv[2]).trim() : "admin";
const targetPassword = process.argv[3] ? String(process.argv[3]) : null;

console.log("\n========================================================");
console.log("🔐  LIJST VAN ANDEL - NOOD ADMIN HERSTELTOOL");
console.log("========================================================\n");

if (!targetPassword) {
  console.error("❌ Fout: Geen wachtwoord opgegeven.");
  console.log("Gebruik:");
  console.log("  node scripts/reset-admin.cjs <gebruikersnaam> <nieuw_wachtwoord>");
  console.log("Voorbeeld:");
  console.log("  node scripts/reset-admin.cjs admin Welkom2026!\n");
  process.exit(1);
}

// 1. Sleutel ophalen of genereren
function getMasterKey() {
  if (process.env.CRM_VAULT_ENCRYPTION_KEY && process.env.CRM_VAULT_ENCRYPTION_KEY.trim().length >= 32) {
    return crypto.createHash("sha256").update(process.env.CRM_VAULT_ENCRYPTION_KEY.trim()).digest();
  }
  if (fs.existsSync(VAULT_KEY_FILE)) {
    const content = fs.readFileSync(VAULT_KEY_FILE, "utf-8").trim();
    if (content.length >= 32) {
      return crypto.createHash("sha256").update(content).digest();
    }
  }
  const randomHex = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(VAULT_KEY_FILE, randomHex, { mode: 0o600 });
  return crypto.createHash("sha256").update(randomHex).digest();
}

const key = getMasterKey();

function encryptItem(data) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const jsonStr = JSON.stringify(data);
  let ciphertext = cipher.update(jsonStr, "utf8", "base64");
  ciphertext += cipher.final("base64");
  const authTag = cipher.getAuthTag();
  return {
    ciphertext,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

function decryptItem(row) {
  try {
    const iv = Buffer.from(row.iv, "base64");
    const authTag = Buffer.from(row.authTag, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(row.ciphertext, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

async function run() {
  const initSqlJs = require("sql.js");
  const SQL = await initSqlJs();

  let db;
  if (fs.existsSync(VAULT_SQLITE_FILE)) {
    const fileBuf = fs.readFileSync(VAULT_SQLITE_FILE);
    db = new SQL.Database(fileBuf);
  } else {
    db = new SQL.Database();
  }

  db.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, ciphertext TEXT, iv TEXT, authTag TEXT, updatedAt TEXT)");

  // Laad bestaande users
  let users = [];
  const rows = db.exec("SELECT id, ciphertext, iv, authTag FROM users");
  if (rows.length > 0 && rows[0].values) {
    for (const v of rows[0].values) {
      const parsed = decryptItem({ ciphertext: v[1], iv: v[2], authTag: v[3] });
      if (parsed) users.push(parsed);
    }
  }

  const hashedPassword = await bcrypt.hash(targetPassword, 10);
  const now = new Date().toISOString();

  let existing = users.find(u => (u.username || "").toLowerCase() === targetUsername.toLowerCase());

  if (existing) {
    existing.password = hashedPassword;
    existing.role = "admin";
    existing.isActive = true;
    existing.portalApproved = true;
    existing.updatedAt = now;
    console.log(`✓ Bestaande gebruiker '${targetUsername}' bijgewerkt met nieuw wachtwoord en beheerdersrechten.`);
  } else {
    existing = {
      id: "admin_" + Date.now().toString(),
      fullName: "Systeembeheerder",
      username: targetUsername,
      email: targetUsername.includes("@") ? targetUsername : "admin@lijstvanandel.nl",
      password: hashedPassword,
      role: "admin",
      isActive: true,
      portalApproved: true,
      billingStatus: "exempt",
      createdAt: now,
      updatedAt: now
    };
    users.unshift(existing);
    console.log(`✓ Nieuw beheerdersaccount '${targetUsername}' aangemaakt met rol 'admin'.`);
  }

  // Opslaan in SQLite Vault
  const enc = encryptItem(existing);
  db.run(
    "INSERT OR REPLACE INTO users (id, ciphertext, iv, authTag, updatedAt) VALUES (?, ?, ?, ?, ?)",
    [existing.id, enc.ciphertext, enc.iv, enc.authTag, now]
  );

  const exported = db.export();
  fs.writeFileSync(VAULT_SQLITE_FILE, Buffer.from(exported));

  console.log("\n--------------------------------------------------------");
  console.log(`✅ Succes! Beheerdersaccount is ingesteld in ${VAULT_SQLITE_FILE}.`);
  console.log(`   Gebruikersnaam : ${targetUsername}`);
  console.log(`   Rol            : admin`);
  console.log("--------------------------------------------------------");
  console.log("Herstart nu de server ('pm2 restart all') en log in via /login.\n");
}

run().catch((err) => {
  console.error("❌ Fout bij resetten van admin account:", err);
  process.exit(1);
});
