import { GoogleGenAI } from "@google/genai";
import {
  CouncilAgendaTopic,
  CouncilDocument,
  MatchedStandpunt,
  DocumentMatchedStandpunt,
  TopicStandpuntSummary,
  StandpuntStance,
  OtherPartyStanceItem,
  OtherPartyStanceType,
} from "../types/council.js";
import { hoofdstukken, Hoofdstuk, Standpunt } from "../data/partijprogramma.js";
import { OTHER_PARTIES_MANIFESTOS, getOtherPartiesManifestoPromptContext } from "../data/otherPartiesPrograms.js";
import { getCouncilDocumentContent } from "./documentTextExtractor.js";
import { getDbFromSqlite, saveDbToSqlite, persistSqlite } from "./sqliteDatabase.js";
import {
  matchStandpuntenForTopic,
  matchOtherPartiesForTopic,
  matchOtherPartiesForDocument,
  getOtherPartyStanceLabel,
} from "../lib/standpuntMatcher.js";

// Lazy Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
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
 * as well as the 8 other council parties' stances based strictly on their 2026-2030 manifestos.
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
  let aiOtherParties: OtherPartyStanceItem[] | null = null;

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
1. Voer een INTEGRALE, ZEER KRITISCHE EN SECURE politieke analyse uit over het onderstaande raadsonderwerp en ALLE bijbehorende officiële raadsstukken en bijlagen. Koppel op basis van de inhoud van de stukken de relevante standpunten uit het verkiezingsprogramma van Lijst van Andel (10 hoofdstukken, 136 standpunten).
2. Analyseer daarnaast voor ELK van de 8 andere raadsfracties (BGL, CDA, D66, CPB, VVD, CU, STEM, PRO) hoe zij op basis van hun officiële verkiezingsprogramma 2026-2030 tegenover dit onderwerp staan. Gebruik UITSLUITEND de hieronder aangeleverde passages uit hun verkiezingsprogramma's (kies per partij het best passende 'matchedPassageId', of zet 'stance' op "geen_standpunt" als het programma van die partij niets specifieks over dit onderwerp zegt. Verzin NOOIT zelf citaten!).

CRUCIALE ANALYTISCHE DIRECTIEVEN:
1. MEERDERE STANDPUNTEN LIJST VAN ANDEL VEREIST (GEMIDDELD 3 TOT 7 PER VOORSTEL):
   - Beperk je NOOIT tot slechts 1 standpunt. Raadsvoorstellen hebben altijd meerdere dimensies en effecten.
   - Toets zowel op het DIRECTE hoofdonderwerp (bijv. Wonen, Verkeer, Zorg/WMO, Veiligheid, Natuur, Economie, Cultuur) als op KRUISVERBANDEN & RANDVOORWAARDEN.
2. BRONVERMELDING & FEITELIJKE CITATEN:
   - Verwijs expliciet naar welk(e) document(en) relevant zijn.
   - Geef een concrete, letterlijke passage of cijfer/feit ('citedPassage') uit de gescande stukken die aantoont waarom dit standpunt van toepassing is.
3. POSITIES VAN DE 8 ANDERE PARTIJEN ('otherParties'):
   - Geef voor alle 8 partijen ("BGL", "CDA", "D66", "CPB", "VVD", "CU", "STEM", "PRO") een object terug.
   - Als een passage uit het verkiezingsprogramma van die partij aansluit op dit agendapunt, geef dan het exacte 'matchedPassageId' op en kies 'stance' ("positief", "negatief" of "genuanceerd") met een feitelijke 'explanation'.
   - Als het verkiezingsprogramma van een partij géén concreet aanknopingspunt heeft voor dit onderwerp, zet 'stance' dan op "geen_standpunt" en 'matchedPassageId' op "".

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

OFFICIËLE VERKIEZINGSPROGRAMMA'S 2026-2030 VAN DE 8 ANDERE RAADSPARTIJEN:
${getOtherPartiesManifestoPromptContext()}

