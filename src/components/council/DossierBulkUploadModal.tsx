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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface DossierBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
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
  const [uploadResult, setUploadResult] = useState<{
    matchedCount: number;
    totalUploaded: number;
    unmatchedCount: number;
    matchedDocuments: Array<{ filename: string; dossier: string; title: string }>;
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
        `${duplicatesDetected} dubbele bestand(en) automatisch overgeslagen (worden niet dubbel toegevoegd).`
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

  // Helper to partition files into safe batches (max 4 files or max 10MB per batch)
  const createBatches = (files: File[]) => {
    const batches: File[][] = [];
    let currentBatch: File[] = [];
    let currentBatchBytes = 0;
    const MAX_BATCH_BYTES = 10 * 1024 * 1024; // 10MB per batch
    const MAX_FILES_PER_BATCH = 4;

    for (const file of files) {
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

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(5);
    setUploadStatusText(`Upload voorbereiden voor ${selectedFiles.length} bestanden...`);

    const token = getToken();
    const batches = createBatches(selectedFiles);
    let completedFiles = 0;
    let accumulatedMatchedCount = 0;
    let accumulatedUnmatchedCount = 0;
    const accumulatedMatchedDocs: Array<{ filename: string; dossier: string; title: string }> = [];

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setUploadStatusText(
          `Deel ${i + 1} van ${batches.length} verwerken: ${completedFiles} van de ${selectedFiles.length} bestanden gereed...`
        );

        const formData = new FormData();
        batch.forEach((file) => {
          formData.append("files", file);
        });

        const res = await fetch("/api/council/dossiers/bulk-upload", {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        const responseText = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(responseText);
        } catch (_jsonErr) {
          if (res.status === 413 || responseText.includes("413") || responseText.toLowerCase().includes("too large")) {
            throw new Error(
              `Eén van de bestanden in deel ${i + 1} is te groot voor de server. Upload bestanden kleiner dan 25 MB per stuk.`
            );
          }
          if (!res.ok) {
            throw new Error(`Serverfout (${res.status}): het verzoek kon niet worden verwerkt.`);
          }
          throw new Error("Ongeldig antwoord van de server ontvangen.");
        }

        if (!res.ok) {
          throw new Error(data?.error || `Uploaden van deel ${i + 1} mislukt (status ${res.status}).`);
        }

        completedFiles += batch.length;
        accumulatedMatchedCount += data.matchedCount || 0;
        accumulatedUnmatchedCount += data.unmatchedCount || 0;
        if (Array.isArray(data.matchedDocuments)) {
          accumulatedMatchedDocs.push(...data.matchedDocuments);
        }

        const calculatedProgress = Math.min(
          98,
          Math.round((completedFiles / selectedFiles.length) * 100)
        );
        setUploadProgress(calculatedProgress);
      }

      setUploadProgress(100);
      const finalResult = {
        totalUploaded: completedFiles,
        matchedCount: accumulatedMatchedCount,
        unmatchedCount: accumulatedUnmatchedCount,
        matchedDocuments: accumulatedMatchedDocs,
      };

      setUploadResult(finalResult);
      toast.success(
        `${accumulatedMatchedCount} van de ${completedFiles} bestanden direct herkend en gekoppeld aan dossiers!`
      );
      onUploadSuccess();
    } catch (err: any) {
      console.error("[BULK UPLOAD CLIENT ERROR]:", err);
      toast.error(err.message || "Fout bij bulk upload");
      if (completedFiles > 0) {
        setUploadResult({
          totalUploaded: completedFiles,
          matchedCount: accumulatedMatchedCount,
          unmatchedCount: accumulatedUnmatchedCount,
          matchedDocuments: accumulatedMatchedDocs,
        });
        onUploadSuccess();
      }
    } finally {
      setIsUploading(false);
      setUploadStatusText("");
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

  return (
    <div
      id="bulk-upload-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        id="bulk-upload-modal-card"
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/15 text-accent">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Documenten & Dossiers Beheer
              </h3>
              <p className="text-xs text-muted-foreground">
                Bulk-upload van PDF raadsstukken of update van metadata & relaties.
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
        <div className="flex border-b border-border bg-muted/20 px-5 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab("documents")}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "documents"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            PDF Raadsstukken Bulk-Upload
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
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === "documents" ? (
            !uploadResult ? (
              <>
                {/* Active database info callout */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs">
                  <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">
                      406 raadsstukken geregistreerd in 226 dossiers.
                    </span>{" "}
                    <span className="text-muted-foreground">
                      Upload hieronder de PDF-bestanden. Bestanden worden automatisch herkend aan de hand van de bestandsnaam en gekoppeld aan het bijbehorende dossier en de netwerkgrafiek.
                    </span>
                  </div>
                </div>

                {/* Dropzone */}
                <div
                  id="bulk-upload-dropzone"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-accent/40 hover:border-accent hover:bg-accent/5 transition-colors rounded-2xl p-7 text-center cursor-pointer flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Sleep PDF raadsstukken hierheen of klik om te selecteren
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ondersteunt honderden bestanden tegelijk (wordt automatisch in veilige delen verwerkt)
                    </p>
                    <p className="text-[11px] text-accent/90 mt-1.5 font-medium flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                      Duplicaten worden direct automatisch herkend en uitgefilterd
                    </p>
                  </div>
                  <input
                    id="bulk-upload-file-input"
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Selected Files Preview List */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          Geselecteerd voor upload ({selectedFiles.length} bestanden,{" "}
                          {(
                            selectedFiles.reduce((acc, f) => acc + f.size, 0) /
                            (1024 * 1024)
                          ).toFixed(1)}{" "}
                          MB)
                        </span>
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

                    <div className="max-h-48 overflow-y-auto rounded-xl border border-border p-2 bg-background space-y-1">
                      {selectedFiles.map((file, idx) => {
                        const isLarge = file.size > 25 * 1024 * 1024;
                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                              isLarge ? "bg-amber-500/10 border border-amber-500/30" : "bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span className="font-mono truncate">{file.name}</span>
                              {isLarge && (
                                <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 shrink-0">
                                  <AlertTriangle className="w-3 h-3" />
                                  Groot bestand
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
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

                {/* Progress Bar */}
                {isUploading && (
                  <div className="space-y-1.5 bg-accent/5 p-3 rounded-xl border border-accent/20">
                    <div className="flex items-center justify-between text-xs text-foreground">
                      <span className="flex items-center gap-1.5 font-medium text-accent truncate pr-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-accent shrink-0" />
                        {uploadStatusText || "Bestanden opslaan en synchroniseren..."}
                      </span>
                      <span className="font-bold text-accent shrink-0">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Upload Complete Feedback Summary */
              <div className="space-y-4 text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    Bulk Upload Succesvol Afgerond!
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    De documenten zijn fysiek opgeslagen in de server-infrastructuur en gekoppeld aan de dossiers en netwerkgrafiek.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="text-lg font-bold text-foreground">
                      {uploadResult.totalUploaded}
                    </div>
                    <div className="text-[11px] text-muted-foreground">Geüpload</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {uploadResult.matchedCount}
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Herkend in Dossiers
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="text-lg font-bold text-muted-foreground">
                      {uploadResult.unmatchedCount}
                    </div>
                    <div className="text-[11px] text-muted-foreground">Nieuw / Overig</div>
                  </div>
                </div>

                {uploadResult.matchedDocuments.length > 0 && (
                  <div className="text-left space-y-1.5 mt-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Gekoppelde Stukken:
                    </span>
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-border p-2 bg-background space-y-1 text-xs">
                      {uploadResult.matchedDocuments.slice(0, 50).map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-1.5 rounded-md bg-muted/30 text-xs"
                        >
                          <span className="font-mono text-[11px] truncate pr-2">{doc.filename}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent/15 text-accent shrink-0">
                            {doc.dossier}
                          </span>
                        </div>
                      ))}
                      {uploadResult.matchedDocuments.length > 50 && (
                        <div className="text-[11px] text-center text-muted-foreground py-1">
                          ...en nog {uploadResult.matchedDocuments.length - 50} andere stukken
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            /* Metadata & Network Graph Tab */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs text-muted-foreground space-y-1">
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
        <div className="px-5 py-3.5 border-t border-border bg-muted/20 flex items-center justify-between">
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
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-xs rounded-xl"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Verwerken ({selectedFiles.length})...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload {selectedFiles.length} Bestanden
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
                }}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-xs rounded-xl"
              >
                Nog meer bestanden uploaden
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
};
