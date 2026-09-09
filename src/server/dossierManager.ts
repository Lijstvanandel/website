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
const DOSSIER_PRESETS: Record<
  string,
  {
    category: string;
    thumbnail: string;
    description: string;
    wijkSlug?: string;
    wijkNaam?: string;
  }
> = {
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
    description: "Masterplan en stichtingskosten voor het nieuwe museum Steenwijkerland en de Spijkervetstallen.",
    wijkSlug: "centrum-steenwijk",
    wijkNaam: "Centrum Steenwijk"
  },
  "Handhaving en Vergunningplicht IceBear": {
    category: "Milieu & Handhaving",
    thumbnail: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80",
    description: "Handhavingsverzoeken, geur- en emissiemetingen, GGD-gezondheidsadviezen en collegebesluiten aangaande IceBear Steenwijk.",
    wijkSlug: "groot-verlaat",
    wijkNaam: "Groot Verlaat"
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
    description: "Programmeringsafspraken met de provincie Overijssel en locatieonderzoeken voor windturbines (o.a. Groot Verlaat).",
    wijkSlug: "groot-verlaat",
    wijkNaam: "Groot Verlaat"
  },
  "Zonne-energie": {
    category: "Energie & Duurzaamheid",
    thumbnail: "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80",
    description: "Aanvragen en inpassing van zonneparken (o.a. De Hoop Blokzijl en Eeserwold) inclusief participatie en landschapsplannen.",
    wijkSlug: "blokzijl",
    wijkNaam: "Blokzijl"
  },
  "Gebiedsontwikkeling": {
    category: "Ruimte & Wonen",
    thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80",
    description: "Ambitiedocument Spoorzone Steenwijk 2040, Gebiedsvisie Steenwijk Oost ('Het Vrije Veld') en centrumontwikkeling.",
    wijkSlug: "oostermeenthe",
    wijkNaam: "Oostermeenthe"
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
    description: "Bestemmingsplannen voor kernen en buitengebied (o.a. Willemsoord, Giethoorn, Sint Jansklooster en Zuidveen).",
    wijkSlug: "giethoorn",
    wijkNaam: "Giethoorn"
  },
  "Openbare ruimte": {
    category: "Beheer & Infrastructuur",
    thumbnail: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=800&auto=format&fit=crop&q=80",
    description: "Beschoeiing Belt-Schutsloot, parkeerbeleid bezoekerscentrum Natuurmonumenten en onderhoud van de fysieke leefomgeving.",
    wijkSlug: "belt-schutsloot",
    wijkNaam: "Belt-Schutsloot"
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
  const dossierMap = new Map<string, { title: string; docs: DossierDocument[] }>();

  // Group metadata by canonical slug so case differences don't create duplicate dossiers
  metadataList.forEach((item, index) => {
    const rawDossier = (item.dossier || "Overig").trim();
    const slug = slugify(rawDossier) || "overig";
    if (!dossierMap.has(slug)) {
      dossierMap.set(slug, { title: rawDossier, docs: [] });
    } else {
      // Keep nicer title (prefer capital letters / Title Case)
      const existing = dossierMap.get(slug)!;
      if (rawDossier !== existing.title && /[A-Z]/.test(rawDossier) && !/[A-Z]/.test(existing.title)) {
        existing.title = rawDossier;
      }
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

    dossierMap.get(slug)!.docs.push(doc);
  });

  let dossiers: Dossier[] = [];

  // Transform grouped items into Dossier entities
  for (const [slug, group] of dossierMap.entries()) {
    const title = group.title;
    const docs = group.docs;

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

    const presetKey = Object.keys(DOSSIER_PRESETS).find(
      (k) => k.toLowerCase() === title.toLowerCase() || slugify(k) === slug
    );
    const preset = (presetKey ? DOSSIER_PRESETS[presetKey] : undefined) || {
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
      id: slug,
      title: title,
      slug: slug,
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
      wijkSlug: preset.wijkSlug,
      wijkNaam: preset.wijkNaam,
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

// Get subnetwork graph for a specific dossier - ONLY documents connected to each other
export function getDossierGraph(dossierTitleOrSlug: string, db?: any): NetworkGraphData {
  const allDossiers = getAllDossiers(db?.customDossiers || [], db?.deletedDossierSlugs || []);
  const matchedDossier = allDossiers.find(
    (d) => d.id === dossierTitleOrSlug || d.slug === dossierTitleOrSlug || d.title.toLowerCase() === dossierTitleOrSlug.toLowerCase()
  );

  const fullGraph = getRawNetworkGraph();
  if (!matchedDossier || !matchedDossier.documents || matchedDossier.documents.length === 0) {
    return { nodes: [], edges: [] };
  }

  const docs = matchedDossier.documents;
  const docFileNames = new Set(docs.map((d) => d.bestandsnaam));
  const docEdgesMap = new Map<string, { source: string; target: string; reasons: string[] }>();

  // Map intermediary targets (legislation, references, relations) to documents in this dossier
  const targetToDocs = new Map<string, Set<string>>();
  fullGraph.edges.forEach((e) => {
    if (docFileNames.has(e.source)) {
      if (!targetToDocs.has(e.target)) targetToDocs.set(e.target, new Set());
      targetToDocs.get(e.target)!.add(e.source);
    }
  });

  // 1. Connect documents that share references, legislation, or joint schemes
  for (const [target, docSet] of targetToDocs.entries()) {
    const matchingDocs = Array.from(docSet);
    if (matchingDocs.length > 1) {
      for (let i = 0; i < matchingDocs.length; i++) {
        for (let j = i + 1; j < matchingDocs.length; j++) {
          const key = [matchingDocs[i], matchingDocs[j]].sort().join("|||");
          if (!docEdgesMap.has(key)) {
            docEdgesMap.set(key, { source: matchingDocs[i], target: matchingDocs[j], reasons: [] });
          }
          docEdgesMap.get(key)!.reasons.push(target);
        }
      }
    }
  }

  // 2. Connect documents via direct mentions in relaties
  docs.forEach((docA) => {
    const relStr = Array.isArray(docA.relaties)
      ? docA.relaties.join(" ")
      : typeof docA.relaties === "string"
      ? docA.relaties
      : "";
    docs.forEach((docB) => {
      if (docA.bestandsnaam !== docB.bestandsnaam) {
        if (relStr && (relStr.includes(docB.bestandsnaam) || (docB.titel && relStr.includes(docB.titel)))) {
          const key = [docA.bestandsnaam, docB.bestandsnaam].sort().join("|||");
          if (!docEdgesMap.has(key)) {
            docEdgesMap.set(key, { source: docA.bestandsnaam, target: docB.bestandsnaam, reasons: [] });
          }
          docEdgesMap.get(key)!.reasons.push("Directe verwijzing");
        }
      }
    });
  });

  // 3. Connect documents that share significant entities/topics
  docs.forEach((docA, idxA) => {
    const entA = (Array.isArray(docA.entiteiten) ? docA.entiteiten : [])
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 3);
    for (let idxB = idxA + 1; idxB < docs.length; idxB++) {
      const docB = docs[idxB];
      const entB = (Array.isArray(docB.entiteiten) ? docB.entiteiten : [])
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 3);
      const common = entA.filter((e) => entB.includes(e));
      if (common.length > 0) {
        const key = [docA.bestandsnaam, docB.bestandsnaam].sort().join("|||");
        if (!docEdgesMap.has(key)) {
          docEdgesMap.set(key, { source: docA.bestandsnaam, target: docB.bestandsnaam, reasons: [] });
        }
        docEdgesMap.get(key)!.reasons.push(`Gedeeld onderwerp: ${common.slice(0, 2).join(", ")}`);
      }
    }
  });

  // 4. If multiple documents exist in this dossier and some have no connections, link sequentially in procedural order
  if (docs.length > 1) {
    for (let i = 0; i < docs.length - 1; i++) {
      const key = [docs[i].bestandsnaam, docs[i + 1].bestandsnaam].sort().join("|||");
      if (!docEdgesMap.has(key)) {
        docEdgesMap.set(key, {
          source: docs[i].bestandsnaam,
          target: docs[i + 1].bestandsnaam,
          reasons: ["Procedurele opvolging"],
        });
      }
    }
  }

  // Format edges with clean descriptive labels
  const formattedEdges: GraphEdge[] = Array.from(docEdgesMap.values()).map((e) => {
    const uniqueReasons = Array.from(new Set(e.reasons));
    const primary = uniqueReasons[0] || "Verbonden document";
    return {
      source: e.source,
      target: e.target,
      label: uniqueReasons.length > 1 ? `${primary} (+${uniqueReasons.length - 1})` : primary,
      reasons: uniqueReasons,
    };
  });

  // Determine connected document IDs
  const connectedDocIds = new Set<string>();
  formattedEdges.forEach((e) => {
    connectedDocIds.add(e.source);
    connectedDocIds.add(e.target);
  });

  // Return ONLY documents that are connected to each other (or single document if dossier only has 1 document)
  const finalDocNodes: GraphNode[] = docs
    .filter((d) => connectedDocIds.has(d.bestandsnaam) || docs.length === 1)
    .map((d) => ({
      id: d.bestandsnaam,
      label: d.titel || d.bestandsnaam,
      group: matchedDossier.title,
      type: "Raadsstuk",
      date: d.datum || null,
      dossier: matchedDossier.title,
      bestandsnaam: d.bestandsnaam,
    }));

  return {
    nodes: finalDocNodes,
    edges: formattedEdges,
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
    wijkSlug: payload.wijkSlug,
    wijkNaam: payload.wijkNaam,
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

const METADATA_CSV_PATH = path.join(process.cwd(), "public", "data", "raadsstukken_metadata_tussentijds.csv");
const DIST_DATA_DIR = path.join(process.cwd(), "dist", "data");
const DIST_METADATA_PATH = path.join(DIST_DATA_DIR, "raadsstukken_metadata_tussentijds.json");
const DIST_GRAPH_PATH = path.join(DIST_DATA_DIR, "network_graph.json");

// Helper to parse CSV lines with quote support
export function parseMetadataCsv(csvContent: string): RaadsstukMetadata[] {
  const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detect delimiter: semicolon or comma
  const firstLine = lines[0];
  const delimiter = firstLine.includes(";") ? ";" : ",";

  function parseLine(line: string): string[] {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const header = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/["']/g, "").trim());
  const bestandsnaamIdx = header.findIndex((h) => h === "bestandsnaam" || h === "bestand" || h === "filename");
  const titelIdx = header.findIndex((h) => h === "titel" || h === "title");
  const dossierIdx = header.findIndex((h) => h === "dossier" || h === "onderwerp" || h === "thema");
  const datumIdx = header.findIndex((h) => h === "datum" || h === "date");
  const entiteitenIdx = header.findIndex((h) => h === "entiteiten" || h === "entities" || h === "tags");
  const relatiesIdx = header.findIndex((h) => h === "relaties" || h === "relations" || h === "referenties");
  const wijkIdx = header.findIndex((h) => h === "wijk_of_kern" || h === "wijk" || h === "kern");

  const itemMap = new Map<string, RaadsstukMetadata>();
  let duplicateCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const bestandsnaam = (cols[bestandsnaamIdx >= 0 ? bestandsnaamIdx : 0] || "").trim();
    if (!bestandsnaam) continue;

    const key = bestandsnaam.toLowerCase();
    if (itemMap.has(key)) {
      duplicateCount++;
    }

    const item: RaadsstukMetadata = {
      bestandsnaam,
      titel: cols[titelIdx >= 0 ? titelIdx : 1] || bestandsnaam.replace(/\.pdf$/i, ""),
      dossier: cols[dossierIdx >= 0 ? dossierIdx : 2] || "Algemeen",
      datum: cols[datumIdx >= 0 ? datumIdx : 3] || null,
      entiteiten: cols[entiteitenIdx >= 0 ? entiteitenIdx : 4] || "",
      relaties: cols[relatiesIdx >= 0 ? relatiesIdx : 5] || "",
    };

    if (wijkIdx >= 0 && cols[wijkIdx]) {
      item.wijk_of_kern = cols[wijkIdx];
    }
    itemMap.set(key, item);
  }

  const items = Array.from(itemMap.values());
  return items;
}

// Rebuild network graph from metadata items
export function rebuildNetworkGraph(items: RaadsstukMetadata[]): NetworkGraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();

  items.forEach((item) => {
    const fn = (item.bestandsnaam || "").trim();
    if (!fn) return;

    if (!nodeIds.has(fn)) {
      nodes.push({
        id: fn,
        label: (item.titel || fn).trim(),
        group: (item.dossier || "Algemeen").trim(),
        type: "Raadsstuk",
        date: item.datum || null,
      });
      nodeIds.add(fn);
    }

    const rels = item.relaties || "";
    if (rels) {
      const parts = rels.split(",").map((r) => r.trim()).filter(Boolean);
      parts.forEach((r) => {
        if (!nodeIds.has(r)) {
          nodes.push({
            id: r,
            label: r,
            group: "Referentie",
            type: "Relatie",
            date: null,
          });
          nodeIds.add(r);
        }
        edges.push({
          source: fn,
          target: r,
        });
      });
    }
  });

  const graph: NetworkGraphData = { nodes, edges };

  // Write to public/data/network_graph.json
  try {
    fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2), "utf-8");
    if (!fs.existsSync(DIST_DATA_DIR)) {
      fs.mkdirSync(DIST_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DIST_GRAPH_PATH, JSON.stringify(graph, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving updated network graph:", err);
  }

  return graph;
}

// Process updated metadata or graph file upload
export function processMetadataOrGraphUpload(
  fileContent: string,
  filename: string
): { success: boolean; type: "csv" | "metadata-json" | "network-graph"; itemsCount?: number; nodesCount?: number; edgesCount?: number; message: string } {
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith(".csv")) {
    const items = parseMetadataCsv(fileContent);
    if (items.length === 0) {
      throw new Error("Geen geldige raadsstukken rijen gevonden in de geüploade CSV.");
    }

    // Save CSV
    fs.writeFileSync(METADATA_CSV_PATH, fileContent, "utf-8");
    if (!fs.existsSync(DIST_DATA_DIR)) {
      fs.mkdirSync(DIST_DATA_DIR, { recursive: true });
    }
    try {
      fs.writeFileSync(path.join(DIST_DATA_DIR, path.basename(METADATA_CSV_PATH)), fileContent, "utf-8");
    } catch (e) {
      console.warn("Could not write CSV to dist:", e);
    }

    // Save JSON
    fs.writeFileSync(METADATA_PATH, JSON.stringify(items, null, 2), "utf-8");
    try {
      fs.writeFileSync(DIST_METADATA_PATH, JSON.stringify(items, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not write JSON to dist:", e);
    }

    // Rebuild network graph automatically
    const graph = rebuildNetworkGraph(items);

    return {
      success: true,
      type: "csv",
      itemsCount: items.length,
      nodesCount: graph.nodes.length,
      edgesCount: graph.edges.length,
      message: `${items.length} documenten ingelezen en opgeslagen. Netwerkgraaf automatisch bijgewerkt met ${graph.nodes.length} knooppunten en ${graph.edges.length} relaties.`,
    };
  } else if (lowerName.includes("network_graph") || lowerName.includes("graph")) {
    // Network graph JSON
    const parsed = JSON.parse(fileContent);
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      throw new Error("Ongeldig network_graph.json formaat: 'nodes' en 'edges' arrays ontbreken.");
    }

    fs.writeFileSync(GRAPH_PATH, JSON.stringify(parsed, null, 2), "utf-8");
    if (!fs.existsSync(DIST_DATA_DIR)) {
      fs.mkdirSync(DIST_DATA_DIR, { recursive: true });
    }
    try {
      fs.writeFileSync(DIST_GRAPH_PATH, JSON.stringify(parsed, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not write graph to dist:", e);
    }

    return {
      success: true,
      type: "network-graph",
      nodesCount: parsed.nodes.length,
      edgesCount: parsed.edges.length,
      message: `Netwerkgraaf succesvol bijgewerkt met ${parsed.nodes.length} knooppunten en ${parsed.edges.length} relaties.`,
    };
  } else {
    // Metadata JSON
    const parsed = JSON.parse(fileContent);
    const items: RaadsstukMetadata[] = Array.isArray(parsed) ? parsed : parsed.items || [];
    if (items.length === 0) {
      throw new Error("Ongeldig metadata JSON formaat: geen document array gevonden.");
    }

    fs.writeFileSync(METADATA_PATH, JSON.stringify(items, null, 2), "utf-8");
    if (!fs.existsSync(DIST_DATA_DIR)) {
      fs.mkdirSync(DIST_DATA_DIR, { recursive: true });
    }
    try {
      fs.writeFileSync(DIST_METADATA_PATH, JSON.stringify(items, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not write metadata JSON to dist:", e);
    }

    const graph = rebuildNetworkGraph(items);

    return {
      success: true,
      type: "metadata-json",
      itemsCount: items.length,
      nodesCount: graph.nodes.length,
      edgesCount: graph.edges.length,
      message: `${items.length} documenten bijgewerkt via metadata JSON. Netwerkgraaf gesynchroniseerd.`,
    };
  }
}


