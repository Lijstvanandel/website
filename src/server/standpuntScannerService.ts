import { GoogleGenAI } from "@google/genai";
import {
  CouncilAgendaTopic,
  CouncilDocument,
  MatchedStandpunt,
  DocumentMatchedStandpunt,
  TopicStandpuntSummary,
  StandpuntStance,
} from "../types/council.js";
import { hoofdstukken, Hoofdstuk, Standpunt } from "../data/partijprogramma.js";
import { getCouncilDocumentContent } from "./documentTextExtractor.js";
import { getDbFromSqlite, saveDbToSqlite, persistSqlite } from "./sqliteDatabase.js";
import { matchStandpuntenForTopic } from "../lib/standpuntMatcher.js";

// Lazy Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

/**
 * Compact representation of the 10 chapters and their standpoints for prompt context
 */
function getProgrammaContext(): string {
  const lines: string[] = [];
  for (const h of hoofdstukken) {
    lines.push(`\n### HOOFDSTUK ${h.nr}: ${h.titel.toUpperCase()}`);
    for (const s of h.standpunten) {
      lines.push(`- H${h.nr}.${s.nr}: "${s.titel}" -> ${s.standpunt}`);
    }
  }
  return lines.join("\n");
}

/**
 * Deeply scan the documents (stukken) belonging to a council topic
 * and match ALL relevant party standpoints (multiple standpoints allowed and encouraged)
 * using the Gemini API (model: gemini-3.8-flash).
 */
