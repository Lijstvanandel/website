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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    matchedCount: number;
    totalUploaded: number;
    unmatchedCount: number;
    matchedDocuments: Array<{ filename: string; dossier: string; title: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setUploadResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
      setUploadResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      setUploadProgress(45);
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/council/dossiers/bulk-upload", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      setUploadProgress(85);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout bij verwerken van uploads");

      setUploadProgress(100);
      setUploadResult(data);
      toast.success(data.message || "Documenten succesvol verwerkt!");
      onUploadSuccess();
    } catch (err: any) {
      toast.error(err.message || "Fout bij bulk upload");
    } finally {
      setIsUploading(false);
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
                Documenten Bulk-Uploaden naar Dossiers
              </h3>
              <p className="text-xs text-muted-foreground">
                Sleep alle raadsstukken hierheen. Bestanden worden automatisch gekoppeld aan de metadata.
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {!uploadResult ? (
            <>
              {/* Dropzone */}
              <div
                id="bulk-upload-dropzone"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-accent/40 hover:border-accent hover:bg-accent/5 transition-colors rounded-2xl p-8 text-center cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Sleep bestanden hierheen of klik om te bladeren
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ondersteunt honderden PDF's tegelijk (tot 250 bestanden per batch)
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
                    <span className="font-semibold text-foreground">
                      Geselecteerde bestanden ({selectedFiles.length})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-destructive hover:text-destructive"
                      onClick={() => setSelectedFiles([])}
                    >
                      Alles wissen
                    </Button>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border p-2 bg-background space-y-1">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-muted/40 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="font-mono truncate">{file.name}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                      Bestanden opslaan en synchroniseren...
                    </span>
                    <span>{uploadProgress}%</span>
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
            {uploadResult ? "Sluiten" : "Annuleren"}
          </Button>

          {!uploadResult ? (
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
          )}
        </div>
      </div>
    </div>
  );
};
