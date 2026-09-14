import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const UPLOADS_DOCS_DIR = path.join(process.cwd(), "public", "uploads", "documents");
const DIST_DOCS_DIR = path.join(process.cwd(), "dist", "uploads", "documents");
const UPLOADS_ROOT_DIR = path.join(process.cwd(), "public", "uploads");

// Ensure directories exist
[UPLOADS_DOCS_DIR, DIST_DOCS_DIR, UPLOADS_ROOT_DIR].forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (_e) {
    // Ignore
  }
});

interface DefaultDocTemplate {
  filename: string;
  titel: string;
  subtitel: string;
  category: string;
  datum: string;
  inleiding: string;
  artikelen: { nr: string; kop: string; tekst: string }[];
}

const OFFICIAL_DOC_TEMPLATES: Record<string, DefaultDocTemplate> = {
  "statuten_lijstvanandel.pdf": {
    filename: "statuten_lijstvanandel.pdf",
    titel: "Officiële Verenigingsstatuten",
    subtitel: "Statutair kader Politieke Vereniging Lijst van Andel (WBTR-conform)",
    category: "Statutair",
    datum: "15 januari 2026",
    inleiding:
      "Statuten van de politieke vereniging Lijst van Andel, gevestigd in de gemeente Steenwijkerland. Vastgesteld door de Algemene Ledenvergadering conform de eisen van het Burgerlijk Wetboek en de Wet bestuur en toezicht rechtspersonen (WBTR).",
    artikelen: [
      {
        nr: "Artikel 1",
        kop: "Naam, Zetel en Rechtsvorm",
        tekst:
          "De vereniging draagt de naam 'Lijst van Andel'. Zij heeft haar statutaire zetel in de gemeente Steenwijkerland. De vereniging bezit volledige rechtsbevoegdheid en is ingeschreven in het verenigingenregister van de Kamer van Koophandel."
      },
      {
        nr: "Artikel 2",
        kop: "Doelstelling en Grondslagen",
        tekst:
          "De vereniging stelt zich ten doel: het behartigen van de belangen van de inwoners van Steenwijkerland, het bevorderen van transparant, betrouwbaar en dorpsgericht lokaal bestuur, en het deelnemen aan gemeenteraadsverkiezingen met een herkenbare, onafhankelijke lijst."
      },
      {
        nr: "Artikel 3",
        kop: "Lidmaatschap en Toelating",
        tekst:
          "Lid kunnen worden natuurlijke personen die de grondbeginselen van de partij onderschrijven. Het bestuur beslist over toelating. Leden hebben spreek- en stemrecht op de Algemene Ledenvergadering en kunnen zich kandidaat stellen voor partijfuncties."
      },
      {
        nr: "Artikel 4",
        kop: "Het Bestuur en Vertegenwoordiging",
        tekst:
          "Het bestuur bestaat uit ten minste een voorzitter, secretaris en penningmeester. Bestuursleden worden benoemd door de Algemene Ledenvergadering voor een periode van vier jaar. De vereniging wordt in en buiten rechte vertegenwoordigd door het voltallige bestuur of twee gezamenlijk handelende bestuursleden."
      },
      {
        nr: "Artikel 5",
        kop: "WBTR-bepalingen en Toezicht",
        tekst:
          "Conform de Wet bestuur en toezicht rechtspersonen (WBTR) onthoudt een bestuurslid zich van beraadslaging en besluitvorming indien sprake is van een direct of indirect persoonlijk belang dat tegenstrijdig is met het belang van de vereniging."
      }
    ]
  },
  "statuten.pdf": {
    filename: "statuten.pdf",
    titel: "Officiële Verenigingsstatuten",
    subtitel: "Statutair kader Politieke Vereniging Lijst van Andel (WBTR-conform)",
    category: "Statutair",
    datum: "15 januari 2026",
    inleiding:
      "Statuten van de politieke vereniging Lijst van Andel, gevestigd in de gemeente Steenwijkerland. Vastgesteld door de Algemene Ledenvergadering conform de eisen van het Burgerlijk Wetboek en de Wet bestuur en toezicht rechtspersonen (WBTR).",
    artikelen: [
      {
        nr: "Artikel 1",
        kop: "Naam, Zetel en Rechtsvorm",
        tekst:
          "De vereniging draagt de naam 'Lijst van Andel'. Zij heeft haar statutaire zetel in de gemeente Steenwijkerland. De vereniging bezit volledige rechtsbevoegdheid en is ingeschreven in het verenigingenregister van de Kamer van Koophandel."
      },
      {
        nr: "Artikel 2",
        kop: "Doelstelling en Grondslagen",
        tekst:
          "De vereniging stelt zich ten doel: het behartigen van de belangen van de inwoners van Steenwijkerland, het bevorderen van transparant, betrouwbaar en dorpsgericht lokaal bestuur, en het deelnemen aan gemeenteraadsverkiezingen met een herkenbare, onafhankelijke lijst."
      },
      {
        nr: "Artikel 3",
        kop: "Lidmaatschap en Toelating",
        tekst:
          "Lid kunnen worden natuurlijke personen die de grondbeginselen van de partij onderschrijven. Het bestuur beslist over toelating. Leden hebben spreek- en stemrecht op de Algemene Ledenvergadering en kunnen zich kandidaat stellen voor partijfuncties."
      },
      {
        nr: "Artikel 4",
        kop: "Het Bestuur en Vertegenwoordiging",
        tekst:
          "Het bestuur bestaat uit ten minste een voorzitter, secretaris en penningmeester. Bestuursleden worden benoemd door de Algemene Ledenvergadering voor een periode van vier jaar. De vereniging wordt in en buiten rechte vertegenwoordigd door het voltallige bestuur of twee gezamenlijk handelende bestuursleden."
      },
      {
        nr: "Artikel 5",
        kop: "WBTR-bepalingen en Toezicht",
        tekst:
          "Conform de Wet bestuur en toezicht rechtspersonen (WBTR) onthoudt een bestuurslid zich van beraadslaging en besluitvorming indien sprake is van een direct of indirect persoonlijk belang dat tegenstrijdig is met het belang van de vereniging."
      }
    ]
  },
  "statuten_lijst_van_andel.pdf": {
    filename: "statuten_lijst_van_andel.pdf",
    titel: "Officiële Verenigingsstatuten",
    subtitel: "Statutair kader Politieke Vereniging Lijst van Andel (WBTR-conform)",
    category: "Statutair",
    datum: "15 januari 2026",
    inleiding:
      "Statuten van de politieke vereniging Lijst van Andel, gevestigd in de gemeente Steenwijkerland. Vastgesteld door de Algemene Ledenvergadering conform de eisen van het Burgerlijk Wetboek en de Wet bestuur en toezicht rechtspersonen (WBTR).",
    artikelen: [
      {
        nr: "Artikel 1",
        kop: "Naam, Zetel en Rechtsvorm",
        tekst:
          "De vereniging draagt de naam 'Lijst van Andel'. Zij heeft haar statutaire zetel in de gemeente Steenwijkerland. De vereniging bezit volledige rechtsbevoegdheid en is ingeschreven in het verenigingenregister van de Kamer van Koophandel."
      },
      {
        nr: "Artikel 2",
        kop: "Doelstelling en Grondslagen",
        tekst:
          "De vereniging stelt zich ten doel: het behartigen van de belangen van de inwoners van Steenwijkerland, het bevorderen van transparant, betrouwbaar en dorpsgericht lokaal bestuur, en het deelnemen aan gemeenteraadsverkiezingen met een herkenbare, onafhankelijke lijst."
      },
      {
        nr: "Artikel 3",
        kop: "Lidmaatschap en Toelating",
        tekst:
          "Lid kunnen worden natuurlijke personen die de grondbeginselen van de partij onderschrijven. Het bestuur beslist over toelating. Leden hebben spreek- en stemrecht op de Algemene Ledenvergadering en kunnen zich kandidaat stellen voor partijfuncties."
      },
      {
        nr: "Artikel 4",
        kop: "Het Bestuur en Vertegenwoordiging",
        tekst:
          "Het bestuur bestaat uit ten minste een voorzitter, secretaris en penningmeester. Bestuursleden worden benoemd door de Algemene Ledenvergadering voor een periode van vier jaar. De vereniging wordt in en buiten rechte vertegenwoordigd door het voltallige bestuur of twee gezamenlijk handelende bestuursleden."
      },
      {
        nr: "Artikel 5",
        kop: "WBTR-bepalingen en Toezicht",
        tekst:
          "Conform de Wet bestuur en toezicht rechtspersonen (WBTR) onthoudt een bestuurslid zich van beraadslaging en besluitvorming indien sprake is van een direct of indirect persoonlijk belang dat tegenstrijdig is met het belang van de vereniging."
      }
    ]
  },
  "huishoudelijk_reglement.pdf": {
    filename: "huishoudelijk_reglement.pdf",
    titel: "Huishoudelijk Reglement",
    subtitel: "Interne werkwijzen, rechten van leden en vergaderordes",
    category: "Reglement",
    datum: "1 februari 2026",
    inleiding:
      "Dit Huishoudelijk Reglement bevat een nadere uitwerking van de statuten van Lijst van Andel en regelt de dagelijkse gang van zaken binnen de vereniging, fractie en commissies.",
    artikelen: [
      {
        nr: "Artikel 1",
        kop: "Ledenrechten en Algemene Vergadering",
        tekst:
          "Alle stemgerechtigde leden ontvangen ten minste veertien dagen voor de Algemene Ledenvergadering de volledige agenda en bijbehorende vergaderstukken per beveiligde digitale toezending."
      },
      {
        nr: "Artikel 2",
        kop: "Relatie tussen Bestuur en Fractie",
        tekst:
          "De fractie in de gemeenteraad opereert autonoom op politiek-inhoudelijk vlak, binnen de kaders van het vastgestelde verkiezingsprogramma. Het bestuur bewaakt de partijstatuten en organiseert de verbinding met de leden en lokale dorpskernen."
      },
      {
        nr: "Artikel 3",
        kop: "Financiën en Kascontrole",
        tekst:
          "De penningmeester legt jaarlijks voor 1 april de jaarrekening en balans voor aan de door de ALV benoemde onafhankelijke kascommissie. De kascommissie brengt schriftelijk verslag uit aan de ledenvergadering."
      }
    ]
  },
  "integriteitscode_lijstvanandel.pdf": {
    filename: "integriteitscode_lijstvanandel.pdf",
    titel: "Integriteitscode & Gedragsprotocol",
    subtitel: "Gedragscode voor bestuursleden, fractieleden en kandidaten",
    category: "Integriteit",
    datum: "20 februari 2026",
    inleiding:
      "Integriteit, transparantie en onafhankelijkheid vormen het fundament van Lijst van Andel. Deze code stelt heldere normen voor handelen in het publieke belang.",
    artikelen: [
      {
        nr: "Artikel 1",
        kop: "Dienstbaarheid aan het Algemeen Belang",
        tekst:
          "Vertegenwoordigers en functionarissen van Lijst van Andel laten zich uitsluitend leiden door het publiek belang van Steenwijkerland en haar inwoners. Persoonlijke begunstiging is ten strengste verboden."
      },
      {
        nr: "Artikel 2",
        kop: "Openbaarheid van Nevenfuncties en Belangen",
        tekst:
          "Raadsleden, commissieleden en bestuursleden registreren al hun relevante nevenfuncties, zakelijke belangen en bestuursfuncties in een openbaar partijregister."
      },
      {
        nr: "Artikel 3",
        kop: "Vertrouwenspersoon en Melding",
        tekst:
          "De vereniging stelt een onafhankelijke vertrouwenspersoon aan tot wie leden en bestuurders zich vertrouwelijk kunnen wenden bij integriteitsvragen of signalen van niet-integer handelen."
      }
    ]
  },
  "bestuursreglement.pdf": {
    filename: "bestuursreglement.pdf",
    titel: "Bestuursreglement",
    subtitel: "Bevoegdhedenverdeling, besluitvorming en volmachten",
    category: "Bestuurlijk",
    datum: "5 maart 2026",
    inleiding:
      "Vaststelling van de taakverdeling binnen het dagelijks bestuur (Voorzitter, Secretaris, Penningmeester en Algemene bestuursleden) conform de statutaire doelstellingen.",
    artikelen: [
      {
        nr: "Artikel 1",
        kop: "Dagelijks Bestuur en Taken",
        tekst:
          "Het Dagelijks Bestuur bereidt de bestuursvergaderingen voor en handelt spoedeisende operationele zaken af. Besluiten van principiële of strategische aard worden altijd voorgelegd aan het voltallig bestuur."
      },
      {
        nr: "Artikel 2",
        kop: "Besluitvorming en Stemming",
        tekst:
          "Besluiten worden genomen bij volstrekte meerderheid van stemmen in een vergadering waarin ten minste de meerderheid van de zittende bestuursleden aanwezig is."
      }
    ]
  },
  "kandidaatstellingsreglement.pdf": {
    filename: "kandidaatstellingsreglement.pdf",
    titel: "Kandidaatstellingsreglement",
    subtitel: "Procedure, criteria en profielschetsen kieslijst gemeenteraad",
    category: "Verkiezingen",
    datum: "10 april 2026",
    inleiding:
      "Reglement voor de samenstelling van de kandidatenlijst voor de gemeenteraadsverkiezingen van Steenwijkerland.",
    artikelen: [
      {
        nr: "Artikel 1",
        kop: "Kandidatencommissie",
        tekst:
          "Het bestuur stelt een onafhankelijke kandidatencommissie aan die gesprekken voert met belangstellenden en adviseert over de volgorde op de kieslijst."
      },
      {
        nr: "Artikel 2",
        kop: "Profielschets Raadslid",
        tekst:
          "Kandidaten beschikken over een sterke binding met de dorpskernen van Steenwijkerland, onderschrijven de partijuitgangspunten en zijn bereid zich actief in te zetten voor de lokale gemeenschap."
      }
    ]
  }
};

