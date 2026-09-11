import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  FolderSync,
  AlertTriangle,
  FileSpreadsheet,
  Network,
  Trash2,
  Plus,
  Info,
  RefreshCw,
  Archive,
  Search,
  Filter,
  Layers,
  ArrowRight,
  FolderCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface DossierBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

interface MatchedDocItem {
  filename: string;
  dossier: string;
  title: string;
  category?: string;
}

export const DossierBulkUploadModal: React.FC<DossierBulkUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const { token: authContextToken } = useAuth();
  const [activeTab, setActiveTab] = useState<"documents" | "metadata">("documents");

  // Document upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [skippedDuplicatesCount, setSkippedDuplicatesCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "unpacking" | "matching" | "indexing" | "completed">("idle");
  const [uploadBytesInfo, setUploadBytesInfo] = useState<{
    loadedBytes: number;
    totalBytes: number;
    speedMbS: number;
    timeRemainingSec: number | null;
  } | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [resultFilterTab, setResultFilterTab] = useState<"all" | "matched" | "unmatched">("all");

  const [uploadResult, setUploadResult] = useState<{
    matchedCount: number;
    totalUploaded: number;
    zipCount?: number;
    extractedFromZipCount?: number;
    unmatchedCount: number;
    matchedDocuments: MatchedDocItem[];
    unmatchedDocuments?: string[];
  } | null>(null);

  // Metadata upload state
  const [selectedMetaFile, setSelectedMetaFile] = useState<File | null>(null);
  const [isUploadingMeta, setIsUploadingMeta] = useState(false);
  const [isSyncingFs, setIsSyncingFs] = useState(false);
  const [metaResult, setMetaResult] = useState<{
    itemsCount?: number;
    nodesCount?: number;
    edgesCount?: number;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const metaFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const getToken = () =>
    authContextToken ||
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  // Add files incrementally without losing previously selected files, and filter out duplicates
  const addFiles = (newFiles: FileList | File[]) => {
    const fileArr = Array.from(newFiles);
    let duplicatesDetected = 0;

    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name.toLowerCase()));
      const uniqueNew: File[] = [];

      for (const file of fileArr) {
        const lower = file.name.toLowerCase();
        if (existingNames.has(lower)) {
          duplicatesDetected++;
        } else {
          existingNames.add(lower);
          uniqueNew.push(file);
        }
      }

      return [...prev, ...uniqueNew];
    });

    if (duplicatesDetected > 0) {
      setSkippedDuplicatesCount((prev) => prev + duplicatesDetected);
      toast.info(
        `${duplicatesDetected} dubbele bestand(en) automatisch overgeslagen.`
      );
    }
    setUploadResult(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Helper to partition files into safe batches (max 4 files or max 25MB per batch, with ZIP files handled individually)
  const createBatches = (files: File[]) => {
    const batches: File[][] = [];
    let currentBatch: File[] = [];
    let currentBatchBytes = 0;
    const MAX_BATCH_BYTES = 25 * 1024 * 1024; // 25MB per batch
    const MAX_FILES_PER_BATCH = 5;

    for (const file of files) {
      const isZip = file.name.toLowerCase().endsWith(".zip");
      if (isZip) {
        // Send zip files individually to prevent timeouts
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
          currentBatch = [];
          currentBatchBytes = 0;
        }
        batches.push([file]);
        continue;
      }

      if (
        currentBatch.length > 0 &&
        (currentBatchBytes + file.size > MAX_BATCH_BYTES || currentBatch.length >= MAX_FILES_PER_BATCH)
      ) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchBytes = 0;
      }
      currentBatch.push(file);
      currentBatchBytes += file.size;
    }
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    return batches;
  };

  const hasZipFile = selectedFiles.some((f) => f.name.toLowerCase().endsWith(".zip"));

  const uploadBatchXhr = (
    batch: File[],
    token: string | null,
    onProgress: (loaded: number, total: number, speedMbS: number, remainingSec: number | null) => void
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      batch.forEach((file) => formData.append("files", file));

      const startTime = Date.now();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const now = Date.now();
          const elapsedSec = (now - startTime) / 1000;
          const currentSpeedMbS = elapsedSec > 0.2 ? (event.loaded / (1024 * 1024)) / elapsedSec : 0;

          const remainingBytes = Math.max(0, event.total - event.loaded);
          const remainingSec = currentSpeedMbS > 0 ? Math.ceil((remainingBytes / (1024 * 1024)) / currentSpeedMbS) : null;

          onProgress(event.loaded, event.total, currentSpeedMbS, remainingSec);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (e) {
            resolve({ success: true });
          }
        } else {
          let errorMsg = `Serverfout (${xhr.status})`;
          try {
            const errObj = JSON.parse(xhr.responseText);
            if (errObj.error) errorMsg = errObj.error;
          } catch {}
          if (xhr.status === 413) {
            errorMsg = "Het bestand overschrijdt de maximale servergrootte (1GB).";
          }
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Netwerkfout tijdens het uploaden. Controleer de verbinding naar de server."));
      };

      xhr.ontimeout = () => {
        reject(new Error("Upload timeout: het uploaden duurde langer dan verwacht."));
      };

      xhr.open("POST", "/api/council/dossiers/bulk-upload");
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadStage("uploading");
    setUploadProgress(1);
    setUploadBytesInfo(null);
    setUploadStatusText(`Upload voorbereiden voor ${selectedFiles.length} bestand(en)...`);

    const token = getToken();
    const batches = createBatches(selectedFiles);
    let completedFiles = 0;
    let accumulatedMatchedCount = 0;
    let accumulatedUnmatchedCount = 0;
    let accumulatedZipCount = 0;
    let accumulatedExtractedFromZipCount = 0;
    const accumulatedMatchedDocs: MatchedDocItem[] = [];
    const accumulatedUnmatchedDocs: string[] = [];

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const isCurrentZip = batch.some((f) => f.name.toLowerCase().endsWith(".zip"));
        const batchSizeBytes = batch.reduce((acc, f) => acc + f.size, 0);

        setUploadStage("uploading");
        setUploadStatusText(
          isCurrentZip
            ? `ZIP-archief uploaden (${(batchSizeBytes / (1024 * 1024)).toFixed(1)} MB)...`
            : `Deel ${i + 1} van ${batches.length} uploaden (${(batchSizeBytes / (1024 * 1024)).toFixed(1)} MB)...`
        );

        const data = await uploadBatchXhr(
          batch,
          token,
          (loaded, total, speedMbS, remainingSec) => {
            const loadedMb = (loaded / (1024 * 1024)).toFixed(1);
            const totalMb = (total / (1024 * 1024)).toFixed(1);
            const pct = Math.min(99, Math.round((loaded / total) * 100));

            setUploadBytesInfo({
              loadedBytes: loaded,
              totalBytes: total,
              speedMbS,
              timeRemainingSec: remainingSec,
            });

            if (loaded >= total) {
              setUploadStage(isCurrentZip ? "unpacking" : "matching");
              setUploadProgress(98);
              setUploadStatusText(
                isCurrentZip
                  ? `${totalMb} MB geüpload! Server is nu het ZIP-archief aan het uitpakken en structureren...`
                  : `${totalMb} MB geüpload! Server koppelt documenten aan dossiers...`
              );
            } else {
              setUploadProgress(Math.max(1, pct));
              const speedText = speedMbS > 0 ? ` • ${speedMbS.toFixed(1)} MB/s` : "";
              const etaText = remainingSec !== null && remainingSec > 0 ? ` • Nog ~${remainingSec}s` : "";
              setUploadStatusText(
                `Uploaden: ${loadedMb} MB van ${totalMb} MB (${pct}%)${speedText}${etaText}`
              );
            }
          }
        );

        setUploadStage("matching");
        setUploadStatusText(`Documenten verwerkt door server...`);

        completedFiles += batch.length;
        accumulatedMatchedCount += data.matchedCount || 0;
        accumulatedUnmatchedCount += data.unmatchedCount || 0;
        accumulatedZipCount += data.zipCount || 0;
        accumulatedExtractedFromZipCount += data.extractedFromZipCount || 0;

        if (Array.isArray(data.matchedDocuments)) {
          accumulatedMatchedDocs.push(...data.matchedDocuments);
        }
        if (Array.isArray(data.unmatchedDocuments)) {
          accumulatedUnmatchedDocs.push(...data.unmatchedDocuments);
        }
      }

      setUploadStage("indexing");
      setUploadStatusText("Zoekindex bijwerken voor directe tekstdoorzoeking...");
      setUploadProgress(99);
      await new Promise((r) => setTimeout(r, 400));

      setUploadStage("completed");
      setUploadProgress(100);

      const totalEffectiveCount =
        accumulatedExtractedFromZipCount > 0
          ? (completedFiles - accumulatedZipCount) + accumulatedExtractedFromZipCount
          : completedFiles;

      const finalResult = {
        totalUploaded: totalEffectiveCount,
        zipCount: accumulatedZipCount,
        extractedFromZipCount: accumulatedExtractedFromZipCount,
        matchedCount: accumulatedMatchedCount,
        unmatchedCount: accumulatedUnmatchedCount,
        matchedDocuments: accumulatedMatchedDocs,
        unmatchedDocuments: accumulatedUnmatchedDocs,
      };

      setUploadResult(finalResult);
      toast.success(
        `${accumulatedMatchedCount} van de ${totalEffectiveCount} documenten direct herkend en verdeeld over de dossiers!`
      );
      onUploadSuccess();
    } catch (err: any) {
      console.error("[BULK UPLOAD CLIENT ERROR]:", err);
      toast.error(err.message || "Fout bij bulk upload");
      if (completedFiles > 0) {
        setUploadResult({
          totalUploaded: completedFiles,
          zipCount: accumulatedZipCount,
          extractedFromZipCount: accumulatedExtractedFromZipCount,
          matchedCount: accumulatedMatchedCount,
          unmatchedCount: accumulatedUnmatchedCount,
          matchedDocuments: accumulatedMatchedDocs,
          unmatchedDocuments: accumulatedUnmatchedDocs,
        });
        onUploadSuccess();
      }
    } finally {
      setIsUploading(false);
      setUploadBytesInfo(null);
    }
  };

  // Upload metadata CSV or network_graph JSON
  const handleUploadMetadata = async () => {
    if (!selectedMetaFile) return;

    setIsUploadingMeta(true);
    const token = getToken();

    try {
      const formData = new FormData();
      formData.append("file", selectedMetaFile);

      const res = await fetch("/api/council/metadata/upload", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Fout bij verwerken van metadata.");
      }

      setMetaResult(data);
      toast.success(data.message || "Metadata succesvol bijgewerkt!");
      onUploadSuccess();
    } catch (err: any) {
      console.error("[METADATA UPLOAD ERROR]:", err);
      toast.error(err.message || "Fout bij uploaden van metadata");
    } finally {
      setIsUploadingMeta(false);
    }
  };

  // Sync physical files already residing on the server
  const handleSyncServerFiles = async () => {
    setIsSyncingFs(true);
    const token = getToken();
    try {
      const res = await fetch("/api/council/sync-filesystem-documents", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Fout bij synchroniseren van serverbestanden.");
      }
      setMetaResult({
        message: data.message || "Serverbestanden succesvol gesynchroniseerd!",
        itemsCount: data.metadataCount,
      });
      toast.success(data.message || "Serverbestanden succesvol gesynchroniseerd!");
      onUploadSuccess();
    } catch (err: any) {
      console.error("[SERVER FILES SYNC ERROR]:", err);
      toast.error(err.message || "Fout bij synchroniseren van serverbestanden");
    } finally {
      setIsSyncingFs(false);
    }
  };

  // Filter matched documents in result view
  const filteredMatched = (uploadResult?.matchedDocuments || []).filter((doc) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      doc.filename.toLowerCase().includes(q) ||
      doc.dossier.toLowerCase().includes(q) ||
      (doc.title && doc.title.toLowerCase().includes(q)) ||
      (doc.category && doc.category.toLowerCase().includes(q))
    );
  });

  const filteredUnmatched = (uploadResult?.unmatchedDocuments || []).filter((fn) => {
    if (!filterQuery) return true;
    return fn.toLowerCase().includes(filterQuery.toLowerCase());
  });

  return (
    <div
      id="bulk-upload-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        id="bulk-upload-modal-card"
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/15 text-accent">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Documenten & ZIP Bulk-Upload
              </h3>
              <p className="text-xs text-muted-foreground">
                Upload losse PDF/Word-stukken of een compleet .ZIP archief. Automatische uitpakking en dossierverdeling.
              </p>
            </div>
          </div>
          <Button
            id="btn-close-bulk-upload"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border bg-muted/20 px-6 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab("documents")}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "documents"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-4 h-4" />
            Documenten & ZIP Archief Upload
            {selectedFiles.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-accent text-accent-foreground text-[10px]">
                {selectedFiles.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("metadata")}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "metadata"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Metadata & Netwerkgraaf (CSV / JSON)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === "documents" ? (
            !uploadResult ? (
              <>
                {/* Active database info callout */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-accent/5 border border-accent/20 text-xs">
                  <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground">
                      Automatische dossier-detectie & ZIP-ondersteuning
                    </span>
                    <p className="text-muted-foreground">
                      Je kunt hier direct losse PDF's, Word-documenten of een heel <strong>.ZIP-bestand</strong> (bijv. van NotuBiz of een export) uploaden. Het systeem pakt het ZIP-archief automatisch uit op de server, detecteert de bestuurslaag (Gemeente, Provincie of Waterschap) en koppelt elk stuk direct aan het juiste raadsdossier.
                    </p>
                  </div>
                </div>

                {/* Dropzone */}
                <div
                  id="bulk-upload-dropzone"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-accent/40 hover:border-accent hover:bg-accent/5 transition-all rounded-2xl p-8 text-center cursor-pointer flex flex-col items-center justify-center gap-3.5 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 group-hover:scale-105 transition-transform flex items-center justify-center text-accent">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Sleep documenten of een .ZIP archief hierheen
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ondersteunt <span className="font-medium text-foreground">.ZIP</span>, <span className="font-medium text-foreground">.PDF</span>, <span className="font-medium text-foreground">.DOCX</span>, <span className="font-medium text-foreground">.XLSX</span>
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-accent font-medium">
                      <span className="flex items-center gap-1 bg-accent/10 px-2.5 py-0.5 rounded-full">
                        <Archive className="w-3 h-3" /> Automatische ZIP-uitpakking
                      </span>
                      <span className="flex items-center gap-1 bg-accent/10 px-2.5 py-0.5 rounded-full">
                        <FolderCheck className="w-3 h-3" /> Directe dossierverdeling
                      </span>
                    </div>
                  </div>
                  <input
                    id="bulk-upload-file-input"
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xlsx,.zip,application/zip,application/x-zip-compressed"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Selected Files Preview List */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          Geselecteerd voor upload ({selectedFiles.length} bestand(en),{" "}
                          {(
                            selectedFiles.reduce((acc, f) => acc + f.size, 0) /
                            (1024 * 1024)
                          ).toFixed(1)}{" "}
                          MB)
                        </span>
                        {hasZipFile && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-semibold flex items-center gap-1">
                            <Archive className="w-3 h-3" />
                            Bevat ZIP archief
                          </span>
                        )}
                        {skippedDuplicatesCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {skippedDuplicatesCount} dubbelen overgeslagen
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[11px] gap-1"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Plus className="w-3 h-3" /> Meer toevoegen
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedFiles([]);
                            setSkippedDuplicatesCount(0);
                          }}
                        >
                          Alles wissen
                        </Button>
                      </div>
                    </div>

                    <div className="max-h-52 overflow-y-auto rounded-xl border border-border p-2 bg-background space-y-1.5">
                      {selectedFiles.map((file, idx) => {
                        const isZip = file.name.toLowerCase().endsWith(".zip");
                        const isLarge = file.size > 50 * 1024 * 1024;
                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                              isZip
                                ? "bg-accent/10 border border-accent/25"
                                : isLarge
                                ? "bg-amber-500/10 border border-amber-500/30"
                                : "bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              {isZip ? (
                                <Archive className="w-4 h-4 text-accent shrink-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                              )}
                              <span className="font-mono truncate font-medium">{file.name}</span>
                              {isZip && (
                                <span className="text-[10px] bg-accent/20 text-accent font-semibold px-2 py-0.5 rounded-full shrink-0">
                                  ZIP Archief
                                </span>
                              )}
                              {isLarge && (
                                <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 shrink-0">
                                  <AlertTriangle className="w-3 h-3" />
                                  Groot archief
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-[11px] text-muted-foreground font-medium">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(idx);
                                }}
                                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted"
                                title="Bestand verwijderen"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Progress Bar & Stage Flow */}
                {isUploading && (
                  <div className="space-y-3.5 bg-accent/5 p-4 rounded-xl border border-accent/20">
                    <div className="flex items-center justify-between text-xs text-foreground">
                      <span className="flex items-center gap-2 font-semibold text-accent truncate pr-2">
                        <Loader2 className="w-4 h-4 animate-spin text-accent shrink-0" />
                        {uploadStatusText || "Bestanden verwerken..."}
                      </span>
                      <span className="font-bold text-accent shrink-0 text-sm">{uploadProgress}%</span>
                    </div>

                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>

                    {/* Detailed Live MB & Speed stats when uploading */}
                    {uploadBytesInfo && uploadBytesInfo.totalBytes > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-background/60 px-3 py-1.5 rounded-lg border border-border/50">
                        <span className="font-medium text-foreground">
                          {(uploadBytesInfo.loadedBytes / (1024 * 1024)).toFixed(1)} MB van{" "}
                          {(uploadBytesInfo.totalBytes / (1024 * 1024)).toFixed(1)} MB
                        </span>
                        <div className="flex items-center gap-3">
                          {uploadBytesInfo.speedMbS > 0 && (
                            <span className="text-accent font-medium">
                              {uploadBytesInfo.speedMbS.toFixed(1)} MB/s
                            </span>
                          )}
                          {uploadBytesInfo.timeRemainingSec !== null && uploadBytesInfo.timeRemainingSec > 0 && (
                            <span>Nog ~{uploadBytesInfo.timeRemainingSec} sec</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* When in server unpacking / matching phase */}
                    {(uploadStage === "unpacking" || uploadStage === "matching" || uploadStage === "indexing") && (
                      <div className="flex items-center gap-2 text-[11px] text-accent bg-accent/10 px-3 py-2 rounded-lg border border-accent/20">
                        <Archive className="w-4 h-4 text-accent shrink-0 animate-pulse" />
                        <span className="leading-snug">
                          {uploadStage === "unpacking" && "ZIP-archief is ontvangen. Server pakt nu alle documenten uit..."}
                          {uploadStage === "matching" && "Documenten worden vergeleken en gekoppeld aan raadsdossiers..."}
                          {uploadStage === "indexing" && "Zoekindex wordt bijgewerkt voor razendsnel zoeken..."}
                        </span>
                      </div>
                    )}

                    {/* Step indicator pills */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <div className={`p-2 rounded-lg text-center text-[10px] font-semibold flex flex-col items-center gap-1 transition-all ${
                        uploadStage === "uploading" ? "bg-accent/25 text-accent border border-accent/40 shadow-xs" : "bg-muted/40 text-muted-foreground"
                      }`}>
                        <Upload className="w-3 h-3" />
                        <span>1. Upload ({uploadProgress}%)</span>
                      </div>
                      <div className={`p-2 rounded-lg text-center text-[10px] font-semibold flex flex-col items-center gap-1 transition-all ${
                        uploadStage === "unpacking" ? "bg-accent/25 text-accent border border-accent/40 shadow-xs" : "bg-muted/40 text-muted-foreground"
                      }`}>
                        <Archive className="w-3 h-3" />
                        <span>2. Uitpakken</span>
                      </div>
                      <div className={`p-2 rounded-lg text-center text-[10px] font-semibold flex flex-col items-center gap-1 transition-all ${
                        uploadStage === "matching" ? "bg-accent/25 text-accent border border-accent/40 shadow-xs" : "bg-muted/40 text-muted-foreground"
                      }`}>
                        <FolderCheck className="w-3 h-3" />
                        <span>3. Verdelen</span>
                      </div>
                      <div className={`p-2 rounded-lg text-center text-[10px] font-semibold flex flex-col items-center gap-1 transition-all ${
                        uploadStage === "indexing" || uploadStage === "completed" ? "bg-accent/25 text-accent border border-accent/40 shadow-xs" : "bg-muted/40 text-muted-foreground"
                      }`}>
                        <Search className="w-3 h-3" />
                        <span>4. Indexeren</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Upload Complete Feedback Summary & Detailed Distribution View */
              <div className="space-y-5 text-center py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    Bulk Upload & Verdeling Succesvol Afgerond!
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-lg mx-auto">
                    {uploadResult.zipCount && uploadResult.zipCount > 0
                      ? `${uploadResult.zipCount} ZIP-archief (${uploadResult.extractedFromZipCount} bestanden) succesvol uitgepakt en verdeeld over de raadsdossiers.`
                      : `Alle bestanden zijn fysiek opgeslagen en direct gekoppeld aan de dossiers en netwerkgrafiek.`}
                  </p>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-center">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="text-xl font-extrabold text-foreground">
                      {uploadResult.totalUploaded}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-medium">
                      Totaal Verwerkt
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {uploadResult.matchedCount}
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                      Verdeeld over Dossiers
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="text-xl font-extrabold text-muted-foreground">
                      {uploadResult.unmatchedCount}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-medium">
                      Algemeen Archief
                    </div>
                  </div>
                </div>

                {/* Search & Distribution Details */}
                <div className="text-left space-y-2.5 pt-2 border-t border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <FolderCheck className="w-4 h-4 text-accent" />
                      <span>Verdeelde Documenten Overzicht:</span>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Filter bestanden / dossiers..."
                          value={filterQuery}
                          onChange={(e) => setFilterQuery(e.target.value)}
                          className="h-7 pl-7 pr-2.5 text-xs rounded-lg border border-border bg-background w-44 sm:w-56 focus:outline-hidden focus:ring-1 focus:ring-accent"
                        />
                      </div>
                      <button
                        onClick={() => setResultFilterTab("all")}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                          resultFilterTab === "all" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        Alles ({uploadResult.totalUploaded})
                      </button>
                      <button
                        onClick={() => setResultFilterTab("matched")}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                          resultFilterTab === "matched" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        Dossiers ({uploadResult.matchedCount})
                      </button>
                    </div>
                  </div>

                  {/* Results List */}
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-border p-2 bg-background space-y-1.5 text-xs">
                    {resultFilterTab !== "unmatched" &&
                      filteredMatched.map((doc, idx) => (
                        <div
                          key={`matched-${idx}`}
                          className="flex items-start justify-between p-2 rounded-lg bg-muted/30 border border-border/50 text-xs gap-3"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="font-mono text-[11px] font-semibold text-foreground truncate">
                              {doc.filename}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {doc.title}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/15 text-accent">
                              {doc.dossier}
                            </span>
                            {doc.category && (
                              <span className="text-[9px] text-muted-foreground">
                                {doc.category}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                    {resultFilterTab !== "matched" &&
                      filteredUnmatched.map((fn, idx) => (
                        <div
                          key={`unmatched-${idx}`}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-xs"
                        >
                          <span className="font-mono text-[11px] text-muted-foreground truncate pr-2">
                            {fn}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground shrink-0">
                            Veilig opgeslagen in documenten-archief
                          </span>
                        </div>
                      ))}

                    {filteredMatched.length === 0 && filteredUnmatched.length === 0 && (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        Geen documenten gevonden die voldoen aan de filter.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            /* Metadata & Network Graph Tab */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-accent/5 border border-accent/20 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-accent" />
                  Update Raadsstukken Metadata & Netwerkgraaf
                </p>
                <p>
                  Upload een nieuw <code className="text-accent">raadsstukken_metadata_tussentijds.csv</code> bestand of een geüpdatete <code className="text-accent">network_graph.json</code>. De site verwerkt alle rijen, hercalculeert alle relaties en bouwt de netwerkgrafiek direct automatisch op.
                </p>
              </div>

              {/* Direct Server Files Scan Section */}
              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span className="font-bold text-foreground">Direct Serverbestanden Scannen (5000+ Bestanden)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 font-semibold text-[10px]">
                    Aanbevolen voor VPS
                  </span>
                </div>
                <p className="text-muted-foreground">
                  Er bevinden zich ruim 5.000 PDF-bestanden in de servermappen (<code className="text-sky-600 dark:text-sky-400">/public/uploads/documents/</code>, <code className="text-sky-600 dark:text-sky-400">waterschap/</code> en <code className="text-sky-600 dark:text-sky-400">overijssel/</code>). Klik op onderstaande knop om alle bestanden direct te indexeren en op te slaan in de centrale master-catalogus.
                </p>
                <Button
                  onClick={handleSyncServerFiles}
                  disabled={isSyncingFs}
                  size="sm"
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl h-9 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isSyncingFs ? 'animate-spin' : ''}`} />
                  {isSyncingFs ? "Servermappen indexeren..." : "Scan & Synchroniseer Alle Serverbestanden"}
                </Button>
              </div>

              {!metaResult ? (
                <>
                  <div
                    onClick={() => metaFileInputRef.current?.click()}
                    className="border-2 border-dashed border-accent/40 hover:border-accent hover:bg-accent/5 transition-colors rounded-2xl p-7 text-center cursor-pointer flex flex-col items-center justify-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Selecteer CSV of JSON bestand
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Bijvoorbeeld <span className="font-mono">raadsstukken_metadata_tussentijds.csv</span> of <span className="font-mono">network_graph.json</span>
                      </p>
                    </div>
                    <input
                      ref={metaFileInputRef}
                      type="file"
                      accept=".csv,.json"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setSelectedMetaFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>

                  {selectedMetaFile && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <FileSpreadsheet className="w-4 h-4 text-accent shrink-0" />
                        <span className="font-mono font-semibold truncate">{selectedMetaFile.name}</span>
                        <span className="text-muted-foreground">
                          ({(selectedMetaFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => setSelectedMetaFile(null)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}

                  {selectedMetaFile && (
                    <Button
                      disabled={isUploadingMeta}
                      onClick={handleUploadMetadata}
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-xs rounded-xl h-10"
                    >
                      {isUploadingMeta ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Metadata inlezen & netwerkgraaf genereren...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Metadata Bijwerken & Netwerkgraaf Herbouwen
                        </>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <div className="space-y-4 text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-foreground">
                      Metadata Succesvol Bijgewerkt!
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      {metaResult.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-center">
                    {metaResult.itemsCount !== undefined && (
                      <div className="p-3 rounded-xl bg-muted/40 border border-border">
                        <div className="text-lg font-bold text-foreground">
                          {metaResult.itemsCount}
                        </div>
                        <div className="text-[11px] text-muted-foreground">Raadsstukken</div>
                      </div>
                    )}
                    {metaResult.nodesCount !== undefined && (
                      <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                        <div className="text-lg font-bold text-accent">
                          {metaResult.nodesCount}
                        </div>
                        <div className="text-[11px] text-accent">Netwerkknooppunten</div>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedMetaFile(null);
                      setMetaResult(null);
                    }}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-xs rounded-xl"
                  >
                    Nog een bestand verwerken
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button
            id="btn-cancel-bulk-upload"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs rounded-xl"
          >
            {uploadResult || metaResult ? "Sluiten" : "Annuleren"}
          </Button>

          {activeTab === "documents" &&
            (!uploadResult ? (
              <Button
                id="btn-execute-bulk-upload"
                size="sm"
                disabled={selectedFiles.length === 0 || isUploading}
                onClick={handleUpload}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-xs rounded-xl h-9 px-4"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Verwerken ({selectedFiles.length})...
                  </>
                ) : hasZipFile ? (
                  <>
                    <Archive className="w-3.5 h-3.5 mr-1.5" />
                    ZIP Archief Uploaden & Uitpakken
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload {selectedFiles.length} Bestand(en)
                  </>
                )}
              </Button>
            ) : (
              <Button
                id="btn-upload-more"
                size="sm"
                onClick={() => {
                  setSelectedFiles([]);
                  setUploadResult(null);
                  setFilterQuery("");
                }}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-xs rounded-xl"
              >
                Nog meer bestanden of .ZIP uploaden
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
};

