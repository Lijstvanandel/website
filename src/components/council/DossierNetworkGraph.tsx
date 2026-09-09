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
  Filter,
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
  const [onlyConnected, setOnlyConnected] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Simulation state stored in ref for fast 60fps canvas rendering
  const simNodesRef = useRef<SimNode[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Filter nodes: strictly only documents
  const docOnlyNodes = useMemo(() => {
    return (nodes || []).filter((n) => n.type === "Raadsstuk" || n.type === "Document" || !n.type);
  }, [nodes]);

  // Determine connected document IDs from edges
  const connectedDocIds = useMemo(() => {
    const ids = new Set<string>();
    (edges || []).forEach((e) => {
      ids.add(e.source);
      ids.add(e.target);
    });
    return ids;
  }, [edges]);

  // Active nodes based on `onlyConnected` filter
  const activeNodes = useMemo(() => {
    if (!onlyConnected || docOnlyNodes.length <= 1) {
      return docOnlyNodes;
    }
    const filtered = docOnlyNodes.filter((n) => connectedDocIds.has(n.id));
    return filtered.length > 0 ? filtered : docOnlyNodes;
  }, [docOnlyNodes, onlyConnected, connectedDocIds]);

  // Active edges between currently active nodes
  const activeEdges = useMemo(() => {
    const activeIds = new Set(activeNodes.map((n) => n.id));
    return (edges || []).filter((e) => activeIds.has(e.source) && activeIds.has(e.target));
  }, [activeNodes, edges]);

  // Initialize simulation nodes with circular layout
  useEffect(() => {
    if (!activeNodes || activeNodes.length === 0) {
      simNodesRef.current = [];
      return;
    }

    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;

    const simNodes: SimNode[] = activeNodes.map((node, i) => {
      const count = Math.max(1, activeNodes.length);
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
      const radius = count > 10 ? 180 : count > 5 ? 140 : count > 2 ? 100 : 60;
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 10,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 10,
        vx: 0,
        vy: 0,
        radius: 15,
      };
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
          const minDist = sNodes[i].radius + sNodes[j].radius + 50;
          if (dist < minDist) {
            const force = ((minDist - dist) / dist) * 0.15;
            sNodes[i].x -= dx * force;
            sNodes[i].y -= dy * force;
            sNodes[j].x += dx * force;
            sNodes[j].y += dy * force;
          }
        }
      }

      // Attraction along edges
      activeEdges.forEach((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 140;
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
  }, [activeNodes, activeEdges]);

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
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Apply Pan and Zoom
      ctx.translate(rect.width / 2 + pan.x, rect.height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-400, -250); // center of virtual 800x500 space

      const sNodes = simNodesRef.current;
      const nodeMap = new Map<string, SimNode>();
      sNodes.forEach((n) => nodeMap.set(n.id, n));

      const query = search.toLowerCase().trim();

      // Determine highlighted nodes
      const activeHighlightId = hoveredNode?.id || selectedNode?.id || null;
      const directConnectedIds = new Set<string>();
      if (activeHighlightId) {
        directConnectedIds.add(activeHighlightId);
        activeEdges.forEach((edge) => {
          if (edge.source === activeHighlightId) directConnectedIds.add(edge.target);
          if (edge.target === activeHighlightId) directConnectedIds.add(edge.source);
        });
      }

      // 1. Draw Edges between documents
      activeEdges.forEach((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) return;

        const isHighlighted =
          activeHighlightId && (activeHighlightId === source.id || activeHighlightId === target.id);

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (isHighlighted) {
          ctx.strokeStyle = "#c6a858"; // gold accent for active document connection
          ctx.lineWidth = 2.8;
          ctx.globalAlpha = 0.95;
        } else if (activeHighlightId) {
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.15;
        } else {
          ctx.strokeStyle = "#64748b";
          ctx.lineWidth = 1.6;
          ctx.globalAlpha = 0.45;
        }
        ctx.stroke();

        // If highlighted, draw label on the edge
        if (isHighlighted && edge.label) {
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          const edgeText = edge.label.length > 35 ? edge.label.substring(0, 32) + "..." : edge.label;

          ctx.save();
          ctx.font = "600 10px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const textWidth = ctx.measureText(edgeText).width;
          ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
          ctx.fillRect(midX - textWidth / 2 - 5, midY - 8, textWidth + 10, 16);

          ctx.fillStyle = "#fef08a";
          ctx.fillText(edgeText, midX, midY);
          ctx.restore();
        }
      });

      // 2. Draw Document Nodes
      sNodes.forEach((node) => {
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = selectedNode?.id === node.id;
        const isConnectedToActive = directConnectedIds.has(node.id);
        const isSearchMatch = query && node.label.toLowerCase().includes(query);

        ctx.save();
        ctx.beginPath();
        const r = node.radius + (isHovered || isSelected ? 4 : 0);
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);

        // Fill color for document node
        if (isSelected) {
          ctx.fillStyle = "#c6a858"; // Gold selected
        } else if (isHovered) {
          ctx.fillStyle = "#38bdf8"; // Bright sky blue hover
        } else if (isSearchMatch) {
          ctx.fillStyle = "#f59e0b"; // Search amber
        } else if (isConnectedToActive) {
          ctx.fillStyle = "#0284c7"; // Connected document blue
        } else if (activeHighlightId) {
          ctx.fillStyle = "#334155"; // Dimmed if other is focused
        } else {
          ctx.fillStyle = "#1e40af"; // Default deep document blue
        }

        ctx.fill();

        // Border ring
        ctx.lineWidth = isSelected ? 3 : isHovered ? 2.5 : 1.5;
        ctx.strokeStyle = isSelected
          ? "#ffffff"
          : isHovered
          ? "#fef08a"
          : isConnectedToActive
          ? "#7dd3fc"
          : "rgba(255,255,255,0.8)";
        ctx.stroke();

        // Inner document icon mark (tiny document outline)
        ctx.fillStyle = isSelected ? "#0f172a" : "#ffffff";
        ctx.fillRect(node.x - 3.5, node.y - 4.5, 7, 9);
        ctx.fillStyle = isSelected ? "#c6a858" : "#1e40af";
        ctx.fillRect(node.x - 2, node.y - 2.5, 4, 1.2);
        ctx.fillRect(node.x - 2, node.y - 0.5, 4, 1.2);
        ctx.fillRect(node.x - 2, node.y + 1.5, 2.5, 1.2);

        // Document Label below node
        const showFull = isHovered || isSelected;
        const cleanName = node.label.replace(/\.pdf$/i, "");
        const labelText =
          cleanName.length > 26 && !showFull ? cleanName.substring(0, 24) + "..." : cleanName;

        ctx.font = isSelected || isHovered ? "700 11px system-ui, sans-serif" : "600 10.5px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        // Label background pill for readability
        const textMetrics = ctx.measureText(labelText);
        const bgWidth = textMetrics.width + 10;
        const bgHeight = 16;
        const bgX = node.x - bgWidth / 2;
        const bgY = node.y + r + 4;

        ctx.fillStyle =
          isHovered || isSelected
            ? "rgba(15, 23, 42, 0.95)"
            : "rgba(255, 255, 255, 0.9)";
        if (ctx.roundRect) {
          ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 4);
        } else {
          ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        }
        ctx.fill();

        ctx.fillStyle = isHovered || isSelected ? "#ffffff" : "#0f172a";
        ctx.fillText(labelText, node.x, bgY + 2);

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
  }, [activeEdges, zoom, pan, search, hoveredNode, selectedNode]);

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
      if (dx * dx + dy * dy <= (node.radius + 8) * (node.radius + 8)) {
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
      if (dx * dx + dy * dy <= (node.radius + 8) * (node.radius + 8)) {
        clicked = node;
        break;
      }
    }

    if (clicked) {
      setSelectedNode(clicked);
      // Open document directly in viewer
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

  // Connected documents for selected node, including specific edge reason
  const selectedConnectionsWithReasons = useMemo(() => {
    if (!selectedNode) return [];
    const results: { node: SimNode; reason: string }[] = [];
    const simNodeMap = new Map(simNodesRef.current.map((n) => [n.id, n]));

    activeEdges.forEach((e) => {
      let otherId: string | null = null;
      if (e.source === selectedNode.id) otherId = e.target;
      if (e.target === selectedNode.id) otherId = e.source;

      if (otherId && simNodeMap.has(otherId)) {
        results.push({
          node: simNodeMap.get(otherId)!,
          reason: e.label || "Onderling verbonden stuk",
        });
      }
    });

    return results;
  }, [selectedNode, activeEdges]);

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
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-600/15 text-blue-600 dark:text-blue-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
              <span>Interactieve Relatiekaart & Netwerkgraaf</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                Alleen documenten
              </span>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {activeNodes.length} documenten • {activeEdges.length} onderlinge verbindingen • Klik op een document om direct te openen
            </p>
          </div>
        </div>

        {/* Search & Controls */}
        <div className="flex items-center gap-2">
          {/* Toggle only connected vs all */}
          {docOnlyNodes.length > activeNodes.length && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 bg-background border-border hidden sm:flex"
              onClick={() => setOnlyConnected(!onlyConnected)}
            >
              <Filter className="w-3.5 h-3.5 text-accent" />
              {onlyConnected ? "Toon alle documenten" : "Alleen verbonden"}
            </Button>
          )}

          <div className="relative w-36 sm:w-48 hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="graph-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek document..."
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
            <span className="text-muted-foreground">Raadsdocument</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shrink-0" />
            <span className="text-muted-foreground">Geselecteerd document</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-amber-500 inline-block shrink-0" />
            <span className="text-muted-foreground">Onderlinge documentverbinding</span>
          </div>
        </div>

        {/* Node Hover Tooltip Card */}
        {hoveredNode && (
          <div className="absolute top-3 right-3 p-3 rounded-xl bg-card/95 backdrop-blur-xs border border-border shadow-lg max-w-xs pointer-events-none transition-opacity duration-150">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Document
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
              Klik om document te openen
            </div>
          </div>
        )}

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute bottom-3 right-3 p-3.5 rounded-xl bg-card border border-border shadow-xl max-w-sm w-full text-xs space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent block">
                  Geselecteerd Document
                </span>
                <h5 className="font-bold text-foreground text-sm leading-tight mt-0.5">
                  {selectedNode.label}
                </h5>
                {selectedNode.date && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">Datum: {selectedNode.date}</p>
                )}
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

            {selectedConnectionsWithReasons.length > 0 && (
              <div className="pt-2 border-t border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Verbonden documenten ({selectedConnectionsWithReasons.length}):
                </span>
                <div className="max-h-32 overflow-y-auto space-y-1.5">
                  {selectedConnectionsWithReasons.map(({ node: c, reason }) => (
                    <div
                      key={c.id}
                      className="p-1.5 rounded-lg bg-muted/40 hover:bg-accent/15 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedNode(c);
                        const docMatch = documents.find((d) => d.bestandsnaam === c.id);
                        if (docMatch) {
                          onSelectDocument(docMatch);
                        }
                      }}
                    >
                      <div className="text-[11px] font-semibold text-foreground truncate">
                        • {c.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate pl-2">
                        Verbonden via: <span className="text-accent font-medium">{reason}</span>
                      </div>
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
