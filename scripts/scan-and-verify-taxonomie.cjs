#!/usr/bin/env node

/**
 * Scan & Verificatie Script: Raadsstukken & 12 Officiële Taxonomie Categorieën
 * 
 * Gebruik:
 *   node scripts/scan-and-verify-taxonomie.cjs
 *   node scripts/scan-and-verify-taxonomie.cjs --standardize
 */

const fs = require('fs');
const path = require('path');

const ROOT_DOCS_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');
const METADATA_JSON_PATH = path.join(process.cwd(), 'public', 'data', 'raadsstukken_metadata_tussentijds.json');
const SRC_METADATA_JSON_PATH = path.join(process.cwd(), 'src', 'data', 'raadsstukken_metadata_tussentijds.json');
const METADATA_CSV_PATH = path.join(process.cwd(), 'public', 'data', 'raadsstukken_metadata_tussentijds.csv');
const DIST_METADATA_CSV_PATH = path.join(process.cwd(), 'dist', 'data', 'raadsstukken_metadata_tussentijds.csv');
const GRAPH_JSON_PATH = path.join(process.cwd(), 'public', 'data', 'network_graph.json');
const SRC_GRAPH_JSON_PATH = path.join(process.cwd(), 'src', 'data', 'network_graph.json');

// De 12 officiële taxonomie categorieën van de gemeente Steenwijkerland
const OFFICIAL_DOSSIERS = [
  "Wonen, Bouwen & Ontwikkeling",
  "Natuur, Milieu & Klimaat",
  "Verkeer, Wegen & Bereikbaarheid",
  "Openbare Ruimte & Onderhoud",
  "Economie, Ondernemen & Toerisme",
  "Werk, Inkomen & Armoede",
  "Zorg, Gezondheid & Welzijn",
  "Jeugd, Gezin & Onderwijs",
  "Veiligheid, Toezicht & Handhaving",
  "Kunst, Cultuur & Sport",
  "Samenleving, Inclusie & Wijken",
  "Bestuur, Financiën & Organisatie"
];

// ANSI Kleurcodes voor mooie terminalweergave
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgBlue: "\x1b[44m"
};

// 1. Scan schijf recursief voor alle PDF-bestanden
function scanPdfs(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  function walk(currentDir) {
    const list = fs.readdirSync(currentDir);
    for (const item of list) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile() && item.toLowerCase().endsWith('.pdf')) {
        results.push({
          filename: item,
          fullPath: fullPath,
          relativePath: path.relative(ROOT_DOCS_DIR, fullPath),
          sizeBytes: stat.size
        });
      }
    }
  }

  walk(dir);
  return results;
}

