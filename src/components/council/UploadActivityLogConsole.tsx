import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Copy,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Archive,
  FolderCheck,
  Search,
  Upload,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface UploadLogEntry {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warn" | "error" | "chunk";
  tag: "START" | "CHUNK" | "SERVER" | "UNZIP" | "MATCH" | "INDEX" | "RETRY" | "DONE" | "ERROR" | "FILES" | "BATCH";
  message: string;
  details?: string;
}

interface UploadActivityLogConsoleProps {
  logs: UploadLogEntry[];
  isUploading: boolean;
  onClearLogs?: () => void;
  defaultExpanded?: boolean;
}

export const UploadActivityLogConsole: React.FC<UploadActivityLogConsoleProps> = ({
  logs,
  isUploading,
  onClearLogs,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "warnings" | "chunks" | "matches">("all");
  const [copied, setCopied] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && isExpanded) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll, isExpanded]);

  const handleCopy = () => {
    if (logs.length === 0) return;
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.tag}] ${l.message}${l.details ? ` (${l.details})` : ""}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Volledig verwerkingslog gekopieerd naar klembord!");
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    if (filterType === "warnings") {
      return log.level === "warn" || log.level === "error" || log.tag === "RETRY";
    }
    if (filterType === "chunks") {
      return log.tag === "CHUNK" || log.tag === "START" || log.tag === "BATCH";
    }
    if (filterType === "matches") {
      return log.tag === "MATCH" || log.tag === "UNZIP" || log.tag === "DONE";
    }
    return true;
  });

  if (logs.length === 0 && !isUploading) {
    return null;
  }

  const getTagBadge = (tag: UploadLogEntry["tag"], level: UploadLogEntry["level"]) => {
    switch (tag) {
      case "CHUNK":
        return "bg-sky-500/20 text-sky-400 border-sky-500/30";
      case "MATCH":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "UNZIP":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "SERVER":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "RETRY":
        return "bg-orange-500/25 text-orange-400 border-orange-500/40 animate-pulse";
      case "ERROR":
        return "bg-rose-500/25 text-rose-400 border-rose-500/40";
      case "DONE":
        return "bg-emerald-500/30 text-emerald-300 border-emerald-500/50 font-bold";
      case "INDEX":
        return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
      default:
        return level === "success"
          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
          : level === "warn"
          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
          : level === "error"
          ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
          : "bg-slate-700/50 text-slate-300 border-slate-600";
    }
  };

  const getTagIcon = (tag: UploadLogEntry["tag"]) => {
    switch (tag) {
      case "CHUNK":
      case "BATCH":
        return <Upload className="w-2.5 h-2.5" />;
      case "UNZIP":
        return <Archive className="w-2.5 h-2.5" />;
      case "MATCH":
      case "DONE":
        return <FolderCheck className="w-2.5 h-2.5" />;
      case "INDEX":
        return <Search className="w-2.5 h-2.5" />;
      case "RETRY":
      case "ERROR":
        return <AlertTriangle className="w-2.5 h-2.5" />;
      default:
        return <Terminal className="w-2.5 h-2.5" />;
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0b1120] shadow-md overflow-hidden text-slate-200">
      {/* Console Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#0f172a] border-b border-slate-800/80 select-none">
        <div className="flex items-center gap-2">
          {isUploading ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          ) : (
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="font-mono text-xs font-semibold tracking-tight text-slate-200">
            Live Proces & Activiteitenlog
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700/50">
            {logs.length} gebeurtenissen
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {/* Filters */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
            <button
              onClick={() => setFilterType("all")}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filterType === "all" ? "bg-slate-700 text-slate-100 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Alles ({logs.length})
            </button>
            <button
              onClick={() => setFilterType("chunks")}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filterType === "chunks" ? "bg-sky-950 text-sky-300 font-semibold border border-sky-800/40" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Chunks
            </button>
            <button
              onClick={() => setFilterType("matches")}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filterType === "matches" ? "bg-emerald-950 text-emerald-300 font-semibold border border-emerald-800/40" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Dossiers
            </button>
            <button
              onClick={() => setFilterType("warnings")}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                filterType === "warnings" ? "bg-amber-950 text-amber-300 font-semibold border border-amber-800/40" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Fouten
            </button>
          </div>

          {/* Action buttons */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Kopieer volledig log"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded transition-colors ${
              autoScroll ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            title={autoScroll ? "Auto-scroll ingeschakeld" : "Auto-scroll uitgeschakeld"}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
              title="Wis log"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors ml-0.5"
            title={isExpanded ? "Log inklappen" : "Log uitklappen"}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal View Body */}
      {isExpanded && (
        <div
          ref={logContainerRef}
          className="max-h-56 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-1.5 select-text scrollbar-thin scrollbar-thumb-slate-700"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 italic py-2 text-center">
              Geen logregels voor de geselecteerde filter...
            </div>
          ) : (
            filteredLogs.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-2 py-0.5 px-1.5 rounded hover:bg-slate-900/60 transition-colors ${
                  item.level === "error"
                    ? "bg-rose-950/20 text-rose-300"
                    : item.level === "warn"
                    ? "bg-amber-950/20 text-amber-300"
                    : item.level === "success"
                    ? "text-emerald-300"
                    : item.tag === "CHUNK"
                    ? "text-slate-300"
                    : "text-slate-300"
                }`}
              >
                <span className="text-slate-500 shrink-0 select-none text-[10px] mt-0.5">
                  [{item.timestamp}]
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded border text-[9px] font-bold shrink-0 uppercase tracking-wider select-none ${getTagBadge(
                    item.tag,
                    item.level
                  )}`}
                >
                  {getTagIcon(item.tag)}
                  {item.tag}
                </span>

                <span className="break-all flex-1">{item.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
};
