import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { WrittenQuestionDossier } from "@/types/questionWizard";
import { FRAMING_DEFINITIONS } from "./questionWizardLogic";

/**
 * Formatteert de schriftelijke vragen als formele platte tekst voor griffie-mail of klembord.
 */
export function formatQuestionDossierAsPlainText(dossier: WrittenQuestionDossier, signerName: string = "Fractie Lijst van Andel"): string {
  const framingInfo = dossier.framing ? FRAMING_DEFINITIONS[dossier.framing] : null;
  const dateStr = new Date(dossier.updatedAt || dossier.createdAt || Date.now()).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const year = new Date().getFullYear();
  const kenmerk = `LVA-SV-${year}-${(dossier.id || "001").slice(0, 6).toUpperCase()}`;

  const lines: string[] = [];

  lines.push("FRACTIE LIJST VAN ANDEL — GEMEENTERAAD STEENWIJKERLAND");
  lines.push("Postbus 162, 8330 AD Steenwijk | griffie@steenwijkerland.nl");
  lines.push("------------------------------------------------------------");
  lines.push(`Kenmerk:   ${kenmerk}`);
  lines.push(`Datum:     ${dateStr}`);
  lines.push(`Aan:       Het College van Burgemeester en Wethouders van Steenwijkerland`);
  lines.push(`Onderwerp: Schriftelijke vragen ex art. 41 Reglement van Orde inzake "${dossier.title || "Schriftelijke vragen"}"`);
  if (framingInfo) {
    lines.push(`Aanvalshoek: ${framingInfo.title} (${framingInfo.legalBasis})`);
  }
  if (dossier.journalistPitch?.trim()) {
    lines.push(`Kernboodschap / Pitch: ${dossier.journalistPitch.trim()}`);
  }
  lines.push("------------------------------------------------------------");
  lines.push("");
  lines.push("CONSIDERANS");
  lines.push("");
  lines.push(dossier.considerans || "Overwegende de actuele feiten en omstandigheden;");
  lines.push("");
  lines.push("SCHRIFTELIJKE VRAGEN");
  lines.push("");

  if (dossier.questions && dossier.questions.length > 0) {
    dossier.questions.forEach((q, idx) => {
      lines.push(`${idx + 1}. ${q.text.trim()}`);
      lines.push("");
    });
  } else {
    lines.push("1. [Nog geen vragen geformuleerd]");
    lines.push("");
  }

  lines.push("BRONNEN & BEWIJSLAST");
  if (dossier.sources && dossier.sources.length > 0) {
    dossier.sources.forEach((s, idx) => {
      lines.push(`[${idx + 1}] ${s.title} — ${s.reference || "Geen kenmerk"}`);
    });
  } else {
    lines.push("Geen externe bronnen gekoppeld.");
  }

  if (dossier.promisedQuote?.trim()) {
    lines.push(`\nOorspronkelijke toezegging: "${dossier.promisedQuote.trim()}"`);
  }
  if (dossier.contradictingReality?.trim()) {
    lines.push(`Tegenstrijdige realiteit: "${dossier.contradictingReality.trim()}"`);
  }

  lines.push("");
  lines.push("Hoogachtend,");
  lines.push("");
  lines.push(signerName);
  lines.push("Fractie Lijst van Andel Steenwijkerland");

  return lines.join("\n");
}

/**
 * Genereert een officieel Microsoft Word (.docx) document in de huisstijl van Lijst van Andel.
 */
