import fs from "fs";
import path from "path";
import type { Dossier, DossierDocument, GraphNode, GraphEdge, NetworkGraphData, RaadsstukMetadata } from "../types/dossier.js";

const METADATA_PATH = path.join(process.cwd(), "public", "data", "raadsstukken_metadata_tussentijds.json");
const GRAPH_PATH = path.join(process.cwd(), "public", "data", "network_graph.json");
const DOCUMENTS_DIR = path.join(process.cwd(), "public", "uploads", "documents");
const DIST_DOCUMENTS_DIR = path.join(process.cwd(), "dist", "uploads", "documents");

// Helper to sanitize slug
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-en-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

// Category and image presets for dossiers
const DOSSIER_PRESETS: Record<string, { category: string; thumbnail: string; description: string }> = {
  "Wijziging gemeenschappelijke regelingen": {
    category: "Bestuur & Regelingen",
    thumbnail: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80",
    description: "Evaluaties, zienswijzen en wijzigingsvoorstellen voor regionale samenwerkingsverbanden (GGD, Omgevingsdienst, Veiligheidsregio en RSJ)."
  },
  "Ingekomen stukken": {
    category: "Raad & Bestuur",
    thumbnail: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80",
    description: "Ingekomen brieven, circulaires, bewonersverzoeken en officiële mededelingen voor de gemeenteraad."
  },
  "Zienswijze GR": {
    category: "Bestuur & Regelingen",
    thumbnail: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80",
    description: "Officiële moties en zienswijzen op de ontwerpen van gemeenschappelijke regelingen in de regio IJsselland."
  },
  "Woningbouw": {
    category: "Ruimte & Wonen",
    thumbnail: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
    description: "Bestemmingsplannen, gebiedsvisies, geur- en milieuhinderonderzoeken voor nieuwe woonlocaties in Steenwijk en kernen."
  },
  "Nieuw museum": {
    category: "Cultuur & Erfgoed",
    thumbnail: "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&auto=format&fit=crop&q=80",
    description: "Masterplan en stichtingskosten voor het nieuwe museum Steenwijkerland en de Spijkervetstallen."
  },
  "Handhaving en Vergunningplicht IceBear": {
    category: "Milieu & Handhaving",
    thumbnail: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80",
    description: "Handhavingsverzoeken, geur- en emissiemetingen, GGD-gezondheidsadviezen en collegebesluiten aangaande IceBear Steenwijk."
  },
  "Jeugdzorg (RSJ IJsselland)": {
    category: "Sociaal Domein & Jeugd",
    thumbnail: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80",
    description: "Regionale visie, kadernota's, inkoopmodellen en begrotingen van het Regionaal Serviceteam Jeugd IJsselland."
  },
  "Jeugdhulp": {
    category: "Sociaal Domein & Jeugd",
    thumbnail: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80",
    description: "Beleidsplannen, jaarstukken en verordeningen rond jeugdhulp en kind- en gezinsbescherming."
  },
  "Stikstof": {
    category: "Natuur & Milieu",
    thumbnail: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop&q=80",
    description: "AERIUS-berekeningen, stikstofdepositie-onderzoeken en effecten op Natura 2000-gebieden zoals De Weerribben en De Wieden."
  },
  "Asiel- en Oekraïneopvang": {
    category: "Samenleving & Opvang",
    thumbnail: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&auto=format&fit=crop&q=80",
    description: "Opvanglocaties, Spreidingswet-uitvoering en tijdelijke opvang in het Fletcher Hotel en Steenwijkerland."
  },
  "Windenergie": {
    category: "Energie & Duurzaamheid",
    thumbnail: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=80",
    description: "Programmeringsafspraken met de provincie Overijssel en locatieonderzoeken voor windturbines (o.a. Groot Verlaat)."
  },
  "Zonne-energie": {
    category: "Energie & Duurzaamheid",
    thumbnail: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
    description: "Aanvragen en inpassing van zonneparken (o.a. De Hoop Blokzijl en Eeserwold) inclusief participatie en landschapsplannen."
  },
  "Gebiedsontwikkeling": {
    category: "Ruimte & Wonen",
    thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80",
    description: "Ambitiedocument Spoorzone Steenwijk 2040, Gebiedsvisie Steenwijk Oost ('Het Vrije Veld') en centrumontwikkeling."
  },
  "Huiselijk Geweld en Kindermishandeling": {
    category: "Sociaal Domein & Zorg",
    thumbnail: "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=800&auto=format&fit=crop&q=80",
    description: "Regiovisie IJsselland 'Samen tegen huiselijk geweld - Lokaal Sterk' 2026-2030 en ketenaanpak."
  },
  "Schuldhulpverlening": {
    category: "Sociaal Domein & Zorg",
    thumbnail: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80",
    description: "Vaststelling beleidsplan Schuldhulpverlening 2026-2029 en basisdienstverlening samen met Kredietbank en Sociaal Werk De Kop."
  },
  "Pachtbeleid": {
    category: "Grondzaken & Landbouw",
    thumbnail: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80",
    description: "Collegebesluit en criteria pachtbeleid gemeente Steenwijkerland (Didam-arrest richtlijnen)."
  },
  "Bestemmingsplan": {
    category: "Ruimtelijke Ordening",
    thumbnail: "https://images.unsplash.com/photo-1524813686514-a57563d77d61?w=800&auto=format&fit=crop&q=80",
    description: "Bestemmingsplannen voor kernen en buitengebied (o.a. Willemsoord, Giethoorn, Sint Jansklooster en Zuidveen)."
  },
  "Openbare ruimte": {
    category: "Beheer & Infrastructuur",
    thumbnail: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=800&auto=format&fit=crop&q=80",
    description: "Beschoeiing Belt-Schutsloot, parkeerbeleid bezoekerscentrum Natuurmonumenten en onderhoud van de fysieke leefomgeving."
  },
  "Wegen en Infrastructuur": {
    category: "Verkeer & Vervoer",
    thumbnail: "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=800&auto=format&fit=crop&q=80",
    description: "Beleidsplan Beheer en Onderhoud Wegen & Paden Steenwijkerland, veilige bermen en fietscorridors."
  },
  "Participatiewet": {
    category: "Werk & Inkomen",
    thumbnail: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80",
    description: "Participatiewet in Balans, giftenregeling en leidraad algemene bijstand 2026."
  },
  "Cao Aan de slag": {
    category: "Werk & Inkomen",
    thumbnail: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=80",
    description: "Ledenraadpleging VNG over het onderhandelaarsresultaat Cao Aan de slag 2026-2027 en sociale werkvoorziening."
  },
  "Beeldende Kunst": {
    category: "Cultuur & Erfgoed",
    thumbnail: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80",
    description: "Verordening Commissie Beeldende Kunst Steenwijkerland en advisering over kunst in de openbare ruimte."
  },
  "Woonwagenbeleid": {
    category: "Ruimte & Wonen",
    thumbnail: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80",
    description: "Woonwagenbeleid Steenwijkerland richting 2035 en standplaatsen in Steenwijk, Giethoorn en Vollenhove."
  },
  "Archiefbeheer": {
    category: "Bestuur & Informatie",
    thumbnail: "https://images.unsplash.com/photo-1507842229452-957cdb27b38d?w=800&auto=format&fit=crop&q=80",
    description: "Toezichtverslagen op het beheer van de niet-overgebrachte archieven volgens de Archiefwet 1995."
  }
};

