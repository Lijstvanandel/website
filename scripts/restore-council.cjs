/**
 * scripts/restore-council.cjs
 * 
 * Herstelt raadsbijdragen, bespreekstukken en databases na een git pull of container herstart.
 */
const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const targetSnapshot = process.argv[2] 
  ? path.resolve(process.argv[2]) 
  : path.join(rootDir, "backups", "council_snapshots", "latest");

console.log("\n========================================================");
console.log("🔄  LIJST VAN ANDEL - RAADSPANEEL & KLUIS RESTORE TOOL");
console.log("========================================================\n");

if (!fs.existsSync(targetSnapshot)) {
  console.error(`❌ Fout: Geen back-up snapshot gevonden op: ${targetSnapshot}`);
  console.log("   Voer eerst 'npm run backup:council' uit vóór een pull.\n");
  process.exit(1);
}

function restoreRecursive(sourceDir, relativeDir = "") {
  let count = 0;
  const currentDir = path.join(sourceDir, relativeDir);
  const items = fs.readdirSync(currentDir);

  for (const item of items) {
    if (item === "backup_meta.json") continue;
    const srcPath = path.join(currentDir, item);
    const relItemPath = path.join(relativeDir, item);
    const destPath = path.join(rootDir, relItemPath);

    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      count += restoreRecursive(sourceDir, relItemPath);
    } else if (stat.isFile()) {
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ✓ Hersteld: ${relItemPath} (${(stat.size / 1024).toFixed(1)} KB)`);
      count++;
    }
  }
  return count;
}

const restored = restoreRecursive(targetSnapshot);

console.log("\n--------------------------------------------------------");
console.log(`✅ ${restored} bestand(en) succesvol hersteld vanuit ${targetSnapshot}!`);
console.log("De raadskluis en databases zijn weer 100% up-to-date.");
console.log("========================================================\n");