// 2. Map willekeurig ad-hoc of ambtelijk label naar de 12 officiële taxonomieën
function mapToOfficialDossier(dossier, title = "") {
  const d = (dossier || "").toLowerCase().trim();
  const t = (title || "").toLowerCase().trim();
  const combined = d + " " + t;

  // Exact match
  for (const off of OFFICIAL_DOSSIERS) {
    if (off.toLowerCase() === d) return off;
  }

  // 1. Wonen, Bouwen & Ontwikkeling
  if (
    combined.includes("woningbouw") ||
    combined.includes("bestemmingsplan") ||
    combined.includes("omgevingsvergunning") ||
    combined.includes("omgevingsplan") ||
    combined.includes("ruimtelijke ordening") ||
    combined.includes("ruimtelijke inrichting") ||
    combined.includes("ruimtelijke ontwikkeling") ||
    combined.includes("grondexploitatie") ||
    combined.includes("nieuwbouw") ||
    combined.includes("sociale woningbouw") ||
    combined.includes("woonvisie") ||
    combined.includes("woonschepen") ||
    combined.includes("woonwagen") ||
    combined.includes("herbestemming") ||
    combined.includes("grondaankoop") ||
    combined.includes("grondbeleid") ||
    combined.includes("stadsvisie")
  ) {
    return "Wonen, Bouwen & Ontwikkeling";
  }

  // 2. Natuur, Milieu & Klimaat
  if (
    combined.includes("stikstof") ||
    combined.includes("icebear") ||
    combined.includes("windenergie") ||
    combined.includes("windturbine") ||
    combined.includes("zonnepark") ||
    combined.includes("zonneweide") ||
    combined.includes("zonne-energie") ||
    combined.includes("duurzaam") ||
    combined.includes("klimaat") ||
    combined.includes("energietransitie") ||
    combined.includes("bodemsanering") ||
    combined.includes("bodemverontreiniging") ||
    combined.includes("pfas") ||
    combined.includes("waterpeil") ||
    combined.includes("peilbesluit") ||
    combined.includes("watertoets") ||
    combined.includes("waterbeheer") ||
    combined.includes("flora") ||
    combined.includes("fauna") ||
    combined.includes("weerribben") ||
    combined.includes("natura 2000") ||
    combined.includes("res") ||
    combined.includes("regionale energie") ||
    combined.includes("transformatorstation") ||
    combined.includes("compactstation") ||
    combined.includes("bomen") ||
    combined.includes("luchtkwaliteit") ||
    combined.includes("emissie") ||
    combined.includes("geur")
  ) {
    return "Natuur, Milieu & Klimaat";
  }

  // 3. Verkeer, Wegen & Bereikbaarheid
  if (
    combined.includes("verkeer") ||
    combined.includes("wegen") ||
    combined.includes("mobiliteit") ||
    combined.includes("fiets") ||
    combined.includes("parkeer") ||
    combined.includes("bus") ||
    combined.includes("openbaar vervoer") ||
    combined.includes("gvvp") ||
    combined.includes("laadpaal") ||
    combined.includes("spoor") ||
    combined.includes("station") ||
    combined.includes("brug") ||
    combined.includes("wegdek")
  ) {
    return "Verkeer, Wegen & Bereikbaarheid";
  }

  // 4. Openbare Ruimte & Onderhoud
  if (
    combined.includes("openbare ruimte") ||
    combined.includes("verlichting") ||
    combined.includes("riolering") ||
    combined.includes("watertaken") ||
    combined.includes("onderhoud maatschappelijk") ||
    combined.includes("vastgoedonderhoud") ||
    combined.includes("begraafplaats") ||
    combined.includes("gladheid") ||
    combined.includes("exoten") ||
    combined.includes("ligplaats") ||
    combined.includes("hemelwater") ||
    combined.includes("havenbeheer")
  ) {
    return "Openbare Ruimte & Onderhoud";
  }

  // 5. Economie, Ondernemen & Toerisme
  if (
    combined.includes("bedrijventerrein") ||
    combined.includes("ondernemen") ||
    combined.includes("ondernemer") ||
    combined.includes("detailhandel") ||
    combined.includes("toerisme") ||
    combined.includes("toeristenbelasting") ||
    combined.includes("recreatie") ||
    combined.includes("horeca") ||
    combined.includes("vaarverordening") ||
    combined.includes("vaar-") ||
    combined.includes("pachtbeleid") ||
    combined.includes("agrarisch beleid") ||
    combined.includes("aan huis gebonden") ||
    combined.includes("bedrijfsontwikkeling") ||
    combined.includes("eeserwold") ||
    combined.includes("groot verlaat")
  ) {
    return "Economie, Ondernemen & Toerisme";
  }

  // 6. Werk, Inkomen & Armoede
  if (
    combined.includes("participatiewet") ||
    combined.includes("schuldhulp") ||
    combined.includes("armoede") ||
    combined.includes("inkomen") ||
    combined.includes("bijstand") ||
    combined.includes("werkloos") ||
    combined.includes("noordwestgroep") ||
    combined.includes("studietoeslag") ||
    combined.includes("starterslening") ||
    combined.includes("cao aan de slag")
  ) {
    return "Werk, Inkomen & Armoede";
  }

  // 7. Zorg, Gezondheid & Welzijn
  if (
    combined.includes("wmo") ||
    combined.includes("zorg") ||
    combined.includes("gezondheid") ||
    combined.includes("welzijn") ||
    combined.includes("ggd") ||
    combined.includes("volksgezondheid") ||
    combined.includes("publieke gezondheid") ||
    combined.includes("beschermd wonen") ||
    combined.includes("maatschappelijke opvang") ||
    combined.includes("gala") ||
    combined.includes("spuk") ||
    combined.includes("mantelzorg")
  ) {
    return "Zorg, Gezondheid & Welzijn";
  }

  // 8. Jeugd, Gezin & Onderwijs
  if (
    combined.includes("jeugd") ||
    combined.includes("gezin") ||
    combined.includes("onderwijs") ||
    combined.includes("school") ||
    combined.includes("scholen") ||
    combined.includes("kinderopvang") ||
    combined.includes("leerling") ||
    combined.includes("leerlingenvervoer") ||
    combined.includes("leerplicht") ||
    combined.includes("rsj") ||
    combined.includes("kindermishandeling") ||
    combined.includes("huiselijk geweld") ||
    combined.includes("onderwijshuisvesting")
  ) {
    return "Jeugd, Gezin & Onderwijs";
  }

  // 9. Veiligheid, Toezicht & Handhaving
  if (
    combined.includes("veiligheid") ||
    combined.includes("apv") ||
    combined.includes("handhaving") ||
    combined.includes("toezicht") ||
    combined.includes("brandweer") ||
    combined.includes("brandweerzorg") ||
    combined.includes("politie") ||
    combined.includes("cameratoezicht") ||
    combined.includes("camerahandhaving") ||
    combined.includes("veiligheidsregio") ||
    combined.includes("vrij") ||
    combined.includes("ondermijning") ||
    combined.includes("crisisbeheersing") ||
    combined.includes("noodverordening")
  ) {
    return "Veiligheid, Toezicht & Handhaving";
  }

  // 10. Kunst, Cultuur & Sport
  if (
    combined.includes("sport") ||
    combined.includes("cultuur") ||
    combined.includes("kunst") ||
    combined.includes("museum") ||
    combined.includes("spijkervetstallen") ||
    combined.includes("stadsmuseum") ||
    combined.includes("bibliotheek") ||
    combined.includes("theater") ||
    combined.includes("meenthe") ||
    combined.includes("scala") ||
    combined.includes("kunstgras") ||
    combined.includes("monument") ||
    combined.includes("erfgoed") ||
    combined.includes("evenement")
  ) {
    return "Kunst, Cultuur & Sport";
  }

  // 11. Samenleving, Inclusie & Wijken
  if (
    combined.includes("samenleving") ||
    combined.includes("inclusie") ||
    combined.includes("wijken") ||
    combined.includes("kernen") ||
    combined.includes("dorpsplan") ||
    combined.includes("asiel") ||
    combined.includes("opvang") ||
    combined.includes("vluchteling") ||
    combined.includes("oekraïne") ||
    combined.includes("inburgering") ||
    combined.includes("burgeramendement") ||
    combined.includes("burgerinitiatief") ||
    combined.includes("participatie") ||
    combined.includes("plaatselijk belang") ||
    combined.includes("dorpsbelang") ||
    combined.includes("sociaal domein") ||
    combined.includes("spreidingswet")
  ) {
    return "Samenleving, Inclusie & Wijken";
  }

  // 12. Bestuur, Financiën & Organisatie
  return "Bestuur, Financiën & Organisatie";
}

