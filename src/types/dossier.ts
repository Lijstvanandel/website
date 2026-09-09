export interface RaadsstukMetadata {
  bestandsnaam: string;
  titel: string;
  dossier: string;
  datum: string | null;
  entiteiten: string;
  relaties: string;
}

export interface GraphNode {
  id: string;
  label: string;
  group: string;
  type: "Raadsstuk" | "Relatie" | string;
  date: string | null;
  dossier?: string;
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
  datum: string | null;
  entiteiten: string[];
  relaties: string[];
  fileExists: boolean;
  fileUrl?: string;
  fileSize?: number;
  uploadedAt?: string;
  summary?: string;
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
  isCustom?: boolean;
  wijkSlug?: string;
  wijkNaam?: string;
  createdAt: string;
  updatedAt: string;
}
