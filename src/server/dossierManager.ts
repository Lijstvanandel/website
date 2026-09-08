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
export function getAllDossiers(customDossiers: Dossier[] = [], deletedSlugs: string[] = []): Dossier[] {
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

  let dossiers: Dossier[] = [];

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

  // Filter out deleted dossiers
  if (Array.isArray(deletedSlugs) && deletedSlugs.length > 0) {
    const deletedSet = new Set(deletedSlugs.map((s) => s.toLowerCase()));
    dossiers = dossiers.filter((d) => !deletedSet.has(d.slug.toLowerCase()) && !deletedSet.has(d.id.toLowerCase()));
  }

  // Merge custom dossiers and overrides
  if (Array.isArray(customDossiers)) {
    customDossiers.forEach((custom) => {
      if (!custom || !custom.title) return;
      const customSlug = custom.slug || slugify(custom.title);
      if (Array.isArray(deletedSlugs) && deletedSlugs.some((s) => s.toLowerCase() === customSlug.toLowerCase())) {
        return;
      }

      const existingIdx = dossiers.findIndex(
        (d) => d.id === custom.id || d.slug === customSlug || d.title.toLowerCase() === custom.title.toLowerCase()
      );

      // Re-verify file existence for custom documents
      const customDocs = Array.isArray(custom.documents)
        ? custom.documents.map((d: DossierDocument) => {
            const check = checkFileExists(d.bestandsnaam);
            return {
              ...d,
              fileExists: check.exists,
              fileUrl: check.fileUrl || d.fileUrl,
              fileSize: check.fileSize || d.fileSize,
            };
          })
        : undefined;

      if (existingIdx >= 0) {
        // Replace or override with custom properties
        const finalDocs = customDocs !== undefined ? customDocs : dossiers[existingIdx].documents;
        const uploadedCount = finalDocs.filter((d) => d.fileExists).length;

        const dates = finalDocs.map((d) => d.datum).filter(Boolean) as string[];
        dates.sort();
        const startDate = dates.length > 0 ? dates[0] : dossiers[existingIdx].dateRange.start;
        const endDate = dates.length > 0 ? dates[dates.length - 1] : dossiers[existingIdx].dateRange.end;

        dossiers[existingIdx] = {
          ...dossiers[existingIdx],
          ...custom,
          slug: customSlug,
          documents: finalDocs,
          documentCount: finalDocs.length,
          uploadedCount,
          dateRange: { start: startDate, end: endDate },
          isCustom: true,
          updatedAt: custom.updatedAt || new Date().toISOString(),
        };
      } else {
        const finalDocs = customDocs || [];
        const uploadedCount = finalDocs.filter((d) => d.fileExists).length;
        const dates = finalDocs.map((d) => d.datum).filter(Boolean) as string[];
        dates.sort();

        dossiers.push({
          id: custom.id || `custom-${Date.now()}-${customSlug}`,
          title: custom.title.trim(),
          slug: customSlug,
          description: custom.description || `Dossier ${custom.title.trim()}`,
          category: custom.category || "Gemeenteraad & Beleid",
          thumbnail: custom.thumbnail || DEFAULT_THUMBNAIL,
          tags: Array.isArray(custom.tags) ? custom.tags : [],
          documentCount: finalDocs.length,
          uploadedCount,
          dateRange: {
            start: dates[0] || null,
            end: dates[dates.length - 1] || null,
          },
          documents: finalDocs,
          isCustom: true,
          createdAt: custom.createdAt || new Date().toISOString(),
          updatedAt: custom.updatedAt || new Date().toISOString(),
        });
      }
    });
  }

  // Sort dossiers by document count descending
  dossiers.sort((a, b) => b.documentCount - a.documentCount);

  return dossiers;
}

