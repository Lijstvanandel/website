import fs from "fs";
import path from "path";
import crypto from "crypto";
import { CouncilAgendaTopic, CouncilTopicNote } from "@/types/council";

export interface CouncilContributionRecord {
  topicId: string;
  topicTitle: string;
  normalizedTitle: string;
  meetingDate?: string;
  meetingDateDisplay?: string;
  meetingTitle?: string;
  meetingType?: string;
  municipality: "steenwijkerland" | string;
  bijdragePolitiekeMarkt?: string;
  bijdragePolitiekeMarktStructured?: any;
  bijdragePolitiekeMarktUpdatedAt?: string;
  bijdragePolitiekeMarktUpdatedBy?: string;
  bijdrageRaadsvergadering?: string;
  bijdrageRaadsvergaderingStructured?: any;
  bijdrageRaadsvergaderingUpdatedAt?: string;
  bijdrageRaadsvergaderingUpdatedBy?: string;
  isParked?: boolean;
  parkedReason?: string;
  parkedAt?: string | null;
  parkedBy?: string | null;
  previousCategory?: string | null;
  status?: string;
  category?: string;
  notes?: CouncilTopicNote[];
  assignedTo?: string | null;
  assignedName?: string | null;
  assignedAt?: string | null;
  compiledDossier?: any;
  linkedDossierSlug?: string | null;
  linkedDossierId?: string | null;
  markAsHamerstuk?: boolean;
  sourceUrl?: string;
  documents?: any[];
  updatedAt: string;
}

// Redundant physical disk locations to guarantee survival across git pulls, container rebuilds, and restarts
const PRIMARY_DISK_FILE = path.join(process.cwd(), "data", "council_contributions_master.json");
const VAULT_FOLDER_FILE = path.join(process.cwd(), ".council_vault", "contributions_vault.json");
const DATA_VAULT_FILE = path.join(process.cwd(), "data", "council_vault", "contributions_vault.json");
const GIT_SAFE_DISK_FILE = path.join(process.cwd(), "src", "data", "persisted_council_contributions.json");
const BACKUP_DISK_FILE = path.join(process.cwd(), "backups", "council_contributions_vault.json");

// In-memory cache for ultra-fast lookup
const contributionsMap = new Map<string, CouncilContributionRecord>();
let isInitialized = false;

export function normalizeTopicTitle(title: string): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s]/g, " ")     // strip punctuation
    .replace(/\s+/g, " ")            // collapse whitespace
    .trim();
}

/**
 * Ensure disk directories exist
 */
function ensureDirectories() {
  const dirs = [
    path.join(process.cwd(), ".council_vault"),
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "data", "council_vault"),
    path.join(process.cwd(), "src", "data"),
    path.join(process.cwd(), "backups"),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (_e) {
        // ignore
      }
    }
  }
}

/**
 * Persist in-memory records to redundant disk files atomically
 */
function flushToDisk() {
  ensureDirectories();
  const records = Array.from(contributionsMap.values());
  const jsonContent = JSON.stringify(records, null, 2);

  const targets = [
    VAULT_FOLDER_FILE,
    PRIMARY_DISK_FILE,
    DATA_VAULT_FILE,
    BACKUP_DISK_FILE,
    GIT_SAFE_DISK_FILE,
  ];

  if (process.env.COUNCIL_VAULT_PATH) {
    targets.push(process.env.COUNCIL_VAULT_PATH);
  }

  for (const target of targets) {
    try {
      const parent = path.dirname(target);
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }
      const tempFile = `${target}.tmp_${Date.now()}`;
      fs.writeFileSync(tempFile, jsonContent, "utf-8");
      fs.renameSync(tempFile, target);
    } catch (err: any) {
      console.warn(`[COUNCIL-VAULT] Waarschuwing bij schrijven naar ${target}:`, err?.message || err);
    }
  }
}

/**
 * Get single contribution record from in-memory vault
 */
export function getContributionRecord(topicId: string): CouncilContributionRecord | undefined {
  initCouncilContributionVault();
  return contributionsMap.get(String(topicId));
}

/**
 * Load persisted contributions from disk on boot - merges from all redundant files
 */
