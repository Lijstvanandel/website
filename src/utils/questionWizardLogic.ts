import {
  TriageCalculationResult,
  QuestionItem,
  FramingType,
  WrittenQuestionDossier,
} from "@/types/questionWizard";

/**
 * Functie 1.3: Deterministische Rekenmodule (Prullenbak-kans & Nieuwswaarde)
 * - Conflict: 35% gewicht (1-5)
 * - Impact: 40% gewicht (1-5)
 * - Schaalgrootte: 25% gewicht (1-5)
 * - Incidenteel probleem: 15% aftrek
 * - Drempelwaarde: 60%
 */
export function calculateTriageScore(
  conflictScore: number,
  impactScore: number,
  scaleScore: number,
  problemType: "structureel" | "incidenteel",
  isLocalPolicy: boolean | null
): TriageCalculationResult {
  if (isLocalPolicy === false) {
    return {
      baseScore: 0,
      penalty: 0,
      totalScore: 0,
      prullenbakKans: 100,
      passed: false,
      message: "Gestopt: Niet-gemeentelijk onderwerp. Valt buiten de bevoegdheid van de gemeenteraad.",
    };
  }

  // Calculate weighted base score (0 - 100)
  const cNorm = Math.max(1, Math.min(5, conflictScore || 1));
  const iNorm = Math.max(1, Math.min(5, impactScore || 1));
  const sNorm = Math.max(1, Math.min(5, scaleScore || 1));

  const baseScore = Math.round(
    (cNorm / 5) * 35 + (iNorm / 5) * 40 + (sNorm / 5) * 25
  );

  const penalty = problemType === "incidenteel" ? 15 : 0;
  const totalScore = Math.max(0, Math.min(100, baseScore - penalty));
  const prullenbakKans = 100 - totalScore;
  const passed = isLocalPolicy === true && totalScore >= 60;

  let message = "";
  if (isLocalPolicy === null) {
    message = "Beantwoord eerst of dit over lokaal gemeentelijk beleid gaat.";
  } else if (!passed) {
    message = "Te weinig nieuwswaarde. Stop met dit onderwerp of zoek meer bewijs.";
  } else {
    message = "Voldoende nieuwswaarde en impact! Goedgekeurd voor dossieropbouw.";
  }

  return {
    baseScore,
    penalty,
    totalScore,
    prullenbakKans,
    passed,
    message,
  };
}

/**
 * Functie 4.3: Client-side Regex Validatie
 * Regel: Begint de zin met "Waarom", "Hoe kijkt", of "Wat vindt"?
 * -> Tekst kleurt rood, formulier kan niet worden opgeslagen.
 */
export const BANNED_OPEN_QUESTION_REGEX =
  /^\s*(?:(?:\d+[.)\-:]\s*)*)(waarom|hoe\s+kijkt|wat\s+vindt)\b/i;

/**
 * Aanbevolen gesloten openingsformuleringen (Art. 41 RvO best practice):
 */
export const APPROVED_CLOSED_QUESTION_REGEX =
  /^\s*(?:(?:\d+[.)\-:]\s*)*)(klopt\s+het|is\s+het\s+college|is\s+de\s+wethouder|deelt\s+het\s+college|deelt\s+de\s+wethouder|erkent\s+het\s+college|erkent\s+de\s+wethouder|bent\s+u\s+het\s+ermee\s+eens|is\s+het\s+waar\s+dat|kan\s+het\s+college\s+bevestigen|kan\s+de\s+wethouder\s+bevestigen|heeft\s+het\s+college|heeft\s+de\s+wethouder|is\s+er\s+sprake\s+van|welke\s+|welk\s+bedrag|op\s+welke\s+datum|op\s+welke\s+wijze|wanneer\s+|hoeveel\s+)\b/i;

export interface QuestionValidationResult {
  isValid: boolean;
  isBanned: boolean;
  error?: string;
  warning?: string;
}

