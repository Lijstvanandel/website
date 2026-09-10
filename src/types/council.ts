export interface CouncilDocument {
  id: string; // Document GUID or unique hash
  title: string;
  url: string; // e.g., https://steenwijkerland.bestuurlijkeinformatie.nl/Agenda/Document/...
  fileType?: string; // e.g. "PDF", "DOCX"
  viewedBy?: {
    username: string;
    fullName?: string;
    viewedAt: string;
  }[];
  // Diff checker metadata
  addedAt?: string; // When this document was first indexed
  isLateDump?: boolean; // Added within 48h before the meeting (the classic Friday dump)
  isNewAfterCompile?: boolean; // Document added after a support dossier was compiled
}

export interface CouncilTopicDiffAlert {
  id: string;
  topicId: string;
  detectedAt: string; // ISO timestamp
  type: "new_document" | "updated_document" | "removed_document" | "content_update";
  documentTitle?: string;
  documentUrl?: string;
  documentId?: string;
  summary: string;
  isDumpAlert: boolean; // True if within 48h before meeting (vrijdagmiddag-dump)
  hoursBeforeMeeting?: number;
  dismissed?: boolean;
  dismissedAt?: string;
  dismissedBy?: string;
}

export interface CouncilTopicNote {
  id: string;
  authorUsername: string;
  authorName: string;
  documentId?: string | null; // Optional: linked to a specific document
  documentTitle?: string | null;
  note: string;
  source?: "fractie" | "ledenfeedback";
  memberEmail?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CouncilAgendaTopic {
  id: string; // Topic ID or generated slug
  meetingId: string;
  meetingDate: string; // YYYY-MM-DD
  meetingDateDisplay: string; // e.g. "dinsdag 8 december 2026"
  meetingTitle: string; // e.g. "Raadsvergadering (Oordeelsvormend)", "Oordeelsvorming"
  meetingType: string; // e.g. "Oordeelsvormend", "Besluitvormend", etc.
  agendaItemNumber?: string; // e.g. "4.1" or "5"
  category: "Oordeelvorming - bespreekstukken" | "Oordeelvorming - hamerstukken" | "Hamerstukken" | "Informatief" | "Overig" | string;
  title: string;
  description?: string;
  assignedTo?: string | null; // username of assigned council member/fractielid
  assignedName?: string | null; // full name of assigned member
  assignedMemberAvatar?: string | null;
  assignedMemberRole?: string | null;
  assignedMemberId?: string | null;
  assignedAt?: string | null;
  documents: CouncilDocument[];
  notes: CouncilTopicNote[];
  isArchived: boolean;
  archivedAt?: string | null;
  sourceUrl?: string;
  scrapedAt: string;

  // Politieke Markt & Raadsvergadering contributions
  bijdragePolitiekeMarkt?: string;
  bijdragePolitiekeMarktUpdatedBy?: string;
  bijdragePolitiekeMarktUpdatedAt?: string;

  bijdrageRaadsvergadering?: string;
  bijdrageRaadsvergaderingUpdatedBy?: string;
  bijdrageRaadsvergaderingUpdatedAt?: string;

  // Status & Hamerstuk handling
  status?: "in_behandeling" | "hamerstuk_afgehandeld" | "bespreekstuk" | "afgerond" | string;
  hamerstukAfgehandeldAt?: string | null;
  hamerstukAfgehandeldBy?: string | null;

  // Ondersteuningsdossier & Dossiersysteem koppeling
  compiledDossier?: SupportDossier | null;
  linkedDossierSlug?: string | null;
  linkedDossierId?: string | null;

  // Diff Checker & Vrijdagmiddag-dump Detection
  hasRecentDump?: boolean; // True if a late document was added (<48h before meeting)
  hasDocumentDiff?: boolean; // True if unacknowledged document changes exist
  lastDiffDetectedAt?: string | null;
  diffAlerts?: CouncilTopicDiffAlert[];
  hasNewDocumentsSinceCompile?: boolean;
  newDocumentsCountSinceCompile?: number;
}

export interface DossierEvidenceItem {
  id: string;
  sourceDocName: string;
  sourceDocUrl?: string;
  page: number;
  quote: string;
  finding: string;
  type: "contradictie" | "toezegging" | "beleidswijziging" | "financieel" | "historisch_feit";
  contradictionWith?: {
    sourceDocName: string;
    sourceDocUrl?: string;
    page: number;
    quote: string;
  };
}

export interface SupportDossier {
  id: string;
  topicId: string;
  topicTitle: string;
  compiledAt: string;
  compiledBy?: string;
  status: "compleet" | "geen_referenties" | "fout";
  historischeLijn: string;
  bewijslast: DossierEvidenceItem[];
  klemzetVragen: string[];
  gefilterdeDocumenten: {
    filename: string;
    title: string;
    dossier: string;
    url: string;
    pageCount?: number;
    matchedTags?: string[];
  }[];
  linkedDossierSlug?: string;
  linkedDossierId?: string;
  rawAnalysis?: string;
}

export interface CouncilMeetingScrapeSummary {
  lastScrapedAt: string;
  totalMeetingsScraped: number;
  totalTopics: number;
  bespreekstukkenCount: number;
  archivedCount: number;
  status: "idle" | "scraping" | "success" | "error";
  errorMessage?: string;
  // Diff checker & Watchdog telemetry
  lastDiffCheckAt?: string;
  diffsDetectedCount?: number;
  lateDumpsDetectedCount?: number;
  activePollingIntervalMinutes?: number;
  nextExpectedCheckAt?: string;
}

