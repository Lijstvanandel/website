import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Search,
  FileText,
  Link2,
  Eye,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GraphNode, GraphEdge, DossierDocument } from "@/types/dossier";

interface DossierNetworkGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  documents?: DossierDocument[];
  onSelectDocument: (doc: DossierDocument | { bestandsnaam: string; titel: string; dossier?: string }) => void;
  title?: string;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export const DossierNetworkGraph: React.FC<DossierNetworkGraphProps> = ({
  nodes,
  edges,
  documents = [],
  onSelectDocument,
  title,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [search, setSearch] = useState("");
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Simulation state stored in ref for fast 60fps canvas rendering
  const simNodesRef = useRef<SimNode[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Initialize simulation nodes with circular layout
  useEffect(() => {
    if (!nodes || nodes.length === 0) {
      simNodesRef.current = [];
      return;
    }

    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;

    const docNodes = nodes.filter((n) => n.type === "Raadsstuk");
    const otherNodes = nodes.filter((n) => n.type !== "Raadsstuk");

    const simNodes: SimNode[] = [];

    // Place document nodes in inner circle
    docNodes.forEach((node, i) => {
      const angle = (i / Math.max(1, docNodes.length)) * 2 * Math.PI;
      const radius = docNodes.length > 8 ? 160 : 100;
      simNodes.push({
        ...node,
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        radius: 14,
      });
    });

    // Place relation/reference nodes in outer ring
    otherNodes.forEach((node, i) => {
      const angle = (i / Math.max(1, otherNodes.length)) * 2 * Math.PI;
      const radius = 280 + (i % 2) * 50;
      simNodes.push({
        ...node,
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 30,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 30,
        vx: 0,
        vy: 0,
        radius: 9,
      });
    });

    simNodesRef.current = simNodes;

    // Run simple spring relaxation
    let iteration = 0;
    const maxIterations = 80;

    const relax = () => {
      const sNodes = simNodesRef.current;
      const nodeMap = new Map<string, SimNode>();
      sNodes.forEach((n) => nodeMap.set(n.id, n));

      // Repulsion between all nodes
      for (let i = 0; i < sNodes.length; i++) {
        for (let j = i + 1; j < sNodes.length; j++) {
          const dx = sNodes[j].x - sNodes[i].x;
          const dy = sNodes[j].y - sNodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = sNodes[i].radius + sNodes[j].radius + 35;
          if (dist < minDist) {
            const force = (minDist - dist) / dist * 0.15;
            sNodes[i].x -= dx * force;
            sNodes[i].y -= dy * force;
            sNodes[j].x += dx * force;
            sNodes[j].y += dy * force;
          }
        }
      }

      // Attraction along edges
      edges.forEach((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 120;
          const force = (dist - targetDist) * 0.02;
          source.x += (dx / dist) * force;
          source.y += (dy / dist) * force;
          target.x -= (dx / dist) * force;
          target.y -= (dy / dist) * force;
        }
      });

      iteration++;
      if (iteration < maxIterations) {
        requestAnimationFrame(relax);
      }
    };

    relax();
    resetView();
  }, [nodes, edges]);

  // Handle canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Pan & zoom transform
      ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-400, -250); // center of virtual 800x500 space

      const sNodes = simNodesRef.current;
      const nodeMap = new Map<string, SimNode>();
      sNodes.forEach((n) => nodeMap.set(n.id, n));

      const query = search.toLowerCase().trim();

      // Draw Edges
      edges.forEach((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) return;

        const isConnectedToHover =
          hoveredNode && (hoveredNode.id === source.id || hoveredNode.id === target.id);
        const isConnectedToSelect =
          selectedNode && (selectedNode.id === source.id || selectedNode.id === target.id);

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (isConnectedToHover || isConnectedToSelect) {
          ctx.strokeStyle = "#c6a858"; // gold accent
          ctx.lineWidth = 2.2;
          ctx.globalAlpha = 0.9;
        } else {
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.25;
        }
        ctx.stroke();
      });

      // Draw Nodes
      sNodes.forEach((node) => {
        const isDoc = node.type === "Raadsstuk";
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = selectedNode?.id === node.id;
        const isSearchMatch = query && node.label.toLowerCase().includes(query);

        ctx.save();
        ctx.beginPath();
        const r = node.radius + (isHovered || isSelected ? 3 : 0);
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);

        // Fill color
        if (isDoc) {
          ctx.fillStyle = isSelected
            ? "#2563eb"
            : isHovered
            ? "#3b82f6"
            : isSearchMatch
            ? "#f59e0b"
            : "#1d4ed8";
        } else {
          ctx.fillStyle = isSelected
            ? "#d97706"
            : isHovered
            ? "#f59e0b"
            : isSearchMatch
            ? "#ef4444"
            : "#64748b";
        }
        ctx.fill();

        // Stroke
        ctx.lineWidth = isHovered || isSelected ? 3 : 1.5;
        ctx.strokeStyle = isSelected ? "#ffffff" : isHovered ? "#fef08a" : "rgba(255,255,255,0.7)";
        ctx.stroke();

        // Label
        const showFullLabel = isHovered || isSelected || isDoc;
        const labelText = node.label.length > 28 && !showFullLabel
          ? node.label.substring(0, 25) + "..."
          : node.label;

        ctx.font = isDoc
          ? "600 11px system-ui, sans-serif"
          : "500 10px system-ui, sans-serif";
        ctx.fillStyle = isSelected ? "#c6a858" : isDoc ? "#0f172a" : "#475569";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        // Label background pill for readability
        const textMetrics = ctx.measureText(labelText);
        const bgWidth = textMetrics.width + 8;
        const bgHeight = 14;
        const bgX = node.x - bgWidth / 2;
        const bgY = node.y + r + 3;

        ctx.fillStyle = isHovered || isSelected ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.85)";
        if (ctx.roundRect) {
          ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 3);
        } else {
          ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        }
        ctx.fill();

        ctx.fillStyle = isHovered || isSelected ? "#ffffff" : "#1e293b";
        ctx.fillText(labelText, node.x, bgY + 1.5);

        ctx.restore();
      });

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [edges, zoom, pan, search, hoveredNode, selectedNode]);

  // Convert client mouse pos to virtual canvas pos
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const virtX = (mouseX - (canvas.width / 2 + pan.x)) / zoom + 400;
    const virtY = (mouseY - (canvas.height / 2 + pan.y)) / zoom + 250;

    return { x: virtX, y: virtY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPan((prev) => ({
        x: prev.x + (e.clientX - dragStart.x),
        y: prev.y + (e.clientY - dragStart.y),
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const { x, y } = getCanvasCoords(e);
    let hit: SimNode | null = null;
    for (const node of simNodesRef.current) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy <= (node.radius + 6) * (node.radius + 6)) {
        hit = node;
        break;
      }
    }
    setHoveredNode(hit);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    let clicked: SimNode | null = null;
    for (const node of simNodesRef.current) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy <= (node.radius + 6) * (node.radius + 6)) {
        clicked = node;
        break;
      }
    }

    if (clicked) {
      setSelectedNode(clicked);
      if (clicked.type === "Raadsstuk") {
        // Find full document or trigger viewer
        const docMatch = documents.find((d) => d.bestandsnaam === clicked.id);
        if (docMatch) {
          onSelectDocument(docMatch);
        } else {
          onSelectDocument({
            bestandsnaam: clicked.bestandsnaam || clicked.id,
            titel: clicked.label,
            dossier: clicked.dossier,
          });
        }
      }
    } else {
      setSelectedNode(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(Math.max(z * zoomFactor, 0.3), 3.5));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  // Connected nodes count for selected node
  const selectedConnections = useMemo(() => {
    if (!selectedNode) return [];
    const connectedIds = new Set<string>();
    edges.forEach((e) => {
      if (e.source === selectedNode.id) connectedIds.add(e.target);
      if (e.target === selectedNode.id) connectedIds.add(e.source);
    });
    return simNodesRef.current.filter((n) => connectedIds.has(n.id));
  }, [selectedNode, edges]);

  return (
    <div
      id="dossier-network-graph-container"
      ref={containerRef}
      className={`relative bg-card border border-border rounded-2xl shadow-xs overflow-hidden flex flex-col transition-all duration-300 ${
        isFullscreen ? "fixed inset-2 z-50 h-[96vh] shadow-2xl" : "h-[560px] w-full"
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/15 text-accent">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              Interactieve Relatiekaart & Netwerkgraaf
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {nodes.length} knooppunten • {edges.length} relaties • Klik op een document om direct te openen
            </p>
          </div>
        </div>

        {/* Search & Controls */}
        <div className="flex items-center gap-2">
          <div className="relative w-40 sm:w-56 hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="graph-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek in netwerk..."
              className="pl-8 h-8 text-xs bg-background rounded-xl"
            />
          </div>

          <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-0.5">
            <Button
              id="btn-graph-zoom-in"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setZoom((z) => Math.min(z * 1.2, 3.5))}
              title="Inzoomen"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              id="btn-graph-zoom-out"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setZoom((z) => Math.max(z / 1.2, 0.3))}
              title="Uitzoomen"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <Button
              id="btn-graph-reset"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={resetView}
              title="Weergave herstellen"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button
              id="btn-graph-fullscreen"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Verkleinen" : "Volledig scherm"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Canvas Stage */}
      <div className="relative flex-1 bg-slate-950/5 dark:bg-black/40 overflow-hidden cursor-grab active:cursor-grabbing">
        <canvas
          id="dossier-graph-canvas"
          ref={canvasRef}
          className="w-full h-full block"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          onWheel={handleWheel}
        />

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 p-2.5 rounded-xl bg-card/90 backdrop-blur-xs border border-border text-[11px] shadow-sm space-y-1.5 pointer-events-none">
          <div className="font-semibold text-foreground text-[10px] uppercase tracking-wider mb-1">
            Legenda
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shrink-0" />
            <span className="text-muted-foreground">Raadsstuk / Document</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-500 inline-block shrink-0" />
            <span className="text-muted-foreground">Relatie / Wet / Referentie</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shrink-0" />
            <span className="text-muted-foreground">Geselecteerd / Verbonden</span>
          </div>
        </div>

        {/* Node Hover Tooltip Card */}
        {hoveredNode && (
          <div
            className="absolute top-3 right-3 p-3 rounded-xl bg-card/95 backdrop-blur-xs border border-border shadow-lg max-w-xs pointer-events-none transition-opacity duration-150"
          >
            <div className="flex items-center gap-2 mb-1">
              {hoveredNode.type === "Raadsstuk" ? (
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
              ) : (
                <Link2 className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {hoveredNode.type}
              </span>
            </div>
            <div className="text-xs font-bold text-foreground leading-snug">
              {hoveredNode.label}
            </div>
            {hoveredNode.date && (
              <div className="text-[11px] text-muted-foreground mt-1">
                Datum: {hoveredNode.date}
              </div>
            )}
            <div className="text-[11px] text-accent mt-1 flex items-center gap-1 font-medium">
              <Eye className="w-3 h-3" />
              {hoveredNode.type === "Raadsstuk" ? "Klik om document te openen" : "Klik om verbindingen te zien"}
            </div>
          </div>
        )}

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute bottom-3 right-3 p-3 rounded-xl bg-card border border-border shadow-xl max-w-sm w-full text-xs space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent block">
                  {selectedNode.type}
                </span>
                <h5 className="font-bold text-foreground text-sm leading-tight">
                  {selectedNode.label}
                </h5>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-muted-foreground"
                onClick={() => setSelectedNode(null)}
              >
                Sluit
              </Button>
            </div>

            {selectedNode.type === "Raadsstuk" && (
              <Button
                id="btn-graph-open-doc"
                size="sm"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-8 text-xs"
                onClick={() => {
                  const docMatch = documents.find((d) => d.bestandsnaam === selectedNode.id);
                  if (docMatch) {
                    onSelectDocument(docMatch);
                  } else {
                    onSelectDocument({
                      bestandsnaam: selectedNode.bestandsnaam || selectedNode.id,
                      titel: selectedNode.label,
                      dossier: selectedNode.dossier,
                    });
                  }
                }}
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Document Openen in Viewer
              </Button>
            )}

            {selectedConnections.length > 0 && (
              <div className="pt-2 border-t border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Verbonden met ({selectedConnections.length}):
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {selectedConnections.map((c) => (
                    <div
                      key={c.id}
                      className="p-1 rounded bg-muted/40 text-[11px] text-foreground truncate cursor-pointer hover:bg-accent/15"
                      onClick={() => setSelectedNode(c)}
                    >
                      • {c.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