const DEFAULT_THUMBNAIL = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80";

// Read raw metadata from file
export function getRawMetadata(): RaadsstukMetadata[] {
  try {
    if (fs.existsSync(METADATA_PATH)) {
      const data = fs.readFileSync(METADATA_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading metadata file:", err);
  }
  return [];
}

// Read raw network graph from file
export function getRawNetworkGraph(): NetworkGraphData {
  try {
    if (fs.existsSync(GRAPH_PATH)) {
      const data = fs.readFileSync(GRAPH_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading graph file:", err);
  }
  return { nodes: [], edges: [] };
}

// Check if a physical document exists in the uploads directory
export function checkFileExists(filename: string): { exists: boolean; fileUrl?: string; fileSize?: number } {
  const cleanFilename = path.basename(filename);
  const targetPath = path.join(DOCUMENTS_DIR, cleanFilename);
  const distPath = path.join(DIST_DOCUMENTS_DIR, cleanFilename);

  if (fs.existsSync(targetPath)) {
    try {
      const stat = fs.statSync(targetPath);
      return {
        exists: true,
        fileUrl: `/uploads/documents/${encodeURIComponent(cleanFilename)}`,
        fileSize: stat.size,
      };
    } catch (_e) {
      return { exists: true, fileUrl: `/uploads/documents/${encodeURIComponent(cleanFilename)}` };
    }
  }

  if (fs.existsSync(distPath)) {
    try {
      const stat = fs.statSync(distPath);
      return {
        exists: true,
        fileUrl: `/uploads/documents/${encodeURIComponent(cleanFilename)}`,
        fileSize: stat.size,
      };
    } catch (_e) {
      return { exists: true, fileUrl: `/uploads/documents/${encodeURIComponent(cleanFilename)}` };
    }
  }

  return { exists: false };
}

// Build complete list of Dossiers from metadata + SQLite custom dossiers
export function getAllDossiers(customDossiers: Dossier[] = []): Dossier[] {
  const metadataList = getRawMetadata();
  const dossierMap = new Map<string, DossierDocument[]>();

  // Group metadata by dossier name
  metadataList.forEach((item, index) => {
    const rawDossier = (item.dossier || "Overig").trim();
    if (!dossierMap.has(rawDossier)) {
      dossierMap.set(rawDossier, []);
    }

    const fileCheck = checkFileExists(item.bestandsnaam);
    const entiteiten = item.entiteiten
      ? item.entiteiten.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const relaties = item.relaties
      ? item.relaties.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const doc: DossierDocument = {
      id: `doc-${index}-${slugify(item.bestandsnaam)}`,
      bestandsnaam: item.bestandsnaam,
      titel: item.titel || item.bestandsnaam.replace(/\.pdf$/i, ""),
      dossier: rawDossier,
      datum: item.datum || null,
      entiteiten,
      relaties,
      fileExists: fileCheck.exists,
      fileUrl: fileCheck.fileUrl,
      fileSize: fileCheck.fileSize,
    };

    dossierMap.get(rawDossier)!.push(doc);
  });

  const dossiers: Dossier[] = [];

  // Transform grouped items into Dossier entities
  for (const [title, docs] of dossierMap.entries()) {
    // Sort documents chronologically (newest first, null dates at end)
    docs.sort((a, b) => {
      if (!a.datum && !b.datum) return 0;
      if (!a.datum) return 1;
      if (!b.datum) return -1;
      return new Date(b.datum).getTime() - new Date(a.datum).getTime();
    });

    const dates = docs.map((d) => d.datum).filter(Boolean) as string[];
    dates.sort();
    const startDate = dates.length > 0 ? dates[0] : null;
    const endDate = dates.length > 0 ? dates[dates.length - 1] : null;

    const preset = DOSSIER_PRESETS[title] || {
      category: "Gemeenteraad & Beleid",
      thumbnail: DEFAULT_THUMBNAIL,
      description: `Officieel raadsdossier '${title}' met ${docs.length} gerelateerde raadsstukken en besluiten.`,
    };

    // Extract top tags/entities
    const tagSet = new Set<string>();
    docs.forEach((d) => {
      d.entiteiten.slice(0, 3).forEach((e) => tagSet.add(e));
    });

    const uploadedCount = docs.filter((d) => d.fileExists).length;

    dossiers.push({
      id: slugify(title),
      title: title,
      slug: slugify(title),
      description: preset.description,
      category: preset.category,
      thumbnail: preset.thumbnail,
      tags: Array.from(tagSet).slice(0, 5),
      documentCount: docs.length,
      uploadedCount,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      documents: docs,
      isCustom: false,
      createdAt: docs[docs.length - 1]?.datum || new Date().toISOString(),
      updatedAt: docs[0]?.datum || new Date().toISOString(),
    });
  }

  // Merge custom dossiers
  if (Array.isArray(customDossiers)) {
    customDossiers.forEach((custom) => {
      const existingIdx = dossiers.findIndex((d) => d.id === custom.id || d.slug === custom.slug);
      if (existingIdx >= 0) {
        // Merge custom overrides (like custom thumbnail or description)
        dossiers[existingIdx] = {
          ...dossiers[existingIdx],
          ...custom,
          documents: [...dossiers[existingIdx].documents, ...(custom.documents || [])],
        };
      } else {
        dossiers.push(custom);
      }
    });
  }

  // Sort dossiers by document count descending
  dossiers.sort((a, b) => b.documentCount - a.documentCount);

  return dossiers;
}

// Get subnetwork graph for a specific dossier
export function getDossierGraph(dossierTitleOrSlug: string): NetworkGraphData {
  const allDossiers = getAllDossiers();
  const matchedDossier = allDossiers.find(
    (d) => d.id === dossierTitleOrSlug || d.slug === dossierTitleOrSlug || d.title.toLowerCase() === dossierTitleOrSlug.toLowerCase()
  );

  const fullGraph = getRawNetworkGraph();
  if (!matchedDossier) {
    return { nodes: [], edges: [] };
  }

  const dossierFileNames = new Set(matchedDossier.documents.map((d) => d.bestandsnaam));
  const relevantNodeIds = new Set<string>();
  const relevantEdges: GraphEdge[] = [];

  // Add document nodes
  fullGraph.nodes.forEach((node) => {
    if (dossierFileNames.has(node.id) || node.group === matchedDossier.title) {
      relevantNodeIds.add(node.id);
    }
  });

  // Add connected edges and connected relation nodes
  fullGraph.edges.forEach((edge) => {
    if (dossierFileNames.has(edge.source) || relevantNodeIds.has(edge.source)) {
      relevantEdges.push(edge);
      relevantNodeIds.add(edge.source);
      relevantNodeIds.add(edge.target);
    } else if (dossierFileNames.has(edge.target) || relevantNodeIds.has(edge.target)) {
      relevantEdges.push(edge);
      relevantNodeIds.add(edge.source);
      relevantNodeIds.add(edge.target);
    }
  });

  // Filter nodes
  const filteredNodes: GraphNode[] = fullGraph.nodes
    .filter((node) => relevantNodeIds.has(node.id))
    .map((node) => {
      const isDoc = dossierFileNames.has(node.id) || node.type === "Raadsstuk";
      const docMatch = matchedDossier.documents.find((d) => d.bestandsnaam === node.id);
      return {
        ...node,
        bestandsnaam: isDoc ? node.id : undefined,
        dossier: matchedDossier.title,
        label: docMatch?.titel || node.label,
        type: isDoc ? "Raadsstuk" : "Relatie",
      };
    });

  return {
    nodes: filteredNodes,
    edges: relevantEdges,
  };
}

// Save a new custom dossier to SQLite db
export function createCustomDossier(
  payload: Partial<Dossier> & { title: string },
  db: any,
  saveDbFn: (db: any) => void
): Dossier {
  if (!db.customDossiers) db.customDossiers = [];
  const slug = payload.slug || slugify(payload.title);
  const now = new Date().toISOString();
  const newDossier: Dossier = {
    id: `custom-${Date.now()}-${slug}`,
    title: payload.title.trim(),
    slug,
    description: payload.description || `Dossier ${payload.title.trim()}`,
    category: payload.category || "Gemeenteraad & Beleid",
    thumbnail: payload.thumbnail || DEFAULT_THUMBNAIL,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    documentCount: payload.documents?.length || 0,
    uploadedCount: payload.documents?.filter((d: any) => d.fileExists)?.length || 0,
    dateRange: payload.dateRange || { start: null, end: null },
    documents: payload.documents || [],
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };

  db.customDossiers.unshift(newDossier);
  saveDbFn(db);
  return newDossier;
}

// Update an existing dossier in SQLite db
export function updateDossier(
  idOrSlug: string,
  updates: Partial<Dossier>,
  db: any,
  saveDbFn: (db: any) => void
): Dossier | null {
  if (!db.customDossiers) db.customDossiers = [];
  const allDossiers = getAllDossiers(db.customDossiers);
  const existing = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!existing) return null;

  const customIndex = db.customDossiers.findIndex(
    (d: Dossier) => d.id === idOrSlug || d.slug === idOrSlug || d.title.toLowerCase() === existing.title.toLowerCase()
  );

  const updated: Dossier = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (customIndex >= 0) {
    db.customDossiers[customIndex] = updated;
  } else {
    db.customDossiers.push(updated);
  }

  saveDbFn(db);
  return updated;
}

// Process bulk uploaded council documents
export function processUploadedCouncilDocuments(
  uploadedFiles: any[],
  syncFileFn: (filePath: string) => void
): {
  totalUploaded: number;
  matchedCount: number;
  unmatchedCount: number;
  matchedDocuments: Array<{ filename: string; dossier: string; title: string }>;
  unmatchedDocuments: string[];
} {
  const metadataList = getRawMetadata();
  const metadataByFilename = new Map<string, RaadsstukMetadata>();
  metadataList.forEach((item) => {
    metadataByFilename.set(item.bestandsnaam.toLowerCase().trim(), item);
  });

  const matchedDocuments: Array<{ filename: string; dossier: string; title: string }> = [];
  const unmatchedDocuments: string[] = [];

  uploadedFiles.forEach((file) => {
    const rawName = file.originalname;
    const lowerName = rawName.toLowerCase().trim();

    // Mirror to dist directory as well
    const pubPath = path.join(DOCUMENTS_DIR, rawName);
    syncFileFn(pubPath);

    const match = metadataByFilename.get(lowerName);
    if (match) {
      matchedDocuments.push({
        filename: rawName,
        dossier: match.dossier,
        title: match.titel || rawName,
      });
    } else {
      unmatchedDocuments.push(rawName);
    }
  });

  return {
    totalUploaded: uploadedFiles.length,
    matchedCount: matchedDocuments.length,
    unmatchedCount: unmatchedDocuments.length,
    matchedDocuments,
    unmatchedDocuments,
  };
}