export async function scanTopicDocumentsAndMatchStandpunten(
  topic: CouncilAgendaTopic,
  dbInstance?: any
): Promise<{
  success: boolean;
  topic: CouncilAgendaTopic;
  matchedStandpunten: MatchedStandpunt[];
  summary: TopicStandpuntSummary;
  message: string;
}> {
  console.log(`[STANDPUNT SCANNER] Start scannen van stukken voor agendapunt: "${topic.title}" (ID: ${topic.id})`);

  // Step 1: Scan and extract text from attached documents (stukken)
  const docContents: { doc: CouncilDocument; textExcerpt: string }[] = [];
  const documents = topic.documents || [];

  for (const doc of documents) {
    try {
      const fullText = await getCouncilDocumentContent(doc);
      if (fullText && fullText.trim().length > 0) {
        // Take up to 4,000 characters of meaningful content per document
        const cleaned = fullText.replace(/\s+/g, " ").trim();
        const excerpt = cleaned.length > 4000 ? cleaned.slice(0, 4000) + "... [vervolg weggelaten]" : cleaned;
        docContents.push({ doc, textExcerpt: excerpt });
      } else {
        docContents.push({
          doc,
          textExcerpt: `[Geen directe tekst beschikbaar; documenttitel: ${doc.title}]`,
        });
      }
    } catch (docErr: any) {
      console.warn(`[STANDPUNT SCANNER] Kon tekst niet extraheren voor ${doc.title}:`, docErr?.message || docErr);
      docContents.push({
        doc,
        textExcerpt: `[Documenttitel: ${doc.title}]`,
      });
    }
  }

  const ai = getGemini();
  let aiMatched: MatchedStandpunt[] | null = null;
  let aiSummary: TopicStandpuntSummary | null = null;

  if (ai) {
    try {
      const docsFormatted = docContents
        .map(
          (d, idx) =>
            `--- DOCUMENT ${idx + 1}: "${d.doc.title}" (Bestandstype: ${d.doc.fileType || "PDF"}) ---\n${d.textExcerpt}\n`
        )
        .join("\n");

      const prompt = `Je bent de politiek strateeg en fractiespecialist van 'Lijst van Andel', een lokale politieke partij in de gemeenteraad van Steenwijkerland.

OPDRACHT:
Scan het onderstaande gemeenteraadsonderwerp en ALLE bijbehorende officiële raadsstukken en bijlagen grondig door. Koppel op basis van de inhoud van de stukken de relevante standpunten uit het verkiezingsprogramma van Lijst van Andel.

CRUCIALE DIRECTIEVEN:
1. MEERDERE STANDPUNTEN VEREIST: Beperk je NOOIT tot slechts 1 standpunt als het voorstel meerdere aspecten raakt! In de praktijk raken raadsvoorstellen vaak aan 2 tot 5 verschillende standpunten (bijvoorbeeld: Wonen/Bouwen én Lokale Autonomie/Democratie én Financiën/OZB én Participatie van omwonenden én Behoud van Groen/Natuur/Erfgoed). Koppel ALLE standpunten die inhoudelijk van toepassing zijn.
2. BRONVERMELDING & CITATEN: Verwijs expliciet naar welk(e) document(en) relevant zijn en neem een concrete passage of feit ('citedPassage') op uit de gescande stukken die dit standpunt onderbouwt.
3. BEPAAL DE FRACTIESTELLINGNAME ('stance'):
   - "positief": Lijst van Andel steunt dit (onderdeel van het) voorstel omdat het overeenkomt met ons partijprogramma.
   - "negatief": Lijst van Andel is kritisch, bezorgd of tegen omdat het botst met onze partijprincipes (bijv. Haagse dwang, megawindturbines, zonnepark op landbouwgrond, lastenverhoging, voorrang statushouders, negeren dorpsparticipatie).
   - "genuanceerd": Voorwaardelijk, gemengd beeld, amendement of motie noodzakelijk.
4. GEEN GENERIEKE RECHTE LIJNEN: Geef per standpunt een scherpe, partijspecifieke uitleg ('explanation') waarin direct wordt verwezen naar de inhoud van de stukken.

GEGEVENS AGENDAPUNT:
- Titel: "${topic.title}"
- Categorie: "${topic.category || "Algemeen"}"
- Vergadering: "${topic.meetingTitle || "Gemeenteraad Steenwijkerland"}" (${topic.meetingDateDisplay || topic.meetingDate})
- Toelichting: "${topic.description || "Geen nadere toelichting verstrekt."}"
- Aantal bijbehorende documenten: ${documents.length}

GESCANDE VERGADERSTUKKEN EN BIJLAGEN:
${docsFormatted.length > 0 ? docsFormatted : "(Geen documenttekst beschikbaar, beoordeel op basis van titel en context)"}

OFFICIEEL VERKIEZINGSPROGRAMMA LIJST VAN ANDEL (10 HOOFDSTUKKEN):
${getProgrammaContext()}

ANTWOORD UITSLUITEND IN DIT VALIDE JSON FORMAAT (GEEN MARKDOWN BACKTICKS OF UITLEG):
{
  "primaryStance": "positief" | "negatief" | "gemengd" | "neutraal",
  "summaryText": "Beknopte samenvatting (2-3 zinnen) van de politieke fractielijn voor dit raadsvoorstel.",
  "standpunten": [
    {
      "hoofdstukNr": 1-10,
      "standpuntNr": 1-20,
      "standpuntTitel": "Exacte titel van het standpunt",
      "stance": "positief" | "negatief" | "genuanceerd",
      "explanation": "Waarom Lijst van Andel deze positie inneemt op basis van de gescande stukken.",
      "relevanceScore": 65-100,
      "sourceDocumentTitles": ["Exacte titel van het document waarin dit naar voren komt"],
      "citedPassage": "Letterlijk citaat of feitelijke passage uit de gescande stukken",
      "matchedKeywords": ["zoekterm1", "zoekterm2"]
    }
  ]
}`;

      console.log(`[STANDPUNT SCANNER] Verzenden prompt naar Gemini 3.8 Flash...`);
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          temperature: 0.15,
          responseMimeType: "application/json",
        },
      });

      const raw = response.text?.trim() || "";
      const cleanJson = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

      if (cleanJson) {
        const parsed = JSON.parse(cleanJson);
        if (parsed && Array.isArray(parsed.standpunten) && parsed.standpunten.length > 0) {
          aiMatched = parsed.standpunten.map((sp: any, idx: number) => {
            const h = hoofdstukken.find((ch: Hoofdstuk) => ch.nr === Number(sp.hoofdstukNr));
            const st = h?.standpunten.find((stItem: Standpunt) => stItem.nr === Number(sp.standpuntNr));

            return {
              id: `${topic.id}_ai_h${sp.hoofdstukNr}_s${sp.standpuntNr}_${idx}`,
              hoofdstukNr: Number(sp.hoofdstukNr),
              hoofdstukTitel: h ? h.titel : `Hoofdstuk ${sp.hoofdstukNr}`,
              standpuntNr: Number(sp.standpuntNr),
              standpuntTitel: st ? st.titel : sp.standpuntTitel || `Standpunt ${sp.standpuntNr}`,
              standpuntText: st ? st.standpunt : "",
              stance: (sp.stance === "positief" || sp.stance === "negatief" || sp.stance === "genuanceerd"
                ? sp.stance
                : "genuanceerd") as StandpuntStance,
              explanation: sp.explanation || "",
              relevanceScore: Number(sp.relevanceScore) || 85,
              sourceDocumentTitles: Array.isArray(sp.sourceDocumentTitles) ? sp.sourceDocumentTitles : [],
              citedPassage: sp.citedPassage || undefined,
              matchedKeywords: Array.isArray(sp.matchedKeywords) ? sp.matchedKeywords : ["Gescand uit stukken"],
              manuallyAdjusted: false,
              adjustedBy: "Gemini 3.8 Flash (Document Scan)",
              adjustedAt: new Date().toISOString(),
            };
          });

          const posCount = aiMatched.filter((m) => m.stance === "positief").length;
          const negCount = aiMatched.filter((m) => m.stance === "negatief").length;
          const genCount = aiMatched.filter((m) => m.stance === "genuanceerd").length;

          let stance: "positief" | "negatief" | "gemengd" | "neutraal" = parsed.primaryStance || "positief";
          if (!parsed.primaryStance) {
            if (negCount > 0 && posCount === 0) stance = "negatief";
            else if (posCount > 0 && negCount === 0) stance = "positief";
            else if (posCount > 0 && negCount > 0) stance = "gemengd";
          }

          aiSummary = {
            total: aiMatched.length,
            positiefCount: posCount,
            negatiefCount: negCount,
            genuanceerdCount: genCount,
            primaryStance: stance,
            summaryText:
              parsed.summaryText ||
              `Lijst van Andel heeft ${aiMatched.length} relevante partijstandpunten gekoppeld na het doorscannen van de raadsstukken.`,
            keyArguments: aiMatched.map((m) => m.explanation),
          };

          console.log(
            `[STANDPUNT SCANNER] AI analyse geslaagd: ${aiMatched.length} standpunten gekoppeld (${posCount} pos, ${negCount} neg, ${genCount} gen)`
          );
        }
      }
    } catch (aiErr: any) {
      console.warn("[STANDPUNT SCANNER] Fout tijdens Gemini AI document scan:", aiErr?.message || aiErr);
    }
  }

  // Step 2: Combine with preserved manual edits or fallback
  let finalMatched: MatchedStandpunt[] = [];
  const manualEdits = (topic.matchedStandpunten || []).filter((m) => m.manuallyAdjusted && m.adjustedBy !== "Gemini 3.8 Flash (Document Scan)");

  if (aiMatched && aiMatched.length > 0) {
    finalMatched = [...manualEdits];
    for (const am of aiMatched) {
      if (!finalMatched.some((m) => m.hoofdstukNr === am.hoofdstukNr && m.standpuntNr === am.standpuntNr)) {
        finalMatched.push(am);
      }
    }
  } else {
    // Deterministic fallback matching
    const baseline = matchStandpuntenForTopic(topic);
    finalMatched = [...manualEdits];
    for (const bm of baseline.matched) {
      if (!finalMatched.some((m) => m.hoofdstukNr === bm.hoofdstukNr && m.standpuntNr === bm.standpuntNr)) {
        finalMatched.push(bm);
      }
    }
  }

  // Step 3: Compute final counts & summary
  const positiefCount = finalMatched.filter((m) => m.stance === "positief").length;
  const negatiefCount = finalMatched.filter((m) => m.stance === "negatief").length;
  const genuanceerdCount = finalMatched.filter((m) => m.stance === "genuanceerd").length;

  let primaryStance: "positief" | "negatief" | "gemengd" | "neutraal" = "neutraal";
  let summaryText = "Geen directe partijstandpunten gekoppeld.";

  if (finalMatched.length > 0) {
    if (negatiefCount > 0 && positiefCount === 0) {
      primaryStance = "negatief";
      summaryText = `Lijst van Andel staat KRITISCH / NEGATIEF t.a.v. dit onderwerp (${negatiefCount} ${negatiefCount === 1 ? "standpunt" : "standpunten"}).`;
    } else if (positiefCount > 0 && negatiefCount === 0) {
      primaryStance = "positief";
      summaryText = `Lijst van Andel staat POSITIEF / VOOR t.a.v. dit onderwerp (${positiefCount} ${positiefCount === 1 ? "standpunt" : "standpunten"}).`;
    } else if (positiefCount > 0 && negatiefCount > 0) {
      primaryStance = "gemengd";
      summaryText = `Gemengde stellingname: ${positiefCount} positief, ${negatiefCount} kritisch/negatief.`;
    } else {
      primaryStance = "genuanceerd" as any;
      summaryText = `Genuanceerde fractiepositie met specifieke lokale randvoorwaarden.`;
    }
    if (aiSummary?.summaryText) {
      summaryText = aiSummary.summaryText;
    }
  }

  const finalSummary: TopicStandpuntSummary = {
    total: finalMatched.length,
    positiefCount,
    negatiefCount,
    genuanceerdCount,
    primaryStance,
    summaryText,
    keyArguments: finalMatched.map((m) => m.explanation),
  };

  // Step 4: Map standpoints to individual documents (doc.matchedStandpunten)
  const enrichedDocuments: CouncilDocument[] = (topic.documents || []).map((doc) => {
    const docTitleLower = (doc.title || "").toLowerCase();
    const docStandpunten: DocumentMatchedStandpunt[] = [];

    for (const fm of finalMatched) {
      const isExplicitSource =
        fm.sourceDocumentTitles &&
        fm.sourceDocumentTitles.some(
          (st) =>
            docTitleLower.includes(st.toLowerCase()) ||
            st.toLowerCase().includes(docTitleLower) ||
            docTitleLower.includes(st.toLowerCase().slice(0, 20))
        );

      const hasKeywords = fm.matchedKeywords.some((kw) => docTitleLower.includes(kw.toLowerCase()));

      if (isExplicitSource || hasKeywords) {
        docStandpunten.push({
          hoofdstukNr: fm.hoofdstukNr,
          standpuntNr: fm.standpuntNr,
          standpuntTitel: fm.standpuntTitel,
          stance: fm.stance,
          matchedReason: fm.explanation,
          citedPassage: fm.citedPassage,
        });
      }
    }

    // If no document-specific match was filtered, but topic has standpoints and doc is main proposal
    if (docStandpunten.length === 0 && (docTitleLower.includes("raadsvoorstel") || docTitleLower.includes("adviesnota"))) {
      for (const fm of finalMatched.slice(0, 3)) {
        docStandpunten.push({
          hoofdstukNr: fm.hoofdstukNr,
          standpuntNr: fm.standpuntNr,
          standpuntTitel: fm.standpuntTitel,
          stance: fm.stance,
          matchedReason: fm.explanation,
          citedPassage: fm.citedPassage,
        });
      }
    }

    return {
      ...doc,
      matchedStandpunten: docStandpunten.length > 0 ? docStandpunten : undefined,
    };
  });

  // Step 5: Update topic
  topic.matchedStandpunten = finalMatched;
  topic.standpuntSummary = finalSummary;
  topic.documents = enrichedDocuments;

  // Step 6: Save to SQLite database
  const db = dbInstance || getDbFromSqlite();
  if (db && Array.isArray(db.councilAgendaTopics)) {
    const idx = db.councilAgendaTopics.findIndex((t: CouncilAgendaTopic) => t.id === topic.id);
    if (idx >= 0) {
      db.councilAgendaTopics[idx] = topic;
      saveDbToSqlite(db);
      try {
        persistSqlite();
      } catch (_e) {
        // ignore
      }
    }
  }

  return {
    success: true,
    topic,
    matchedStandpunten: finalMatched,
    summary: finalSummary,
    message: `Stukken succesvol doorgescand: ${finalMatched.length} partijstandpunt(en) gekoppeld.`,
  };
}