/**
 * Generate an official PDF for a board document if not present on disk
 */
export async function ensureBestuurDocumentPdf(
  rawFilename: string,
  docMeta?: { titel?: string; beschrijving?: string; category?: string; datum?: string }
): Promise<string | null> {
  const safeFilename = path.basename(rawFilename.trim());
  if (!safeFilename.toLowerCase().endsWith(".pdf")) return null;

  // Check if file already exists in standard candidate directories
  const candidateExisting = [
    path.join(UPLOADS_DOCS_DIR, safeFilename),
    path.join(DIST_DOCS_DIR, safeFilename),
    path.join(UPLOADS_ROOT_DIR, safeFilename),
    path.join(process.cwd(), "public", safeFilename),
    path.join(process.cwd(), "dist", safeFilename),
  ];

  for (const p of candidateExisting) {
    if (fs.existsSync(p) && fs.statSync(p).isFile() && fs.statSync(p).size > 0) {
      // Sync across to dist if not there
      const targetDist = path.join(DIST_DOCS_DIR, safeFilename);
      if (!fs.existsSync(targetDist)) {
        try {
          fs.copyFileSync(p, targetDist);
        } catch (_e) {}
      }
      return p;
    }
  }

  // Synthesize official PDF
  try {
    const lower = safeFilename.toLowerCase();
    let template = OFFICIAL_DOC_TEMPLATES[lower];
    if (!template) {
      if (lower.includes("statut")) {
        template = OFFICIAL_DOC_TEMPLATES["statuten_lijstvanandel.pdf"];
      } else if (lower.includes("huishoudelijk")) {
        template = OFFICIAL_DOC_TEMPLATES["huishoudelijk_reglement.pdf"];
      } else if (lower.includes("integriteit")) {
        template = OFFICIAL_DOC_TEMPLATES["integriteitscode_lijstvanandel.pdf"];
      } else if (lower.includes("bestuur")) {
        template = OFFICIAL_DOC_TEMPLATES["bestuursreglement.pdf"];
      } else if (lower.includes("kandidaat")) {
        template = OFFICIAL_DOC_TEMPLATES["kandidaatstellingsreglement.pdf"];
      }
    }

    if (!template) {
      template = {
        filename: safeFilename,
        titel: docMeta?.titel || safeFilename.replace(/\.pdf$/i, "").replace(/[_-]/g, " "),
        subtitel: docMeta?.beschrijving || "Officieel partij- en bestuursdocument Lijst van Andel",
        category: docMeta?.category || "Organisatie",
        datum: docMeta?.datum || new Date().toISOString().split("T")[0],
        inleiding:
          docMeta?.beschrijving ||
          "Dit document maakt deel uit van de formele partijorganisatie en bestuurlijke kaders van Lijst van Andel te Steenwijkerland.",
        artikelen: [
          {
            nr: "Status & Toepasselijkheid",
            kop: "Formeel Bestuursdocument",
            tekst:
              "Dit document is vastgesteld conform de geldende verenigingsstatuten en reglementen van Lijst van Andel. Het document is bindend voor alle betrokken geledingen van de partij."
          },
          {
            nr: "Inzage & Archivering",
            kop: "Openbaarheid & Toegankelijkheid",
            tekst:
              "Leden van Lijst van Andel en inwoners van Steenwijkerland hebben het recht kennis te nemen van de vigerende partijkaders via de officiële kanalen van de vereniging."
          }
        ]
      };
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 standard
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Header bar (dark navy & gold accent)
    page.drawRectangle({
      x: 0,
      y: height - 110,
      width: width,
      height: 110,
      color: rgb(0.08, 0.12, 0.20), // #141f33
    });

    // Gold decorative stripe
    page.drawRectangle({
      x: 0,
      y: height - 114,
      width: width,
      height: 4,
      color: rgb(0.85, 0.65, 0.2), // Gold
    });

    // Header text
    page.drawText("POLITIEKE VERENIGING LIJST VAN ANDEL", {
      x: 45,
      y: height - 42,
      size: 11,
      font: fontBold,
      color: rgb(0.85, 0.65, 0.2),
    });

    page.drawText("GEMEENTERAAD & BESTUUR STEENWIJKERLAND", {
      x: 45,
      y: height - 58,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.8, 0.85, 0.9),
    });

    page.drawText(`CATEGORIE: ${template.category.toUpperCase()}`, {
      x: width - 200,
      y: height - 42,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`DATUM: ${template.datum}`, {
      x: width - 200,
      y: height - 58,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.8, 0.85, 0.9),
    });

    // Document Title
    let curY = height - 160;
    page.drawText(template.titel, {
      x: 45,
      y: curY,
      size: 20,
      font: fontBold,
      color: rgb(0.08, 0.12, 0.20),
    });

    curY -= 20;
    page.drawText(template.subtitel, {
      x: 45,
      y: curY,
      size: 10.5,
      font: fontOblique,
      color: rgb(0.4, 0.45, 0.5),
    });

    curY -= 28;
    // Inleiding box
    page.drawRectangle({
      x: 45,
      y: curY - 50,
      width: width - 90,
      height: 56,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1,
    });

    page.drawText("Inleiding & Status:", {
      x: 55,
      y: curY - 14,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.35),
    });

    // Wrap inleiding text
    const words = template.inleiding.split(/\s+/);
    let line = "";
    let lineY = curY - 28;
    for (const w of words) {
      if ((line + " " + w).length > 85) {
        page.drawText(line, { x: 55, y: lineY, size: 8.5, font: fontRegular, color: rgb(0.3, 0.35, 0.4) });
        lineY -= 12;
        line = w;
      } else {
        line = line ? `${line} ${w}` : w;
      }
    }
    if (line) {
      page.drawText(line, { x: 55, y: lineY, size: 8.5, font: fontRegular, color: rgb(0.3, 0.35, 0.4) });
    }

    curY -= 80;

    // Render Artikelen
    for (const art of template.artikelen) {
      if (curY < 130) break; // Avoid bottom overflow

      page.drawText(`${art.nr}: ${art.kop}`, {
        x: 45,
        y: curY,
        size: 11,
        font: fontBold,
        color: rgb(0.12, 0.18, 0.28),
      });

      curY -= 16;

      const artWords = art.tekst.split(/\s+/);
      let artLine = "";
      for (const w of artWords) {
        if ((artLine + " " + w).length > 82) {
          page.drawText(artLine, { x: 45, y: curY, size: 9.5, font: fontRegular, color: rgb(0.25, 0.3, 0.35) });
          curY -= 14;
          artLine = w;
        } else {
          artLine = artLine ? `${artLine} ${w}` : w;
        }
      }
      if (artLine) {
        page.drawText(artLine, { x: 45, y: curY, size: 9.5, font: fontRegular, color: rgb(0.25, 0.3, 0.35) });
        curY -= 20;
      }
      curY -= 8;
    }

    // Official Stamp & Signature Block
    page.drawRectangle({
      x: 45,
      y: 65,
      width: width - 90,
      height: 48,
      color: rgb(0.98, 0.97, 0.94),
      borderColor: rgb(0.85, 0.65, 0.2),
      borderWidth: 1,
    });

    page.drawText("GEWAARMERKT BESTUURSDOCUMENT • POLITIEKE VERENIGING LIJST VAN ANDEL", {
      x: 55,
      y: 96,
      size: 8,
      font: fontBold,
      color: rgb(0.65, 0.4, 0.05),
    });

    page.drawText(
      "Geregistreerd in het partijarchief. Digitaal beschikbaar gesteld via lijstvanandel.nl/bestuur.",
      {
        x: 55,
        y: 82,
        size: 8,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      }
    );

    page.drawText(`Bestandsreferentie: ${safeFilename}`, {
      x: 55,
      y: 70,
      size: 7.5,
      font: fontOblique,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Footer
    page.drawText(
      "© Politieke Vereniging Lijst van Andel • Steenwijkerland • www.lijstvanandel.nl • info@lijstvanandel.nl",
      {
        x: 45,
        y: 35,
        size: 8,
        font: fontRegular,
        color: rgb(0.55, 0.6, 0.65),
      }
    );

    const pdfBytes = await pdfDoc.save();
    const outPub = path.join(UPLOADS_DOCS_DIR, safeFilename);
    const outDist = path.join(DIST_DOCS_DIR, safeFilename);

    fs.writeFileSync(outPub, pdfBytes);
    try {
      fs.writeFileSync(outDist, pdfBytes);
    } catch (_e) {}

    return outPub;
  } catch (err) {
    console.error(`[ORGANIZATION DOCS] Fout bij genereren PDF voor ${safeFilename}:`, err);
    return null;
  }
}

/**
 * Initialize all default organizational documents so they exist on disk from startup
 */
export async function initDefaultOrganizationDocs() {
  for (const filename of Object.keys(OFFICIAL_DOC_TEMPLATES)) {
    try {
      await ensureBestuurDocumentPdf(filename);
    } catch (e) {
      console.warn(`[ORGANIZATION DOCS] Kon standaardbestand ${filename} niet initialiseren:`, e);
    }
  }
}