// Get subnetwork graph for a specific dossier
export function getDossierGraph(dossierTitleOrSlug: string, db?: any): NetworkGraphData {
  const allDossiers = getAllDossiers(db?.customDossiers || [], db?.deletedDossierSlugs || []);
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
  const nodeMap = new Map<string, GraphNode>();

  // Add all dossier documents as nodes
  matchedDossier.documents.forEach((doc) => {
    relevantNodeIds.add(doc.bestandsnaam);
    nodeMap.set(doc.bestandsnaam, {
      id: doc.bestandsnaam,
      label: doc.titel || doc.bestandsnaam,
      group: matchedDossier.title,
      type: "Raadsstuk",
      date: doc.datum || null,
      dossier: matchedDossier.title,
      bestandsnaam: doc.bestandsnaam,
    });

    // Add relations as connected nodes and edges
    if (Array.isArray(doc.relaties)) {
      doc.relaties.forEach((rel) => {
        const cleanRel = rel.trim();
        if (!cleanRel) return;
        relevantNodeIds.add(cleanRel);
        if (!nodeMap.has(cleanRel)) {
          nodeMap.set(cleanRel, {
            id: cleanRel,
            label: cleanRel,
            group: matchedDossier.title,
            type: "Relatie",
            date: null,
            dossier: matchedDossier.title,
          });
        }
        relevantEdges.push({
          source: doc.bestandsnaam,
          target: cleanRel,
          label: "In relatie met",
        });
      });
    }

    // Add entities as connected nodes and edges if not already present
    if (Array.isArray(doc.entiteiten)) {
      doc.entiteiten.forEach((ent) => {
        const cleanEnt = ent.trim();
        if (!cleanEnt) return;
        relevantNodeIds.add(cleanEnt);
        if (!nodeMap.has(cleanEnt)) {
          nodeMap.set(cleanEnt, {
            id: cleanEnt,
            label: cleanEnt,
            group: matchedDossier.title,
            type: "Entiteit",
            date: null,
            dossier: matchedDossier.title,
          });
        }
        relevantEdges.push({
          source: doc.bestandsnaam,
          target: cleanEnt,
          label: "Betreft",
        });
      });
    }
  });

  // Also include original nodes and edges from metadata network_graph.json
  fullGraph.nodes.forEach((node) => {
    if (dossierFileNames.has(node.id) || node.group === matchedDossier.title) {
      relevantNodeIds.add(node.id);
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, {
          ...node,
          dossier: matchedDossier.title,
        });
      }
    }
  });

  fullGraph.edges.forEach((edge) => {
    if (dossierFileNames.has(edge.source) || dossierFileNames.has(edge.target)) {
      relevantEdges.push(edge);
      relevantNodeIds.add(edge.source);
      relevantNodeIds.add(edge.target);

      // Ensure nodes exist for edge endpoints
      if (!nodeMap.has(edge.source)) {
        const origNode = fullGraph.nodes.find((n) => n.id === edge.source);
        if (origNode) nodeMap.set(edge.source, origNode);
      }
      if (!nodeMap.has(edge.target)) {
        const origNode = fullGraph.nodes.find((n) => n.id === edge.target);
        if (origNode) nodeMap.set(edge.target, origNode);
      }
    }
  });

  // Deduplicate edges
  const edgeKeySet = new Set<string>();
  const uniqueEdges: GraphEdge[] = [];
  relevantEdges.forEach((edge) => {
    const key = `${edge.source}->${edge.target}`;
    if (!edgeKeySet.has(key)) {
      edgeKeySet.add(key);
      uniqueEdges.push(edge);
    }
  });

  return {
    nodes: Array.from(nodeMap.values()),
    edges: uniqueEdges,
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

  // If was previously marked as deleted, unmark it
  if (Array.isArray(db.deletedDossierSlugs)) {
    db.deletedDossierSlugs = db.deletedDossierSlugs.filter((s: string) => s !== slug && s !== payload.id);
  }

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

// Update an existing dossier in SQLite db (title, description, category, thumbnail, tags, etc.)
export function updateDossier(
  idOrSlug: string,
  updates: Partial<Dossier>,
  db: any,
  saveDbFn: (db: any) => void
): Dossier | null {
  if (!db.customDossiers) db.customDossiers = [];
  const allDossiers = getAllDossiers(db.customDossiers, db.deletedDossierSlugs || []);
  const existing = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!existing) return null;

  const customIndex = db.customDossiers.findIndex(
    (d: Dossier) => d.id === idOrSlug || d.slug === idOrSlug || d.title.toLowerCase() === existing.title.toLowerCase()
  );

  const updatedDocs = Array.isArray(updates.documents) ? updates.documents : existing.documents;
  const dates = updatedDocs.map((d) => d.datum).filter(Boolean) as string[];
  dates.sort();

  const updated: Dossier = {
    ...existing,
    ...updates,
    slug: updates.title && updates.title !== existing.title ? slugify(updates.title) : existing.slug,
    documents: updatedDocs,
    documentCount: updatedDocs.length,
    uploadedCount: updatedDocs.filter((d) => d.fileExists).length,
    dateRange: {
      start: dates[0] || null,
      end: dates[dates.length - 1] || null,
    },
    isCustom: true,
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

// Delete a dossier (soft delete via deletedDossierSlugs + remove from customDossiers)
export function deleteDossier(
  idOrSlug: string,
  db: any,
  saveDbFn: (db: any) => void
): boolean {
  if (!db.deletedDossierSlugs) db.deletedDossierSlugs = [];
  if (!db.customDossiers) db.customDossiers = [];

  const allDossiers = getAllDossiers(db.customDossiers, db.deletedDossierSlugs);
  const matched = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!matched) return false;

  if (!db.deletedDossierSlugs.includes(matched.slug)) {
    db.deletedDossierSlugs.push(matched.slug);
  }
  if (!db.deletedDossierSlugs.includes(matched.id)) {
    db.deletedDossierSlugs.push(matched.id);
  }

  db.customDossiers = db.customDossiers.filter((d: Dossier) => d.id !== matched.id && d.slug !== matched.slug);
  saveDbFn(db);
  return true;
}

// Add a document manually to a dossier
export function addDocumentToDossier(
  idOrSlug: string,
  docData: Partial<DossierDocument> & { titel: string; bestandsnaam: string },
  db: any,
  saveDbFn: (db: any) => void
): { dossier: Dossier; document: DossierDocument } | null {
  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || []);
  const dossier = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!dossier) return null;

  const cleanFilename = path.basename(docData.bestandsnaam.trim());
  const fileCheck = checkFileExists(cleanFilename);

  const newDoc: DossierDocument = {
    id: `doc-manual-${Date.now()}-${slugify(cleanFilename)}`,
    bestandsnaam: cleanFilename,
    titel: docData.titel.trim(),
    dossier: dossier.title,
    datum: docData.datum || new Date().toISOString().split("T")[0],
    entiteiten: Array.isArray(docData.entiteiten)
      ? docData.entiteiten
      : typeof docData.entiteiten === "string"
      ? (docData.entiteiten as string).split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    relaties: Array.isArray(docData.relaties)
      ? docData.relaties
      : typeof docData.relaties === "string"
      ? (docData.relaties as string).split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    fileExists: fileCheck.exists,
    fileUrl: fileCheck.fileUrl,
    fileSize: fileCheck.fileSize,
    uploadedAt: fileCheck.exists ? new Date().toISOString() : undefined,
  };

  // Avoid duplicates with same bestandsnaam; if exists, update it
  const existingDocIdx = dossier.documents.findIndex((d) => d.bestandsnaam === cleanFilename);
  const updatedDocuments = [...dossier.documents];

  if (existingDocIdx >= 0) {
    updatedDocuments[existingDocIdx] = {
      ...updatedDocuments[existingDocIdx],
      ...newDoc,
    };
  } else {
    updatedDocuments.unshift(newDoc);
  }

  const updatedDossier = updateDossier(
    idOrSlug,
    {
      documents: updatedDocuments,
      updatedAt: new Date().toISOString(),
    },
    db,
    saveDbFn
  );

  if (!updatedDossier) return null;
  return { dossier: updatedDossier, document: newDoc };
}

