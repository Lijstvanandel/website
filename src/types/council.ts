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
}

export interface CouncilTopicNote {
  id: string;
  authorUsername: string;
  authorName: string;
  documentId?: string; // Optional: linked to a specific document
  documentTitle?: string;
  note: string;
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
  category: "Oordeelvorming - bespreekstukken" | "Hamerstukken" | "Informatief" | "Overig";
  title: string;
  description?: string;
  assignedTo?: string | null; // username of assigned council member/fractielid
  assignedName?: string | null; // full name of assigned member
  assignedAt?: string | null;
  documents: CouncilDocument[];
  notes: CouncilTopicNote[];
  isArchived: boolean;
  archivedAt?: string | null;
  sourceUrl?: string;
  scrapedAt: string;
}

export interface CouncilMeetingScrapeSummary {
  lastScrapedAt: string;
  totalMeetingsScraped: number;
  totalTopics: number;
  bespreekstukkenCount: number;
  archivedCount: number;
  status: "idle" | "scraping" | "success" | "error";
  errorMessage?: string;
}
