/**
 * scripts/backup-council.cjs
 * 
 * Beveiligt alle raadsbijdragen, geparkeerde bespreekstukken, CRM-kluis en SQLite-databases
 * vóórdat een 'git pull' wordt uitgevoerd op de productieserver.
 */
const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backupDir = path.join(rootDir, "backups", "council_snapshots", `snapshot_${timestamp}`);
const latestDir = path.join(rootDir, "backups", "council_snapshots", "latest");

console.log("\n========================================================");
console.log("🛡️  LIJST VAN ANDEL - RAADSPANEEL & KLUIS BACK-UP TOOL");
console.log("========================================================\n");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(backupDir);
ensureDir(latestDir);

const filesToBackup = [
  "database.sqlite",
  "database.sqlite-wal",
  "database.sqlite-journal",
  "vault_crm_sensitive.sqlite",
  "vault_crm_sensitive.sqlite-wal",
  ".vault_master.key",
  ".council_vault/contributions_vault.json",
  "data/council_contributions_master.json",
  "data/council_vault/contributions_vault.json",
  "src/data/persisted_council_contributions.json",
  "db.json"
];

let backedUpCount = 0;

for (const relPath of filesToBackup) {
  const src = path.join(rootDir, relPath);
  if (fs.existsSync(src)) {
    const stat = fs.statSync(src);
    if (stat.isFile()) {
      const destSnapshot = path.join(backupDir, relPath);
      const destLatest = path.join(latestDir, relPath);

      ensureDir(path.dirname(destSnapshot));
      ensureDir(path.dirname(destLatest));

      fs.copyFileSync(src, destSnapshot);
      fs.copyFileSync(src, destLatest);
      console.log(`  ✓ Veiliggesteld: ${relPath} (${(stat.size / 1024).toFixed(1)} KB)`);
      backedUpCount++;
    }
  }
}

// Meta-bestand met samenvatting
const meta = {
  timestamp: new Date().toISOString(),
  backedUpCount,
  files: filesToBackup.filter(f => fs.existsSync(path.join(rootDir, f)))
};
fs.writeFileSync(path.join(backupDir, "backup_meta.json"), JSON.stringify(meta, null, 2));
fs.writeFileSync(path.join(latestDir, "backup_meta.json"), JSON.stringify(meta, null, 2));

console.log("\n--------------------------------------------------------");
console.log(`✅ Succesvol ${backedUpCount} bestanden beveiligd in:`);
console.log(`   📁 ${backupDir}`);
console.log(`   📁 ${latestDir}`);
console.log("\nU kunt nu veilig de volgende commando's uitvoeren:");
console.log("   git pull origin main");
console.log("   npm run restore:council  (indien er bestanden overschreven zijn)");
console.log("========================================================\n");
