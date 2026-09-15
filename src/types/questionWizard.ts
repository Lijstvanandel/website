export interface QuestionDossierSource {
  id: string;
  type: "notubiz" | "motie" | "wob_woo" | "begroting" | "url" | "anders";
  title: string;
  reference: string; // URL, document kenmerk of zaaknummer
}

export interface QuestionDossierAttachment {
  id: string;
  filename: string;
  fileUrl: string;
  fileSize?: number;
  uploadedAt: string;
}

export interface QuestionItem {
  id: string;
  text: string;
}

export type FramingType =
  | "informatieplicht" // Schending Informatieplicht (Gemeentewet art. 169 lid 2)
  | "uitvoeringsfout"   // Uitvoeringsfout (Beleid/budget verkeerd uitgevoerd)
  | "mismanagement";   // Mismanagement (Structureel negeren van signalen)

export interface WrittenQuestionDossier {
  id: string;
  title: string;
  authorId?: string;
  authorName?: string;
  topicId?: string; // Optioneel gelinkt aan een agendapunt uit Raadspaneel
  topicTitle?: string;
  createdAt: string;
  updatedAt: string;
  status: "concept" | "gereed" | "ingediend";

  // Module 1: Triage & Bullshit filter
  isLocalPolicy: boolean | null; // Must be true (if false -> STOP)
  problemType: "structureel" | "incidenteel"; // If incidenteel -> warning
  conflictScore: number; // 1-5 (1=geen, 5=hard bewijs)
  impactScore: number;   // 1-5 (1=minimaal, 5=acute impact)
  scaleScore: number;    // 1-5 (1=1 straat, 5=hele gemeente)
  triageCalculatedScore: number; // 0-100%
  triagePassed: boolean; // >= 60%

  // Module 2: Datamining & Dossieropbouw (De Bewijslast)
  sources: QuestionDossierSource[];
  promisedQuote: string; // Wat heeft de wethouder in het verleden beloofd? (Verplicht citaat)
  contradictingReality: string; // Wat is de huidige, tegenstrijdige realiteit? (Verplicht veld)
  attachments: QuestionDossierAttachment[];

  // Module 3: Framing (Standpuntbepaling)
  framing: FramingType | null;
  journalistPitch: string; // Max 250 tekens

  // Module 4: Vragen Formulator (Het Keurslijf)
  considerans: string;
  questions: QuestionItem[];

  // Module 5: Distributie & Export (De Embargo-check)
  pitchJournalistName: string;
  pitchJournalistConfirmed: boolean;
  embargoDateTime: string;
  embargoConfirmed: boolean;
}

export interface TriageCalculationResult {
  baseScore: number;
  penalty: number;
  totalScore: number;
  prullenbakKans: number;
  passed: boolean;
  message: string;
}