export async function generateQuestionDossierDocx(dossier: WrittenQuestionDossier, signerName: string = "Fractie Lijst van Andel"): Promise<Blob> {
  const framingInfo = dossier.framing ? FRAMING_DEFINITIONS[dossier.framing] : null;
  const dateStr = new Date(dossier.updatedAt || dossier.createdAt || Date.now()).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const year = new Date().getFullYear();
  const kenmerk = `LVA-SV-${year}-${(dossier.id || "001").slice(0, 6).toUpperCase()}`;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch = 1440 twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          // Header
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "FRACTIE LIJST VAN ANDEL",
                bold: true,
                size: 28,
                color: "1B2A4A", // Navy
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "Gemeenteraad Steenwijkerland • Lokaal & Onafhankelijk",
                italics: true,
                size: 18,
                color: "666666",
              }),
            ],
          }),
          new Paragraph({
            text: "",
            spacing: { after: 300 },
          }),

          // Meta Table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    },
                    children: [new Paragraph({ children: [new TextRun({ text: "Aan:", bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    width: { size: 75, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    },
                    children: [new Paragraph({ children: [new TextRun({ text: "Het College van Burgemeester en Wethouders van Steenwijkerland", size: 20 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    },
                    children: [new Paragraph({ children: [new TextRun({ text: "Datum:", bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    },
                    children: [new Paragraph({ children: [new TextRun({ text: dateStr, size: 20 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    },
                    children: [new Paragraph({ children: [new TextRun({ text: "Kenmerk:", bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    },
                    children: [new Paragraph({ children: [new TextRun({ text: kenmerk, size: 20 })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    },
                    children: [new Paragraph({ children: [new TextRun({ text: "Onderwerp:", bold: true, size: 20 })] })],
                  }),
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    },
                    children: [new Paragraph({ children: [new TextRun({ text: `Schriftelijke vragen ex art. 41 RvO inzake ${dossier.title || "beleid"}`, bold: true, size: 20 })] })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({
            text: "",
            spacing: { after: 300 },
          }),

          // Main Heading
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 150 },
            children: [
              new TextRun({
                text: "SCHRIFTELIJKE VRAGEN",
                bold: true,
                size: 26,
                color: "1B2A4A",
              }),
            ],
          }),

          // Framing banner if selected
          ...(framingInfo
            ? [
                new Paragraph({
                  spacing: { after: 150 },
                  children: [
                    new TextRun({
                      text: `Aanvalshoek: ${framingInfo.title} (${framingInfo.legalBasis})`,
                      bold: true,
                      color: "D4AF37",
                      size: 20,
                    }),
                  ],
                }),
              ]
            : []),

          // Journalist pitch
          ...(dossier.journalistPitch?.trim()
            ? [
                new Paragraph({
                  spacing: { after: 250 },
                  children: [
                    new TextRun({ text: "Kern van het probleem: ", bold: true, size: 20 }),
                    new TextRun({ text: dossier.journalistPitch.trim(), italics: true, size: 20 }),
                  ],
                }),
              ]
            : []),

          // Considerans
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: "Considerans",
                bold: true,
                size: 22,
                color: "1B2A4A",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 250 },
            children: [
              new TextRun({
                text: dossier.considerans || "Overwegende de actuele feiten en omstandigheden;",
                size: 20,
              }),
            ],
          }),

          // Questions
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: "Vragen aan het College",
                bold: true,
                size: 22,
                color: "1B2A4A",
              }),
            ],
          }),
          ...(dossier.questions && dossier.questions.length > 0
            ? dossier.questions.map(
                (q, idx) =>
                  new Paragraph({
                    spacing: { after: 120 },
                    children: [
                      new TextRun({
                        text: `${idx + 1}. `,
                        bold: true,
                        size: 20,
                        color: "1B2A4A",
                      }),
                      new TextRun({
                        text: q.text.trim(),
                        size: 20,
                      }),
                    ],
                  })
              )
            : [
                new Paragraph({
                  children: [new TextRun({ text: "1. [Nog geen vragen geformuleerd]", size: 20 })],
                }),
              ]),

          // Sources
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: "Onderliggende Bronnen & Bewijslast",
                bold: true,
                size: 22,
                color: "1B2A4A",
              }),
            ],
          }),
          ...(dossier.sources && dossier.sources.length > 0
            ? dossier.sources.map(
                (s, idx) =>
                  new Paragraph({
                    spacing: { after: 80 },
                    children: [
                      new TextRun({ text: `[${idx + 1}] `, bold: true, size: 18 }),
                      new TextRun({ text: `${s.title}: `, size: 18 }),
                      new TextRun({ text: s.reference || "Geraadpleegd", italics: true, size: 18 }),
                    ],
                  })
              )
            : [
                new Paragraph({
                  children: [new TextRun({ text: "Geen bronnen opgegeven.", size: 18, italics: true })],
                }),
              ]),

          // Sign-off
          new Paragraph({
            spacing: { before: 400, after: 100 },
            children: [new TextRun({ text: "Hoogachtend,", size: 20 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: signerName, bold: true, size: 20 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "Fractie Lijst van Andel Steenwijkerland", size: 18, color: "666666" })],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Genereert een strakke officiële PDF met de huisstijl van Lijst van Andel.
 */
export async function generateQuestionDossierPdf(dossier: WrittenQuestionDossier, signerName: string = "Fractie Lijst van Andel"): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4 in points
  const { width, height } = page.getSize();
  const margin = 45;
  const contentWidth = width - margin * 2;
  let cursorY = height - margin;

  const navy = rgb(0.106, 0.165, 0.29); // #1B2A4A
  const gold = rgb(0.831, 0.686, 0.216); // #D4AF37
  const gray = rgb(0.4, 0.4, 0.4);
  const black = rgb(0.1, 0.1, 0.1);

  // Helper to ensure enough page space
  const ensureSpace = (neededHeight: number) => {
    if (cursorY - neededHeight < margin + 40) {
      // Add footer on current page before moving
      page.drawText("Fractie Lijst van Andel • Schriftelijke Vragen (Art. 41 RvO)", {
        x: margin,
        y: margin - 15,
        size: 8,
        font: helvetica,
        color: gray,
      });

      page = pdfDoc.addPage([595.28, 841.89]);
      cursorY = height - margin;
    }
  };

  // Helper for word wrapped text
  const drawWrappedText = (text: string, font: any, size: number, color: any, lineHeight = 13, indent = 0) => {
    const words = text.split(/\s+/);
    let line = "";
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, size);
      if (testWidth > contentWidth - indent && line) {
        ensureSpace(lineHeight);
        page.drawText(line, {
          x: margin + indent,
          y: cursorY,
          size,
          font,
          color,
        });
        cursorY -= lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ensureSpace(lineHeight);
      page.drawText(line, {
        x: margin + indent,
        y: cursorY,
        size,
        font,
        color,
      });
      cursorY -= lineHeight;
    }
  };

  // 1. Top Decorative Bar
  page.drawRectangle({
    x: 0,
    y: height - 8,
    width,
    height: 8,
    color: navy,
  });
  page.drawRectangle({
    x: 0,
    y: height - 12,
    width,
    height: 4,
    color: gold,
  });

  cursorY -= 20;

  // Header Title
  page.drawText("LIJST VAN ANDEL", {
    x: margin,
    y: cursorY,
    size: 18,
    font: helveticaBold,
    color: navy,
  });

  page.drawText("GEMEENTERAAD STEENWIJKERLAND", {
    x: width - margin - helveticaBold.widthOfTextAtSize("GEMEENTERAAD STEENWIJKERLAND", 9),
    y: cursorY + 4,
    size: 9,
    font: helveticaBold,
    color: gold,
  });

  cursorY -= 14;

  page.drawText("Fractie Steenwijkerland • Lokaal & Onafhankelijk", {
    x: margin,
    y: cursorY,
    size: 9,
    font: helveticaOblique,
    color: gray,
  });

  cursorY -= 18;

  // Divider line
  page.drawLine({
    start: { x: margin, y: cursorY },
    end: { x: width - margin, y: cursorY },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });

  cursorY -= 18;

  // Metadata block
  const year = new Date().getFullYear();
  const kenmerk = `LVA-SV-${year}-${(dossier.id || "001").slice(0, 6).toUpperCase()}`;
  const dateStr = new Date(dossier.updatedAt || dossier.createdAt || Date.now()).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const metaRows = [
    ["Aan:", "Het College van Burgemeester en Wethouders van Steenwijkerland"],
    ["Datum:", dateStr],
    ["Kenmerk:", kenmerk],
    ["Betreft:", `Schriftelijke vragen ex art. 41 RvO: ${dossier.title || "Geen titel"}`],
  ];

  metaRows.forEach(([lbl, val]) => {
    ensureSpace(14);
    page.drawText(lbl, { x: margin, y: cursorY, size: 9, font: helveticaBold, color: navy });
    drawWrappedText(val, helvetica, 9, black, 12, 70);
  });

  cursorY -= 10;

  // Framing & Pitch Box
  if (dossier.framing) {
    const framingInfo = FRAMING_DEFINITIONS[dossier.framing];
    ensureSpace(35);
    page.drawRectangle({
      x: margin,
      y: cursorY - 26,
      width: contentWidth,
      height: 30,
      color: rgb(0.97, 0.95, 0.90), // soft warm gold bg
      borderColor: gold,
      borderWidth: 0.8,
    });
    page.drawText(`AANVALSHOEK: ${framingInfo.title.toUpperCase()}`, {
      x: margin + 8,
      y: cursorY - 10,
      size: 9,
      font: helveticaBold,
      color: navy,
    });
    page.drawText(framingInfo.legalBasis, {
      x: margin + 8,
      y: cursorY - 22,
      size: 8,
      font: helvetica,
      color: gray,
    });
    cursorY -= 36;
  }

  if (dossier.journalistPitch?.trim()) {
    ensureSpace(25);
    page.drawText("Kern van het probleem / Pitch:", { x: margin, y: cursorY, size: 9, font: helveticaBold, color: navy });
    cursorY -= 13;
    drawWrappedText(`"${dossier.journalistPitch.trim()}"`, helveticaOblique, 9, black, 13, 0);
    cursorY -= 8;
  }

  // Section: Considerans
  ensureSpace(24);
  page.drawText("Considerans", {
    x: margin,
    y: cursorY,
    size: 11,
    font: helveticaBold,
    color: navy,
  });
  cursorY -= 14;

  const consideransParagraphs = (dossier.considerans || "Overwegende de feiten en omstandigheden;")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  for (const p of consideransParagraphs) {
    drawWrappedText(p, helvetica, 9, black, 13, 0);
    cursorY -= 4;
  }

  cursorY -= 10;

  // Section: Schriftelijke Vragen
  ensureSpace(24);
  page.drawText("Schriftelijke Vragen", {
    x: margin,
    y: cursorY,
    size: 11,
    font: helveticaBold,
    color: navy,
  });
  cursorY -= 14;

  if (dossier.questions && dossier.questions.length > 0) {
    dossier.questions.forEach((q, idx) => {
      ensureSpace(20);
      page.drawText(`${idx + 1}.`, {
        x: margin,
        y: cursorY,
        size: 9,
        font: helveticaBold,
        color: navy,
      });
      drawWrappedText(q.text.trim(), helvetica, 9, black, 13, 16);
      cursorY -= 6;
    });
  } else {
    drawWrappedText("1. [Geen vragen ingevoerd]", helveticaOblique, 9, gray, 13, 0);
  }

  cursorY -= 10;

  // Section: Bronnen
  if (dossier.sources && dossier.sources.length > 0) {
    ensureSpace(24);
    page.drawText("Onderliggende Bronnen & Feitenrelaas", {
      x: margin,
      y: cursorY,
      size: 10,
      font: helveticaBold,
      color: navy,
    });
    cursorY -= 13;

    dossier.sources.forEach((s, idx) => {
      drawWrappedText(`[${idx + 1}] ${s.title} — ${s.reference || "Geraadpleegd"}`, helvetica, 8, gray, 11, 0);
      cursorY -= 2;
    });
  }

  cursorY -= 16;
  ensureSpace(40);
  page.drawText("Hoogachtend,", { x: margin, y: cursorY, size: 9, font: helvetica, color: black });
  cursorY -= 14;
  page.drawText(signerName, { x: margin, y: cursorY, size: 9, font: helveticaBold, color: navy });
  cursorY -= 12;
  page.drawText("Fractie Lijst van Andel Steenwijkerland", { x: margin, y: cursorY, size: 8, font: helvetica, color: gray });

  // Add footer to last page
  page.drawText("Fractie Lijst van Andel • Schriftelijke Vragen (Art. 41 RvO)", {
    x: margin,
    y: margin - 15,
    size: 8,
    font: helvetica,
    color: gray,
  });

  return await pdfDoc.save();
}