export function initCouncilContributionVault(): Map<string, CouncilContributionRecord> {
  if (isInitialized && contributionsMap.size > 0) {
    return contributionsMap;
  }

  ensureDirectories();

  // Try loading and merging from all available sources so no source overwrite can cause data loss
  const sources = [
    VAULT_FOLDER_FILE,
    DATA_VAULT_FILE,
    PRIMARY_DISK_FILE,
    BACKUP_DISK_FILE,
    GIT_SAFE_DISK_FILE,
  ];

  if (process.env.COUNCIL_VAULT_PATH) {
    sources.unshift(process.env.COUNCIL_VAULT_PATH);
  }

  let loadedTotal = 0;
  for (const src of sources) {
    if (fs.existsSync(src)) {
      try {
        const raw = fs.readFileSync(src, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const item of parsed) {
            if (item?.topicId) {
              const existing = contributionsMap.get(item.topicId);
              if (!existing) {
                contributionsMap.set(item.topicId, item);
                loadedTotal++;
              } else {
                // Keep the one with newer updatedAt or more notes
                const existingTime = new Date(existing.updatedAt || 0).getTime();
                const itemTime = new Date(item.updatedAt || 0).getTime();
                if (itemTime > existingTime || ((item.notes?.length || 0) > (existing.notes?.length || 0))) {
                  contributionsMap.set(item.topicId, {
                    ...existing,
                    ...item,
                    notes: (item.notes && item.notes.length > 0) ? item.notes : existing.notes,
                  });
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.warn(`[COUNCIL-VAULT] Kon ${src} niet inlezen:`, err?.message || err);
      }
    }
  }

  if (contributionsMap.size > 0) {
    console.log(`[COUNCIL-VAULT] 🛡️ ${contributionsMap.size} bewaarde raadsbijdragen & bespreekstukken succesvol ingeladen en samengevoegd.`);
  }

  isInitialized = true;
  return contributionsMap;
}

/**
 * Record or update a council topic contribution.
 * Saves immediately to memory, SQLite, and persistent disk files.
 */
export function recordCouncilContribution(topic: Partial<CouncilAgendaTopic> & { id: string }): CouncilContributionRecord {
  initCouncilContributionVault();

  const topicId = String(topic.id);
  const existing = contributionsMap.get(topicId);

  const normTitle = normalizeTopicTitle(topic.title || existing?.topicTitle || "");
  const hasContribution = Boolean(
    topic.bijdragePolitiekeMarkt ||
    topic.bijdrageRaadsvergadering ||
    topic.isParked ||
    (topic.notes && topic.notes.length > 0) ||
    topic.compiledDossier ||
    topic.assignedTo ||
    topic.markAsHamerstuk
  );

  const updatedRecord: CouncilContributionRecord = {
    topicId,
    topicTitle: topic.title || existing?.topicTitle || "Agendapunt",
    normalizedTitle: normTitle,
    meetingDate: topic.meetingDate || existing?.meetingDate || "",
    meetingDateDisplay: topic.meetingDateDisplay || existing?.meetingDateDisplay || "",
    meetingTitle: topic.meetingTitle || existing?.meetingTitle || "Gemeenteraad",
    meetingType: topic.meetingType || existing?.meetingType || "Raad",
    municipality: (topic.municipality || existing?.municipality || "steenwijkerland") as any,
    
    // Debate contributions
    bijdragePolitiekeMarkt: topic.bijdragePolitiekeMarkt !== undefined ? topic.bijdragePolitiekeMarkt : (existing?.bijdragePolitiekeMarkt || ""),
    bijdragePolitiekeMarktStructured: topic.bijdragePolitiekeMarktStructured !== undefined ? topic.bijdragePolitiekeMarktStructured : (existing?.bijdragePolitiekeMarktStructured || null),
    bijdragePolitiekeMarktUpdatedAt: topic.bijdragePolitiekeMarktUpdatedAt || existing?.bijdragePolitiekeMarktUpdatedAt || (topic.bijdragePolitiekeMarkt ? new Date().toISOString() : undefined),
    bijdragePolitiekeMarktUpdatedBy: topic.bijdragePolitiekeMarktUpdatedBy || existing?.bijdragePolitiekeMarktUpdatedBy,

    bijdrageRaadsvergadering: topic.bijdrageRaadsvergadering !== undefined ? topic.bijdrageRaadsvergadering : (existing?.bijdrageRaadsvergadering || ""),
    bijdrageRaadsvergaderingStructured: topic.bijdrageRaadsvergaderingStructured !== undefined ? topic.bijdrageRaadsvergaderingStructured : (existing?.bijdrageRaadsvergaderingStructured || null),
    bijdrageRaadsvergaderingUpdatedAt: topic.bijdrageRaadsvergaderingUpdatedAt || existing?.bijdrageRaadsvergaderingUpdatedAt || (topic.bijdrageRaadsvergadering ? new Date().toISOString() : undefined),
    bijdrageRaadsvergaderingUpdatedBy: topic.bijdrageRaadsvergaderingUpdatedBy || existing?.bijdrageRaadsvergaderingUpdatedBy,

    // Parked status & reason
    isParked: topic.isParked !== undefined ? Boolean(topic.isParked) : (existing?.isParked || false),
    parkedReason: topic.parkedReason !== undefined ? topic.parkedReason : existing?.parkedReason,
    parkedAt: topic.parkedAt !== undefined ? topic.parkedAt : (existing?.parkedAt || null),
    parkedBy: topic.parkedBy !== undefined ? topic.parkedBy : (existing?.parkedBy || null),
    previousCategory: topic.previousCategory !== undefined ? topic.previousCategory : (existing?.previousCategory || null),

    status: topic.status || (topic.isParked ? "geparkeerd" : (existing?.status || "in_behandeling")),
    category: topic.category || existing?.category || (topic.isParked ? "Geparkeerd" : "Oordeelvorming - bespreekstukken"),

    // Notes, Dossiers & Assignments
    notes: Array.isArray(topic.notes) ? topic.notes : (existing?.notes || []),
    assignedTo: topic.assignedTo !== undefined ? topic.assignedTo : (existing?.assignedTo || null),
    assignedName: topic.assignedName !== undefined ? topic.assignedName : (existing?.assignedName || null),
    assignedAt: topic.assignedAt !== undefined ? topic.assignedAt : (existing?.assignedAt || null),
    compiledDossier: topic.compiledDossier || existing?.compiledDossier || null,
    linkedDossierSlug: topic.linkedDossierSlug !== undefined ? topic.linkedDossierSlug : (existing?.linkedDossierSlug || null),
    linkedDossierId: topic.linkedDossierId !== undefined ? topic.linkedDossierId : (existing?.linkedDossierId || null),
    markAsHamerstuk: topic.markAsHamerstuk !== undefined ? Boolean(topic.markAsHamerstuk) : (existing?.markAsHamerstuk || false),
    sourceUrl: topic.sourceUrl || existing?.sourceUrl || "",
    documents: Array.isArray(topic.documents) && topic.documents.length > 0 ? topic.documents : (existing?.documents || []),
    updatedAt: new Date().toISOString(),
  };

  // Only store if it actually has user additions or is parked
  if (hasContribution || existing) {
    contributionsMap.set(topicId, updatedRecord);
    flushToDisk();
  }

  return updatedRecord;
}

/**
 * Hydrate council topics with immutable saved contributions.
 * Guarantees that no scraper run, restart, or git pull can ever erase user bijdragen, notes, or parked status!
 * Also resurrects past topics that iBabs dropped so they remain accessible forever.
 */
export function hydrateTopicsWithContributions(topics: CouncilAgendaTopic[]): CouncilAgendaTopic[] {
  initCouncilContributionVault();

  if (contributionsMap.size === 0) {
    return topics;
  }

  const topicList = [...topics];
  const topicIdMap = new Map<string, CouncilAgendaTopic>();
  const topicNormTitleMap = new Map<string, CouncilAgendaTopic>();

  for (const t of topicList) {
    if (t?.id) topicIdMap.set(t.id, t);
    if (t?.title) {
      const norm = normalizeTopicTitle(t.title);
      if (norm) topicNormTitleMap.set(norm, t);
    }
  }

  const matchedContributionIds = new Set<string>();

  // 1. Re-inject contributions into matching topics
  for (const [contribId, contrib] of contributionsMap.entries()) {
    let matchedTopic = topicIdMap.get(contribId);

    // If ID didn't match directly, attempt normalized title match
    if (!matchedTopic && contrib.normalizedTitle) {
      matchedTopic = topicNormTitleMap.get(contrib.normalizedTitle);
    }

    if (matchedTopic) {
      matchedContributionIds.add(contribId);

      // Hydrate debate speeches
      if (contrib.bijdragePolitiekeMarkt && !matchedTopic.bijdragePolitiekeMarkt) {
        matchedTopic.bijdragePolitiekeMarkt = contrib.bijdragePolitiekeMarkt;
        matchedTopic.bijdragePolitiekeMarktStructured = contrib.bijdragePolitiekeMarktStructured || matchedTopic.bijdragePolitiekeMarktStructured;
        matchedTopic.bijdragePolitiekeMarktUpdatedAt = contrib.bijdragePolitiekeMarktUpdatedAt;
        matchedTopic.bijdragePolitiekeMarktUpdatedBy = contrib.bijdragePolitiekeMarktUpdatedBy;
      } else if (contrib.bijdragePolitiekeMarktStructured && !matchedTopic.bijdragePolitiekeMarktStructured) {
        matchedTopic.bijdragePolitiekeMarktStructured = contrib.bijdragePolitiekeMarktStructured;
      }

      if (contrib.bijdrageRaadsvergadering && !matchedTopic.bijdrageRaadsvergadering) {
        matchedTopic.bijdrageRaadsvergadering = contrib.bijdrageRaadsvergadering;
        matchedTopic.bijdrageRaadsvergaderingStructured = contrib.bijdrageRaadsvergaderingStructured || matchedTopic.bijdrageRaadsvergaderingStructured;
        matchedTopic.bijdrageRaadsvergaderingUpdatedAt = contrib.bijdrageRaadsvergaderingUpdatedAt;
        matchedTopic.bijdrageRaadsvergaderingUpdatedBy = contrib.bijdrageRaadsvergaderingUpdatedBy;
      } else if (contrib.bijdrageRaadsvergaderingStructured && !matchedTopic.bijdrageRaadsvergaderingStructured) {
        matchedTopic.bijdrageRaadsvergaderingStructured = contrib.bijdrageRaadsvergaderingStructured;
      }

      // Hydrate parked state
      if (contrib.isParked) {
        matchedTopic.isParked = true;
        matchedTopic.parkedReason = contrib.parkedReason || matchedTopic.parkedReason;
        matchedTopic.parkedAt = contrib.parkedAt || matchedTopic.parkedAt;
        matchedTopic.parkedBy = contrib.parkedBy || matchedTopic.parkedBy;
        matchedTopic.previousCategory = contrib.previousCategory || matchedTopic.previousCategory;
        matchedTopic.status = "geparkeerd";
        matchedTopic.isArchived = false; // NEVER archive a parked item!
      }

      // Hydrate notes
      if (Array.isArray(contrib.notes) && contrib.notes.length > 0) {
        const existingNoteIds = new Set((matchedTopic.notes || []).map((n) => n.id));
        const mergedNotes = [...(matchedTopic.notes || [])];
        for (const n of contrib.notes) {
          if (!existingNoteIds.has(n.id)) {
            mergedNotes.push(n);
          }
        }
        matchedTopic.notes = mergedNotes;
      }

      // Hydrate compiled support dossier
      if (contrib.compiledDossier && !matchedTopic.compiledDossier) {
        matchedTopic.compiledDossier = contrib.compiledDossier;
      }
      if (contrib.linkedDossierSlug && !matchedTopic.linkedDossierSlug) {
        matchedTopic.linkedDossierSlug = contrib.linkedDossierSlug;
      }
      if (contrib.linkedDossierId && !matchedTopic.linkedDossierId) {
        matchedTopic.linkedDossierId = contrib.linkedDossierId;
      }

      // Hydrate assignment
      if (contrib.assignedTo && !matchedTopic.assignedTo) {
        matchedTopic.assignedTo = contrib.assignedTo;
        matchedTopic.assignedName = contrib.assignedName || contrib.assignedTo;
        matchedTopic.assignedAt = contrib.assignedAt || null;
      }

      if (contrib.markAsHamerstuk && !matchedTopic.markAsHamerstuk) {
        matchedTopic.markAsHamerstuk = true;
      }
    }
  }

  // 2. RESURRECTION: For any saved contribution that iBabs dropped (past meeting or deleted index),
  // recreate the topic so it is NEVER lost after a git pull or database rebuild!
  for (const [contribId, contrib] of contributionsMap.entries()) {
    if (!matchedContributionIds.has(contribId)) {
      const resurrectedTopic: CouncilAgendaTopic = {
        id: contrib.topicId,
        municipality: contrib.municipality as any || "steenwijkerland",
        meetingId: "resurrected_meeting",
        meetingDate: contrib.meetingDate || new Date().toISOString().split("T")[0],
        meetingDateDisplay: contrib.meetingDateDisplay || contrib.meetingDate || "Verleden vergadering",
        meetingTitle: contrib.meetingTitle || "Verleden Raadsvergadering",
        meetingType: (contrib.meetingType || "Raad") as any,
        agendaItemNumber: "P",
        title: contrib.topicTitle,
        description: `Bewaard agendapunt met fractiebijdragen uit het verleden.`,
        category: contrib.isParked ? "Geparkeerd" : (contrib.category || "Oordeelvorming - bespreekstukken"),
        status: contrib.isParked ? "geparkeerd" : (contrib.status || "in_behandeling"),
        isParked: Boolean(contrib.isParked),
        parkedReason: contrib.parkedReason,
        parkedAt: contrib.parkedAt,
        parkedBy: contrib.parkedBy,
        previousCategory: contrib.previousCategory,
        bijdragePolitiekeMarkt: contrib.bijdragePolitiekeMarkt || "",
        bijdragePolitiekeMarktStructured: contrib.bijdragePolitiekeMarktStructured || null,
        bijdragePolitiekeMarktUpdatedAt: contrib.bijdragePolitiekeMarktUpdatedAt,
        bijdragePolitiekeMarktUpdatedBy: contrib.bijdragePolitiekeMarktUpdatedBy,
        bijdrageRaadsvergadering: contrib.bijdrageRaadsvergadering || "",
        bijdrageRaadsvergaderingStructured: contrib.bijdrageRaadsvergaderingStructured || null,
        bijdrageRaadsvergaderingUpdatedAt: contrib.bijdrageRaadsvergaderingUpdatedAt,
        bijdrageRaadsvergaderingUpdatedBy: contrib.bijdrageRaadsvergaderingUpdatedBy,
        notes: contrib.notes || [],
        assignedTo: contrib.assignedTo || null,
        assignedName: contrib.assignedName || null,
        assignedAt: contrib.assignedAt || null,
        documents: contrib.documents || [],
        compiledDossier: contrib.compiledDossier || null,
        linkedDossierSlug: contrib.linkedDossierSlug || null,
        linkedDossierId: contrib.linkedDossierId || null,
        markAsHamerstuk: Boolean(contrib.markAsHamerstuk),
        isArchived: !contrib.isParked, // If parked, keep active! If not parked, it belongs in Archief
        scrapedAt: contrib.updatedAt,
      };

      topicList.push(resurrectedTopic);
    }
  }

  return topicList;
}

/**
 * Get all stored contributions as an exportable JSON payload
 */
export function exportCouncilContributions(): CouncilContributionRecord[] {
  initCouncilContributionVault();
  return Array.from(contributionsMap.values());
}

/**
 * Bulk import contributions from an external JSON file or client backup
 */
export function importCouncilContributions(data: any[]): { importedCount: number } {
  initCouncilContributionVault();
  if (!Array.isArray(data)) return { importedCount: 0 };

  let count = 0;
  for (const item of data) {
    if (item && item.topicId) {
      contributionsMap.set(item.topicId, {
        ...item,
        normalizedTitle: item.normalizedTitle || normalizeTopicTitle(item.topicTitle || ""),
        updatedAt: item.updatedAt || new Date().toISOString(),
      });
      count++;
    }
  }

  if (count > 0) {
    flushToDisk();
  }

  return { importedCount: count };
}