export function validateQuestionText(text: string): QuestionValidationResult {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return {
      isValid: false,
      isBanned: false,
      error: "Vraag mag niet leeg zijn.",
    };
  }

  // 1. Harde binaire check: Verboden open vraag
  if (BANNED_OPEN_QUESTION_REGEX.test(trimmed)) {
    return {
      isValid: false,
      isBanned: true,
      error:
        "❌ VERBODEN OPEN VRAAG: Begin een schriftelijke vraag nooit met 'Waarom', 'Hoe kijkt' of 'Wat vindt'. Een wethouder kan hier politiek omheen praten zonder feitelijk antwoord te geven.",
    };
  }

  // 2. Waarschuwing als de zin niet begint met goedgekeurde gesloten controlewoorden
  if (!APPROVED_CLOSED_QUESTION_REGEX.test(trimmed)) {
    return {
      isValid: true,
      isBanned: false,
      warning:
        "⚠️ Tip: Formuleer als gesloten controlevraag (bijv. 'Klopt het dat...', 'Erkent het college dat...', 'Deelt de wethouder de constatering dat...'). Vermijd open vragen waarop een wethouder makkelijk omheen kan praten.",
    };
  }

  return {
    isValid: true,
    isBanned: false,
  };
}

/**
 * Framing opties met toelichting conform Trias Politica / Gemeentewet
 */
export const FRAMING_DEFINITIONS: Record<
  FramingType,
  {
    title: string;
    subtitle: string;
    description: string;
    legalBasis: string;
    badgeColor: string;
  }
> = {
  informatieplicht: {
    title: "Schending Informatieplicht",
    subtitle: "Gemeentewet art. 169 lid 2",
    description:
      "Het college heeft de gemeenteraad niet, te laat of onvolledig geïnformeerd over wezenlijke feiten, financiële tegenvallers of besluitvorming.",
    legalBasis: "Art. 169 lid 2 Gemeentewet (Actieve & passieve informatieplicht)",
    badgeColor: "border-rose-500/30 text-rose-600 bg-rose-500/10",
  },
  uitvoeringsfout: {
    title: "Uitvoeringsfout",
    subtitle: "Beleid of budget verkeerd uitgevoerd",
    description:
      "Vastgesteld beleid, een aangenomen motie of raadsbesluit is verkeerd of gebrekkig uitgevoerd, of er is sprake van ongeoorloofde budgetoverschrijding.",
    legalBasis: "Art. 160 Gemeentewet (Bevoegdheden college) jo. Financiële verordening art. 212",
    badgeColor: "border-amber-500/30 text-amber-600 bg-amber-500/10",
  },
  mismanagement: {
    title: "Mismanagement",
    subtitle: "Structureel negeren van signalen",
    description:
      "Herhaaldelijk negeren van waarschuwingen van inwoners, dorpsraden of ambtenaren, falende interne regie of passiviteit bij acute problemen.",
    legalBasis: "Art. 169 lid 1 Gemeentewet (Verantwoording college aan de raad)",
    badgeColor: "border-blue-500/30 text-blue-600 bg-blue-500/10",
  },
};

/**
 * Genereert een formele considerans opzet op basis van Module 2 feiten en bronnen
 */
export function generateSuggestedConsiderans(dossier: Partial<WrittenQuestionDossier>): string {
  const parts: string[] = [];

  parts.push("De ondergetekende, lid van de raad der gemeente Steenwijkerland namens de fractie Lijst van Andel;");
  parts.push("");
  parts.push("Overwegende dat:");

  if (dossier.promisedQuote?.trim()) {
    parts.push(
      `- Het college (dan wel de verantwoordelijk wethouder) in het verleden expliciet heeft toegezegd dan wel verklaard: "${dossier.promisedQuote.trim()}";`
    );
  }

  if (dossier.contradictingReality?.trim()) {
    parts.push(
      `- De huidige feitelijke realiteit daarmee in directe tegenspraak is, te weten dat: ${dossier.contradictingReality.trim()};`
    );
  }

  if (dossier.sources && dossier.sources.length > 0) {
    const sourceRefs = dossier.sources
      .map((s) => `${s.title}${s.reference ? ` (${s.reference})` : ""}`)
      .join("; ");
    parts.push(`- Bovenstaande feiten blijken uit onderliggende documenten en bronnen, waaronder: ${sourceRefs};`);
  }

  if (dossier.framing) {
    const framingInfo = FRAMING_DEFINITIONS[dossier.framing];
    if (framingInfo) {
      parts.push(
        `- Er hierdoor sprake is van ${framingInfo.title.toLowerCase()} (${framingInfo.legalBasis}), hetgeen de controlerende taak van de gemeenteraad en de belangen van de inwoners van Steenwijkerland rechtstreeks raakt;`
      );
    }
  }

  parts.push("");
  parts.push("Stelt op grond van artikel 41 van het Reglement van Orde voor de vergaderingen en andere werkzaamheden van de raad van Steenwijkerland de volgende schriftelijke vragen aan het College van Burgemeester en Wethouders:");

  return parts.join("\n");
}