// 3. Render visuele voortgangsbalk
function renderProgressBar(current, total, barLength = 40) {
  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 1000) / 10) : 0;
  const filledLength = Math.round((barLength * percentage) / 100);
  const emptyLength = barLength - filledLength;

  const filledBar = "█".repeat(filledLength);
  const emptyBar = "░".repeat(emptyLength);

  return `${C.cyan}[${C.green}${filledBar}${C.dim}${emptyBar}${C.cyan}] ${C.bold}${percentage.toFixed(1)}%${C.reset} (${current}/${total})`;
}

// Hoofdroutine
function main() {
  const shouldStandardize = process.argv.includes('--standardize') || process.argv.includes('--fix');

  console.log(`\n${C.bold}${C.blue}================================================================================${C.reset}`);
  console.log(`${C.bold}${C.white}   AUDIT & VERIFICATIE RAADSSTUKKEN: 12 OFFICIËLE TAXONOMIE-CATEGORIEËN       ${C.reset}`);
  console.log(`${C.bold}${C.blue}================================================================================${C.reset}\n`);

  // CSV locatie toelichten
  console.log(`${C.bold}📁 Bestandsbronnen en CSV Referenties:${C.reset}`);
  console.log(`  • Master CSV (volledige merge):  ${C.cyan}${METADATA_CSV_PATH}${C.reset}`);
  console.log(`  • Master JSON (huidige actueel): ${C.cyan}${METADATA_JSON_PATH}${C.reset}`);
  console.log(`  • Documenten upload directory:   ${C.cyan}${ROOT_DOCS_DIR}${C.reset}\n`);

  // Scan PDF bestanden
  const pdfFiles = scanPdfs(ROOT_DOCS_DIR);
  console.log(`🔍 Fysieke PDF-bestanden op schijf: ${C.bold}${pdfFiles.length}${C.reset} bestanden gevonden.`);
  pdfFiles.forEach((p, idx) => {
    console.log(`   [${idx + 1}] ${p.relativePath} (${(p.sizeBytes / 1024).toFixed(1)} KB)`);
  });
  console.log("");

  // Inlezen master JSON metadata
  if (!fs.existsSync(METADATA_JSON_PATH)) {
    console.error(`${C.yellow}Waarschuwing: Master metadata bestand niet gevonden op ${METADATA_JSON_PATH}${C.reset}`);
    return;
  }

  const metadata = JSON.parse(fs.readFileSync(METADATA_JSON_PATH, 'utf8'));
  const totalMetadataCount = metadata.length;

  console.log(`📊 Aantal geregistreerde documenten in master database: ${C.bold}${totalMetadataCount}${C.reset}`);

  // Controleer hoeveel van de fysieke PDFs al zijn opgenomen
  const metadataFilenameSet = new Set(metadata.map(m => (m.bestandsnaam || "").toLowerCase().trim()));
  let physicalPdfsCategorized = 0;
  const missingPdfs = [];

  for (const pdf of pdfFiles) {
    if (metadataFilenameSet.has(pdf.filename.toLowerCase().trim())) {
      physicalPdfsCategorized++;
    } else {
      missingPdfs.push(pdf.filename);
    }
  }

  console.log(`  • Reeds geregistreerd: ${C.green}${physicalPdfsCategorized}/${pdfFiles.length}${C.reset}`);
  if (missingPdfs.length > 0) {
    console.log(`  • ${C.yellow}Nog openstaand/niet gecatalogiseerd op schijf: ${missingPdfs.length}${C.reset} (${missingPdfs.join(", ")})`);
  } else {
    console.log(`  • ${C.green}Alle fysieke PDF's op schijf zijn gecategoriseerd!${C.reset}`);
  }

  // Toon visuele voortgangsbalk voor fysieke PDFs
  console.log(`\n${C.bold}Voortgang categorisatie fysieke PDF uploads:${C.reset}`);
  console.log(`  ${renderProgressBar(physicalPdfsCategorized, pdfFiles.length)}\n`);

  // Controleer conformiteit van de 408 metadata records met de 12 officiële taxonomieën
  let officialCount = 0;
  const distribution = {};
  OFFICIAL_DOSSIERS.forEach(dos => {
    distribution[dos] = 0;
  });

  const adHocDossiers = {};

  metadata.forEach(item => {
    const isOfficial = OFFICIAL_DOSSIERS.includes(item.dossier);
    if (isOfficial) {
      officialCount++;
      distribution[item.dossier] = (distribution[item.dossier] || 0) + 1;
    } else {
      adHocDossiers[item.dossier] = (adHocDossiers[item.dossier] || 0) + 1;
      // Probeer te mappen
      const mapped = mapToOfficialDossier(item.dossier, item.titel);
      distribution[mapped] = (distribution[mapped] || 0) + 1;
    }
  });

  console.log(`${C.bold}Taxonomie Conformiteit van alle ${totalMetadataCount} records:${C.reset}`);
  console.log(`  • Direct conform de 12 officiële namen: ${C.green}${officialCount}/${totalMetadataCount}${C.reset}`);
  console.log(`  • Nog te standaardiseren ad-hoc labels: ${officialCount === totalMetadataCount ? C.green + "0" : C.yellow + (totalMetadataCount - officialCount)}${C.reset}`);

  console.log(`\n${C.bold}Voortgang taxonomie-standaardisatie (12 officiële hoofddossiers):${C.reset}`);
  console.log(`  ${renderProgressBar(officialCount, totalMetadataCount)}\n`);

  // Toon volledige statistische tabel
  console.log(`${C.blue}================================================================================================${C.reset}`);
  console.log(`${C.bold} STATISTISCHE VERDELING PER HOOFDDOSSIER (12 OFFICIËLE CATEGORIEËN)${C.reset}`);
  console.log(`${C.blue}================================================================================================${C.reset}`);
  console.log(`${C.dim}Nr  Hoofddossier                                      Aantal   Percentage   Verdeling${C.reset}`);
  console.log(`${C.blue}------------------------------------------------------------------------------------------------${C.reset}`);

  OFFICIAL_DOSSIERS.forEach((dossier, idx) => {
    const count = distribution[dossier] || 0;
    const pct = totalMetadataCount > 0 ? ((count / totalMetadataCount) * 100).toFixed(1) : "0.0";
    const barBlocks = Math.round((count / totalMetadataCount) * 25);
    const miniBar = "■".repeat(barBlocks) + " ".repeat(25 - barBlocks);
    const numStr = String(idx + 1).padStart(2, "0");
    const nameStr = dossier.padEnd(46, " ");
    const countStr = String(count).padStart(5, " ");
    const pctStr = (pct + "%").padStart(7, " ");

    console.log(` ${C.cyan}${numStr}${C.reset} ${C.bold}${nameStr}${C.reset} ${C.green}${countStr}${C.reset}   ${C.yellow}${pctStr}${C.reset}   ${C.blue}[${miniBar}]${C.reset}`);
  });

  console.log(`${C.blue}================================================================================================${C.reset}`);
  console.log(` ${C.bold}TOTAAL GECATEGORISEERD:${C.reset}                            ${C.green}${String(totalMetadataCount).padStart(5, " ")}${C.reset}   ${C.yellow} 100.0%${C.reset}\n`);

  // Indien er ad-hoc categorieën zijn
  const adHocKeys = Object.keys(adHocDossiers);
  if (adHocKeys.length > 0 && !shouldStandardize) {
    console.log(`${C.yellow}ℹ️ Er zijn ${adHocKeys.length} niet-gestandaardiseerde ad-hoc dossierlabels gevonden in het json bestand (bijv. 'Woningbouw', 'Stikstof', 'Jeugdhulp').${C.reset}`);
    console.log(`Tip: Voer dit script uit met ${C.bold}--standardize${C.reset} om alle 408 records direct netjes naar de 12 officiële taxonomie-hoofddossiers te transformeren en het CSV-bestand bij te werken:\n`);
    console.log(`  ${C.green}node scripts/scan-and-verify-taxonomie.cjs --standardize${C.reset}\n`);
  }

  // Standaardiseren indien gevraagd
  if (shouldStandardize) {
    console.log(`\n${C.bold}${C.magenta}⚡ STANDAARDISATIE WORDT TOEGEPAST OP MASTER METADATA & CSV...${C.reset}`);
    
    let updatedCount = 0;
    const updatedMetadata = metadata.map(item => {
      const currentDossier = item.dossier;
      const officialDossier = mapToOfficialDossier(currentDossier, item.titel);
      
      let subdossier = item.subdossier || "";
      if (!subdossier && currentDossier !== officialDossier) {
        subdossier = currentDossier;
      }

      if (currentDossier !== officialDossier) {
        updatedCount++;
      }

      return {
        ...item,
        dossier: officialDossier,
        subdossier: subdossier
      };
    });

    // Schrijf JSON bestanden weg
    fs.writeFileSync(METADATA_JSON_PATH, JSON.stringify(updatedMetadata, null, 2), 'utf8');
    if (fs.existsSync(path.dirname(SRC_METADATA_JSON_PATH))) {
      fs.writeFileSync(SRC_METADATA_JSON_PATH, JSON.stringify(updatedMetadata, null, 2), 'utf8');
    }

    // Genereer bijgewerkt CSV-bestand
    const csvRows = [
      "bestandsnaam;titel;dossier;subdossier;datum;wijk_of_kern;entiteiten;relaties"
    ];
    updatedMetadata.forEach(item => {
      const row = [
        item.bestandsnaam || "",
        (item.titel || "").replace(/;/g, ","),
        item.dossier || "",
        (item.subdossier || "").replace(/;/g, ","),
        item.datum || "",
        (item.wijk_of_kern || "").replace(/;/g, ","),
        (item.entiteiten || "").replace(/;/g, ","),
        (item.relaties || "").replace(/;/g, ",")
      ].join(";");
      csvRows.push(row);
    });

    const csvContent = csvRows.join("\n");
    fs.writeFileSync(METADATA_CSV_PATH, csvContent, 'utf8');
    if (fs.existsSync(path.dirname(DIST_METADATA_CSV_PATH))) {
      fs.writeFileSync(DIST_METADATA_CSV_PATH, csvContent, 'utf8');
    }

    // Rebuild network graph
    const nodesMap = new Map();
    const edges = [];

    updatedMetadata.forEach((item) => {
      if (!nodesMap.has(item.bestandsnaam)) {
        nodesMap.set(item.bestandsnaam, {
          id: item.bestandsnaam,
          label: item.titel,
          group: item.dossier,
          type: "Raadsstuk",
          date: item.datum || null
        });
      }

      if (item.relaties && typeof item.relaties === 'string') {
        const rels = item.relaties.split(',').map(r => r.trim()).filter(Boolean);
        rels.forEach((rel) => {
          if (!nodesMap.has(rel)) {
            nodesMap.set(rel, {
              id: rel,
              label: rel,
              group: "Referentie",
              type: "Relatie",
              date: null
            });
          }
          edges.push({
            source: item.bestandsnaam,
            target: rel
          });
        });
      }
    });

    const networkGraph = {
      nodes: Array.from(nodesMap.values()),
      edges: edges
    };

    fs.writeFileSync(GRAPH_JSON_PATH, JSON.stringify(networkGraph, null, 2), 'utf8');
    if (fs.existsSync(path.dirname(SRC_GRAPH_JSON_PATH))) {
      fs.writeFileSync(SRC_GRAPH_JSON_PATH, JSON.stringify(networkGraph, null, 2), 'utf8');
    }

    console.log(`  ${C.green}✓ Succesvol ${updatedCount} documenten gestandaardiseerd naar de 12 officiële taxonomieën!${C.reset}`);
    console.log(`  ${C.green}✓ Master JSON bijgewerkt: ${METADATA_JSON_PATH}${C.reset}`);
    console.log(`  ${C.green}✓ Master CSV bijgewerkt:  ${METADATA_CSV_PATH}${C.reset}`);
    console.log(`  ${C.green}✓ Network Graph vernieuwd: ${GRAPH_JSON_PATH}${C.reset}\n`);
  }
}

main();
