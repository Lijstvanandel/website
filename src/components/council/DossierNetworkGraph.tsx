import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
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
  Move,
  SlidersHorizontal,
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

type SpacingMode = "compact" | "ruim" | "extra-ruim";

const VIRTUAL_CENTER_X = 1400;
const VIRTUAL_CENTER_Y = 950;

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
  const [spacingMode, setSpacingMode] = useState<SpacingMode>("ruim");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dragging state
  const dragModeRef = useRef<"none" | "pan" | "node">("none");
  const draggedNodeRef = useRef<SimNode | null>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const hasMovedSignificantRef = useRef(false);
  const [isCursorGrabbing, setIsCursorGrabbing] = useState(false);

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

  // Spacing multiplier: default "ruim" provides generous breathing space
  const spacingMultiplier = useMemo(() => {
    switch (spacingMode) {
      case "compact":
        return 1.0;
      case "extra-ruim":
        return 2.35;
      case "ruim":
      default:
        return 1.75;
    }
  }, [spacingMode]);

  // Fit view automatically to encompass settled nodes with comfortable margins
  const fitView = useCallback((customNodes?: SimNode[]) => {
    const targetNodes = customNodes || simNodesRef.current;
    if (!targetNodes || targetNodes.length === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    targetNodes.forEach((n) => {
      minX = Math.min(minX, n.x - 140);
      maxX = Math.max(maxX, n.x + 140);
      minY = Math.min(minY, n.y - 70);
      maxY = Math.max(maxY, n.y + 70);
    });

    const bWidth = Math.max(maxX - minX + 160, 450);
    const bHeight = Math.max(maxY - minY + 160, 350);

    const rect = containerRef.current?.getBoundingClientRect();
    const viewWidth = rect?.width || 800;
    const viewHeight = rect?.height || 650;

    const scaleX = viewWidth / bWidth;
    const scaleY = viewHeight / bHeight;
    // Keep scale between 0.35 and 1.12 to prevent extreme zoom-in for single files
    const idealZoom = Math.min(Math.max(Math.min(scaleX, scaleY) * 0.9, 0.35), 1.12);

    const bCenterX = (minX + maxX) / 2;
    const bCenterY = (minY + maxY) / 2;

    setZoom(idealZoom);
    setPan({
      x: (VIRTUAL_CENTER_X - bCenterX) * idealZoom,
      y: (VIRTUAL_CENTER_Y - bCenterY) * idealZoom,
    });
  }, []);

  // Initialize simulation nodes with spacious circular / phyllotaxis layout and run spring relaxation
  useEffect(() => {
    if (!activeNodes || activeNodes.length === 0) {
      simNodesRef.current = [];
      return;
    }

    const count = activeNodes.length;
    const mult = spacingMultiplier;

    // Initial placement with generous distance based on count
    const simNodes: SimNode[] = activeNodes.map((node, i) => {
      let x = VIRTUAL_CENTER_X;
      let y = VIRTUAL_CENTER_Y;

      if (count === 1) {
        x = VIRTUAL_CENTER_X;
        y = VIRTUAL_CENTER_Y;
      } else if (count <= 7) {
        // Single wide ring
        const radius = Math.max(220, count * 55) * mult;
        const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
        x = VIRTUAL_CENTER_X + Math.cos(angle) * radius;
        y = VIRTUAL_CENTER_Y + Math.sin(angle) * radius * 0.85;
      } else if (count <= 18) {
        // Two concentric rings
        const innerCount = Math.ceil(count * 0.4);
        const isInner = i < innerCount;
        const ringIndex = isInner ? i : i - innerCount;
        const ringTotal = isInner ? innerCount : count - innerCount;
        const radius = (isInner ? 250 : 480) * mult;
        const angleOffset = isInner ? 0 : Math.PI / ringTotal;
        const angle = (ringIndex / ringTotal) * 2 * Math.PI - Math.PI / 2 + angleOffset;
        x = VIRTUAL_CENTER_X + Math.cos(angle) * radius;
        y = VIRTUAL_CENTER_Y + Math.sin(angle) * radius * 0.85;
      } else {
        // Golden phyllotaxis spiral distribution
        const spiralRadius = 110 * mult * Math.sqrt(i + 1);
        const spiralAngle = i * 2.399963; // 137.508 degrees
        x = VIRTUAL_CENTER_X + Math.cos(spiralAngle) * spiralRadius;
        y = VIRTUAL_CENTER_Y + Math.sin(spiralAngle) * spiralRadius * 0.85;
      }

      // Add gentle random jitter so symmetrical collinear nodes break apart cleanly
      x += (Math.random() - 0.5) * 16;
      y += (Math.random() - 0.5) * 16;

      return {
        ...node,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 17,
      };
    });

    simNodesRef.current = simNodes;

    // Run generous force relaxation with cooling
    const maxIterations = 130;
    const nodeMap = new Map<string, SimNode>();
    simNodes.forEach((n) => nodeMap.set(n.id, n));

    const minDist = 240 * mult;
    const targetDist = 320 * mult;

    for (let iter = 0; iter < maxIterations; iter++) {
      const alpha = Math.pow((maxIterations - iter) / maxIterations, 1.4);

      // 1. Repulsion between all node pairs
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const dx = simNodes[j].x - simNodes[i].x;
          const dy = simNodes[j].y - simNodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          // Inverse-square Coulomb repulsion
          const repForce = (44000 * mult) / (dist * dist + 400);
          let fx = (dx / dist) * repForce;
          let fy = (dy / dist) * repForce;

          // Proximity collision repulsion
          if (dist < minDist) {
            const push = ((minDist - dist) / dist) * 0.5 * minDist;
            fx += (dx / dist) * push;
            fy += (dy / dist) * push;
          }

          // Horizontal clearance for wide document labels
          const horizontalTarget = 280 * mult;
          const hDist = Math.abs(dx);
          if (Math.abs(dy) < 65 && hDist < horizontalTarget) {
            const hPush = ((horizontalTarget - hDist) / horizontalTarget) * 45 * (dx >= 0 ? 1 : -1);
            fx += hPush;
          }

          simNodes[i].x -= fx * alpha * 0.5;
          simNodes[i].y -= fy * alpha * 0.5;
          simNodes[j].x += fx * alpha * 0.5;
          simNodes[j].y += fy * alpha * 0.5;
        }
      }

      // 2. Edge attraction between connected documents
      activeEdges.forEach((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const pull = ((dist - targetDist) / dist) * 0.04 * alpha * dist;
          source.x += (dx / dist) * pull;
          source.y += (dy / dist) * pull;
          target.x -= (dx / dist) * pull;
          target.y -= (dy / dist) * pull;
        }
      });

      // 3. Gentle center gravity to keep entire graph centered
      simNodes.forEach((node) => {
        node.x += (VIRTUAL_CENTER_X - node.x) * 0.003 * alpha;
        node.y += (VIRTUAL_CENTER_Y - node.y) * 0.003 * alpha;
      });
    }

    // Auto-fit to view with comfortable bounds
    fitView(simNodes);
  }, [activeNodes, activeEdges, spacingMultiplier, fitView]);

  // Handle canvas drawing (60fps requestAnimationFrame loop)
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

      // Apply Pan and Zoom centered around VIRTUAL_CENTER
      ctx.translate(rect.width / 2 + pan.x, rect.height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-VIRTUAL_CENTER_X, -VIRTUAL_CENTER_Y);

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
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.95;
        } else if (activeHighlightId) {
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.12;
        } else {
          ctx.strokeStyle = "#64748b";
          ctx.lineWidth = 1.8;
          ctx.globalAlpha = 0.4;
        }
        ctx.stroke();

        // If highlighted, draw label badge on the edge
        if (isHighlighted && edge.label) {
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          const edgeText = edge.label.length > 40 ? edge.label.substring(0, 37) + "..." : edge.label;

          ctx.save();
          ctx.font = "600 11px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const textWidth = ctx.measureText(edgeText).width;
          const badgeW = textWidth + 14;
          const badgeH = 20;

          ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
          if (ctx.roundRect) {
            ctx.roundRect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 6);
          } else {
            ctx.fillRect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH);
          }
          ctx.fill();

          ctx.strokeStyle = "#c6a858";
          ctx.lineWidth = 1;
          if (ctx.roundRect) {
            ctx.roundRect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 6);
            ctx.stroke();
          }

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
        ctx.lineWidth = isSelected ? 3.5 : isHovered ? 3 : 1.8;
        ctx.strokeStyle = isSelected
          ? "#ffffff"
          : isHovered
          ? "#fef08a"
          : isConnectedToActive
          ? "#7dd3fc"
          : "rgba(255,255,255,0.85)";
        ctx.stroke();

        // Inner document icon mark (mini document outline)
        ctx.fillStyle = isSelected ? "#0f172a" : "#ffffff";
        ctx.fillRect(node.x - 4, node.y - 5.5, 8, 11);
        ctx.fillStyle = isSelected ? "#c6a858" : "#1e40af";
        ctx.fillRect(node.x - 2.5, node.y - 3.5, 5, 1.4);
        ctx.fillRect(node.x - 2.5, node.y - 1, 5, 1.4);
        ctx.fillRect(node.x - 2.5, node.y + 1.5, 3, 1.4);

        // Document Label below node
        const showFull = isHovered || isSelected;
        const cleanName = node.label.replace(/\.pdf$/i, "");
        const labelText =
          cleanName.length > 34 && !showFull ? cleanName.substring(0, 32) + "..." : cleanName;

        ctx.font = isSelected || isHovered ? "700 11.5px system-ui, sans-serif" : "600 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        // Label background pill with crisp contrast
        const textMetrics = ctx.measureText(labelText);
        const bgWidth = textMetrics.width + 14;
        const bgHeight = 18;
        const bgX = node.x - bgWidth / 2;
        const bgY = node.y + r + 6;

        ctx.fillStyle =
          isHovered || isSelected
            ? "rgba(15, 23, 42, 0.96)"
            : "rgba(255, 255, 255, 0.94)";
        if (ctx.roundRect) {
          ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 5);
        } else {
          ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        }
        ctx.fill();

        ctx.strokeStyle =
          isHovered || isSelected
            ? "#c6a858"
            : "rgba(148, 163, 184, 0.4)";
        ctx.lineWidth = 1;
        if (ctx.roundRect) {
          ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 5);
          ctx.stroke();
        }

        ctx.fillStyle = isHovered || isSelected ? "#ffffff" : "#0f172a";
        ctx.fillText(labelText, node.x, bgY + 2.5);

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

  // Convert client mouse pos to virtual canvas pos (fixing Retina DPR offset)
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const virtX = (mouseX - (rect.width / 2 + pan.x)) / zoom + VIRTUAL_CENTER_X;
    const virtY = (mouseY - (rect.height / 2 + pan.y)) / zoom + VIRTUAL_CENTER_Y;

    return { x: virtX, y: virtY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (dragModeRef.current === "node" && draggedNodeRef.current) {
      hasMovedSignificantRef.current = true;
      draggedNodeRef.current.x = x;
      draggedNodeRef.current.y = y;
      return;
    }

    if (dragModeRef.current === "pan") {
      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedSignificantRef.current = true;
      }
      setPan((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Hit-test nodes on hover
    let hit: SimNode | null = null;
    for (const node of simNodesRef.current) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy <= (node.radius + 10) * (node.radius + 10)) {
        hit = node;
        break;
      }
    }
    setHoveredNode(hit);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    hasMovedSignificantRef.current = false;

    // Check if clicked directly on a node to drag it
    let hit: SimNode | null = null;
    for (const node of simNodesRef.current) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy <= (node.radius + 10) * (node.radius + 10)) {
        hit = node;
        break;
      }
    }

    if (hit) {
      dragModeRef.current = "node";
      draggedNodeRef.current = hit;
      setIsCursorGrabbing(true);
    } else {
      dragModeRef.current = "pan";
      draggedNodeRef.current = null;
      setIsCursorGrabbing(true);
    }
  };

  const handleMouseUp = () => {
    if (dragModeRef.current === "node" && draggedNodeRef.current && !hasMovedSignificantRef.current) {
      // Pure click on node without dragging: open the document!
      const clicked = draggedNodeRef.current;
      setSelectedNode(clicked);
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
    } else if (dragModeRef.current === "pan" && !hasMovedSignificantRef.current) {
      // Clicked on blank canvas
      setSelectedNode(null);
    }

    dragModeRef.current = "none";
    draggedNodeRef.current = null;
    setIsCursorGrabbing(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((z) => Math.min(Math.max(z * zoomFactor, 0.25), 3.5));
  };

  const resetView = () => {
    setSelectedNode(null);
    fitView();
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
        isFullscreen ? "fixed inset-2 z-50 h-[96vh] shadow-2xl" : "h-[650px] sm:h-[680px] w-full"
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-600/15 text-blue-600 dark:text-blue-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
              <span>Interactieve Relatiekaart & Netwerkgraaf</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                Ruime weergave
              </span>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {activeNodes.length} documenten • {activeEdges.length} onderlinge verbindingen • Sleep om te herschikken
            </p>
          </div>
        </div>

        {/* Spacing & Controls Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Spacing selector (Compact / Ruim / Extra Ruim) */}
          <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1 text-xs shadow-2xs">
            <span className="text-[10px] text-muted-foreground px-1.5 font-medium flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-accent" />
              Spreiding:
            </span>
            <button
              type="button"
              id="btn-spacing-compact"
              onClick={() => setSpacingMode("compact")}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                spacingMode === "compact"
                  ? "bg-accent/20 text-accent font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Compacte weergave"
            >
              Compact
            </button>
            <button
              type="button"
              id="btn-spacing-ruim"
              onClick={() => setSpacingMode("ruim")}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                spacingMode === "ruim"
                  ? "bg-accent/20 text-accent font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Ruime opzet (aanbevolen)"
            >
              Ruim
            </button>
            <button
              type="button"
              id="btn-spacing-extra-ruim"
              onClick={() => setSpacingMode("extra-ruim")}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                spacingMode === "extra-ruim"
                  ? "bg-accent/20 text-accent font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Extra ruime opzet voor grote dossiers"
            >
              Extra ruim
            </button>
          </div>

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

          <div className="relative w-36 sm:w-44 hidden md:block">
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
              onClick={() => setZoom((z) => Math.min(z * 1.25, 3.5))}
              title="Inzoomen"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              id="btn-graph-zoom-out"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setZoom((z) => Math.max(z / 1.25, 0.25))}
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
              title="Centreren & Weergave herstellen"
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
      <div
        className={`relative flex-1 bg-slate-950/5 dark:bg-black/40 overflow-hidden ${
          isCursorGrabbing ? "cursor-grabbing" : hoveredNode ? "cursor-pointer" : "cursor-grab"
        }`}
      >
        <canvas
          id="dossier-graph-canvas"
          ref={canvasRef}
          className="w-full h-full block"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        />

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 p-2.5 rounded-xl bg-card/90 backdrop-blur-xs border border-border text-[11px] shadow-sm space-y-1.5 pointer-events-none">
          <div className="font-semibold text-foreground text-[10px] uppercase tracking-wider mb-1">
            Legenda & Bediening
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
            <span className="text-muted-foreground">Onderlinge verbinding</span>
          </div>
          <div className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border flex items-center gap-1">
            <Move className="w-3 h-3 text-accent" />
            <span>Sleep een document om vrij te verplaatsen</span>
          </div>
        </div>

        {/* Node Hover Tooltip Card */}
        {hoveredNode && !isCursorGrabbing && (
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
              Klik om document te openen • Sleep om te verplaatsen
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