ANTWOORD UITSLUITEND IN DIT VALIDE JSON FORMAAT (GEEN MARKDOWN BACKTICKS OF UITLEG):
{
  "primaryStance": "positief" | "negatief" | "gemengd" | "neutraal",
  "summaryText": "Beknopte politieke fractielijn (2-3 zinnen) voor dit raadsvoorstel vanuit Lijst van Andel.",
  "standpunten": [
    {
      "hoofdstukNr": 1-10,
      "standpuntNr": 1-20,
      "standpuntTitel": "Exacte titel van het standpunt",
      "stance": "positief" | "negatief" | "genuanceerd",
      "explanation": "Waarom Lijst van Andel deze positie inneemt op basis van de feiten in de gescande stukken.",
      "relevanceScore": 65-100,
      "sourceDocumentTitles": ["Exacte titel van het document waarin dit naar voren komt"],
      "citedPassage": "Letterlijk citaat of feitelijke passage uit de gescande stukken",
      "matchedKeywords": ["zoekterm1", "zoekterm2"]
    }
  ],
  "otherParties": [
    {
      "partyId": "BGL" | "CDA" | "D66" | "CPB" | "VVD" | "CU" | "STEM" | "PRO",
      "matchedPassageId": "id_van_passage_of_leeg",
      "stance": "positief" | "negatief" | "genuanceerd" | "geen_standpunt",
      "explanation": "Feitelijke toelichting hoe deze partij er op basis van haar verkiezingsprogramma en de gescande stukken in staat (of vermelding dat het programma hier niets over zegt)."
    }
  ]
}`;

      console.log(`[STANDPUNT SCANNER] Verzenden prompt naar Gemini AI...`);
      let response: any = null;

      try {
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            temperature: 0.15,
            responseMimeType: "application/json",
          },
        });
      } catch (gemini38Err: any) {
        console.warn("[STANDPUNT SCANNER] Gemini 3.8 Flash mislukt, probeer Gemini 2.5 Flash fallback:", gemini38Err?.message || gemini38Err);
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            temperature: 0.15,
            responseMimeType: "application/json",
          },
        });
      }

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

        // Parse and strictly verify AI otherParties against OTHER_PARTIES_MANIFESTOS
        if (parsed && Array.isArray(parsed.otherParties) && parsed.otherParties.length > 0) {
          const fallbackOtherParties = matchOtherPartiesForTopic(topic);
          aiOtherParties = OTHER_PARTIES_MANIFESTOS.map((party) => {
            const aiEntry = parsed.otherParties.find((op: any) => op.partyId === party.partyId);
            if (!aiEntry) {
              return fallbackOtherParties.find((f) => f.partyId === party.partyId)!;
            }
            const verifiedPassage = party.passages.find((p) => p.id === aiEntry.matchedPassageId);
            const rawStance = aiEntry.stance as OtherPartyStanceType;
            const validStance: OtherPartyStanceType =
              verifiedPassage && (rawStance === "positief" || rawStance === "negatief" || rawStance === "genuanceerd")
                ? rawStance
                : "geen_standpunt";

            if (validStance === "geen_standpunt" || !verifiedPassage) {
              return {
                partyId: party.partyId,
                partyName: party.partyName,
                partyFullName: party.partyFullName,
                stance: "geen_standpunt",
                stanceLabel: getOtherPartyStanceLabel("geen_standpunt"),
                explanation:
                  aiEntry.explanation && aiEntry.stance === "geen_standpunt"
                    ? aiEntry.explanation
                    : `Het verkiezingsprogramma 2026–2030 van ${party.partyName} bevat geen specifiek standpunt of directe passage over dit specifieke onderwerp.`,
                verbatimQuote: undefined,
                chapterOrSection: party.programTitle,
                programPdfUrl: party.programPdfUrl,
              };
            }

            return {
              partyId: party.partyId,
              partyName: party.partyName,
              partyFullName: party.partyFullName,
              stance: validStance,
              stanceLabel: getOtherPartyStanceLabel(validStance),
              explanation: aiEntry.explanation || verifiedPassage.stanceSummary,
              verbatimQuote: verifiedPassage.verbatimQuote, // Strictly locked to real manifesto quote
              chapterOrSection: `${party.programTitle} — ${verifiedPassage.chapterOrSection}`,
              programPdfUrl: party.programPdfUrl,
            };
          });
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

  const finalOtherParties: OtherPartyStanceItem[] =
    aiOtherParties && aiOtherParties.length === 8
      ? aiOtherParties
      : matchOtherPartiesForTopic(topic);

  // Step 4: Map standpoints & other party stances to individual documents
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

    const docOtherParties = matchOtherPartiesForDocument(doc, topic);

    return {
      ...doc,
      matchedStandpunten: docStandpunten.length > 0 ? docStandpunten : undefined,
      otherPartiesStances: docOtherParties,
    };
  });

  // Step 5: Update topic
  topic.matchedStandpunten = finalMatched;
  topic.standpuntSummary = finalSummary;
  topic.otherPartiesStances = finalOtherParties;
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
    message: `Stukken succesvol doorgescand: ${finalMatched.length} partijstandpunt(en) en 8 fractieprogramma's geanalyseerd.`,
  };
}
