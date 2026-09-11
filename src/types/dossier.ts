export interface RaadsstukMetadata {
  bestandsnaam: string;
  titel: string;
  dossier: string;
  datum: string | null;
  entiteiten: string;
  relaties: string;
  subdossier?: string;
  wijk_of_kern?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  group: string;
  type: "Raadsstuk" | "Relatie" | string;
  date: string | null;
  dossier?: string;
  subdossier?: string;
  bestandsnaam?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  reasons?: string[];
}

export interface NetworkGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface DossierDocument {
  id: string;
  bestandsnaam: string;
  titel: string;
  dossier: string;
  subdossier?: string;
  wijk_of_kern?: string;
  wijken?: string[];
  datum: string | null;
  entiteiten: string[];
  relaties: string[];
  fileExists: boolean;
  fileUrl?: string;
  fileSize?: number;
  uploadedAt?: string;
  summary?: string;
}

export interface DossierSubdossier {
  id: string;
  title: string;
  slug: string;
  hoofddossier: string;
  documentCount: number;
  uploadedCount: number;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  wijken: string[];
  tags: string[];
  description?: string;
  thumbnail: string;
}

export interface Dossier {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  thumbnail: string;
  tags: string[];
  documentCount: number;
  uploadedCount: number;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  documents: DossierDocument[];
  subdossiers?: DossierSubdossier[];
  subdossierCount?: number;
  wijken?: string[];
  isCustom?: boolean;
  wijkSlug?: string;
  wijkNaam?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFavorite {
  id: string;
  userId: string;
  filename: string;
  title: string;
  dossier: string;
  date: string | null;
  createdAt: string;
  fileExists?: boolean;
  fileUrl?: string;
  fileSize?: number;
}

export interface SearchHit {
  type: "dossier" | "document";
  id: string;
  title: string;
  dossierName?: string;
  dossierSlug?: string;
  filename?: string;
  date?: string | null;
  category?: string;
  description?: string;
  matchField: "title" | "filename" | "content" | "description" | "entities" | "relations" | "dossier";
  snippet?: string;
  score: number;
  fileExists?: boolean;
  fileUrl?: string;
  isFavorite?: boolean;
  documentCount?: number;
  uploadedCount?: number;
}

export interface CouncilSearchResponse {
  query: string;
  exactPhrase: boolean;
  tookMs: number;
  totalHits: number;
  totalDossiers: number;
  totalDocuments: number;
  hits: SearchHit[];
  dossiers: Dossier[];
  documents: DossierDocument[];
}