// Update a specific document inside a dossier
export function updateDocumentInDossier(
  idOrSlug: string,
  docIdOrFilename: string,
  updates: Partial<DossierDocument>,
  db: any,
  saveDbFn: (db: any) => void
): { dossier: Dossier; document: DossierDocument } | null {
  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || []);
  const dossier = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!dossier) return null;

  const docIdx = dossier.documents.findIndex(
    (d) => d.id === docIdOrFilename || d.bestandsnaam === docIdOrFilename
  );
  if (docIdx < 0) return null;

  const existingDoc = dossier.documents[docIdx];
  const targetFilename = updates.bestandsnaam ? path.basename(updates.bestandsnaam.trim()) : existingDoc.bestandsnaam;
  const fileCheck = checkFileExists(targetFilename);

  const updatedDoc: DossierDocument = {
    ...existingDoc,
    ...updates,
    bestandsnaam: targetFilename,
    titel: updates.titel !== undefined ? updates.titel.trim() : existingDoc.titel,
    datum: updates.datum !== undefined ? updates.datum : existingDoc.datum,
    entiteiten: Array.isArray(updates.entiteiten)
      ? updates.entiteiten
      : typeof updates.entiteiten === "string"
      ? (updates.entiteiten as string).split(",").map((s) => s.trim()).filter(Boolean)
      : existingDoc.entiteiten,
    relaties: Array.isArray(updates.relaties)
      ? updates.relaties
      : typeof updates.relaties === "string"
      ? (updates.relaties as string).split(",").map((s) => s.trim()).filter(Boolean)
      : existingDoc.relaties,
    fileExists: fileCheck.exists,
    fileUrl: fileCheck.fileUrl || existingDoc.fileUrl,
    fileSize: fileCheck.fileSize || existingDoc.fileSize,
  };

  const updatedDocuments = [...dossier.documents];
  updatedDocuments[docIdx] = updatedDoc;

  const updatedDossier = updateDossier(
    idOrSlug,
    {
      documents: updatedDocuments,
      updatedAt: new Date().toISOString(),
    },
    db,
    saveDbFn
  );

  if (!updatedDossier) return null;
  return { dossier: updatedDossier, document: updatedDoc };
}

// Remove / unlink a document from a dossier
export function removeDocumentFromDossier(
  idOrSlug: string,
  docIdOrFilename: string,
  db: any,
  saveDbFn: (db: any) => void
): Dossier | null {
  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || []);
  const dossier = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!dossier) return null;

  const filteredDocuments = dossier.documents.filter(
    (d) => d.id !== docIdOrFilename && d.bestandsnaam !== docIdOrFilename
  );

  return updateDossier(
    idOrSlug,
    {
      documents: filteredDocuments,
      updatedAt: new Date().toISOString(),
    },
    db,
    saveDbFn
  );
}

// Link multiple existing documents to a dossier (relaties versterken)
export function linkDocumentsToDossier(
  idOrSlug: string,
  docsToLink: DossierDocument[],
  db: any,
  saveDbFn: (db: any) => void
): Dossier | null {
  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || []);
  const dossier = allDossiers.find((d) => d.id === idOrSlug || d.slug === idOrSlug);
  if (!dossier) return null;

  const currentMap = new Map<string, DossierDocument>();
  dossier.documents.forEach((d) => currentMap.set(d.bestandsnaam, d));

  docsToLink.forEach((d) => {
    const check = checkFileExists(d.bestandsnaam);
    currentMap.set(d.bestandsnaam, {
      ...d,
      dossier: dossier.title,
      fileExists: check.exists,
      fileUrl: check.fileUrl || d.fileUrl,
      fileSize: check.fileSize || d.fileSize,
    });
  });

  const updatedDocuments = Array.from(currentMap.values());
  return updateDossier(
    idOrSlug,
    {
      documents: updatedDocuments,
      updatedAt: new Date().toISOString(),
    },
    db,
    saveDbFn
  );
}

// Catalog of all unique documents across all dossiers
export function getAllCatalogDocuments(db: any): DossierDocument[] {
  const allDossiers = getAllDossiers(db.customDossiers || [], db.deletedDossierSlugs || []);
  const map = new Map<string, DossierDocument>();

  allDossiers.forEach((dossier) => {
    dossier.documents.forEach((doc) => {
      if (!map.has(doc.bestandsnaam)) {
        map.set(doc.bestandsnaam, doc);
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => {
    if (!a.datum && !b.datum) return a.titel.localeCompare(b.titel);
    if (!a.datum) return 1;
    if (!b.datum) return -1;
    return new Date(b.datum).getTime() - new Date(a.datum).getTime();
  });
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
    const fn = (item.bestandsnaam || "").toLowerCase().trim();
    if (fn) {
      metadataByFilename.set(fn, item);
      try {
        metadataByFilename.set(decodeURIComponent(fn), item);
      } catch (_e) {
        // Fallback to non-decoded filename
      }
    }
  });

  const matchedDocuments: Array<{ filename: string; dossier: string; title: string }> = [];
  const unmatchedDocuments: string[] = [];

  uploadedFiles.forEach((file) => {
    const rawName = file.originalname || file.filename || "onbekend.pdf";
    const lowerName = rawName.toLowerCase().trim();

    // Mirror to dist directory as well
    const pubPath = path.join(DOCUMENTS_DIR, rawName);
    try {
      syncFileFn(pubPath);
    } catch (syncErr) {
      console.warn("Could not sync file to dist:", syncErr);
    }

    let match = metadataByFilename.get(lowerName);
    if (!match) {
      try {
        match = metadataByFilename.get(decodeURIComponent(lowerName));
      } catch (_e) {
        // Fallback to direct name
      }
    }

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

