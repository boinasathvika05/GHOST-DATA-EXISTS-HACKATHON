import React, { useState, useEffect, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  status?: string;
  system_id?: string;
  x?: number;
  y?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  risk?: boolean;
}

interface IdentityGraphViewProps {
  onSelectCase?: (caseId: string) => void;
}

export const IdentityGraphView: React.FC<IdentityGraphViewProps> = ({ onSelectCase }) => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [search, setSearch] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    fetch('/api/graph')
      .then((res) => res.json())
      .then((data) => {
        // Compute circular / organic coordinates for nodes
        const rawNodes: GraphNode[] = data.nodes || [];
        const rawEdges: GraphEdge[] = data.edges || [];

        // Deduplicate edges by ID
        const seenEdges = new Set<string>();
        const uniqueEdges: GraphEdge[] = [];
        for (const e of rawEdges) {
          if (!seenEdges.has(e.id)) {
            seenEdges.add(e.id);
            uniqueEdges.push(e);
          }
        }

        const systemNodes = rawNodes.filter((n) => n.type === 'system');
        const identityNodes = rawNodes.filter((n) => n.type === 'identity');
        const resourceNodes = rawNodes.filter((n) => n.type !== 'system' && n.type !== 'identity');

        // Central hub for systems
        const width = 900;
        const height = 550;
        const centerX = width / 2;
        const centerY = height / 2;

        systemNodes.forEach((node, i) => {
          const angle = (i / Math.max(systemNodes.length, 1)) * 2 * Math.PI;
          node.x = centerX + 180 * Math.cos(angle);
          node.y = centerY + 180 * Math.sin(angle);
        });

        identityNodes.forEach((node, i) => {
          const angle = (i / Math.max(identityNodes.length, 1)) * 2 * Math.PI;
          node.x = centerX + 340 * Math.cos(angle);
          node.y = centerY + 340 * Math.sin(angle);
        });

        resourceNodes.forEach((node, i) => {
          const angle = (i / Math.max(resourceNodes.length, 1)) * 2 * Math.PI + 0.3;
          node.x = centerX + 260 * Math.cos(angle);
          node.y = centerY + 260 * Math.sin(angle);
        });

        setNodes(rawNodes);
        setEdges(uniqueEdges);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching graph data:', err);
        setLoading(false);
      });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  const getNodeColor = (node: GraphNode) => {
    if (node.type === 'system') return '#8B7CFF';
    if (node.type === 'identity') {
      if (node.status === 'COMPLETE') return '#10B981';
      if (node.status === 'INCOMPLETE') return '#F59E0B';
      return '#929DB0';
    }
    if (node.status === 'PRESENT') return '#EF4444';
    if (node.status === 'ACTIVE') return '#59D9FF';
    if (node.status === 'BLOCKED' || node.status === 'DISABLED') return '#10B981';
    return '#8B7CFF';
  };

  const filteredNodes = nodes.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q);
  });

  const matchingIds = new Set(filteredNodes.map((n) => n.id));

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#101521] p-3 rounded-xl border border-[#1C2436]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#929DB0]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B7CFF]"></span>
            <span>Systems</span>
            <span className="text-[#1C2436]">·</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>Verified Compliant</span>
            <span className="text-[#1C2436]">·</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
            <span>Ghost Data Risk</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#929DB0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter node or email..."
              className="w-full bg-[#080B12] border border-[#1C2436] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#929DB0] focus:outline-none focus:border-[#8B7CFF]"
            />
          </div>

          {/* Zoom & Pan Controls */}
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
            className="p-1.5 rounded bg-[#151C2A] text-[#929DB0] hover:text-white border border-[#1C2436]"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
            className="p-1.5 rounded bg-[#151C2A] text-[#929DB0] hover:text-white border border-[#1C2436]"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded bg-[#151C2A] text-[#929DB0] hover:text-white border border-[#1C2436]"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Graph Canvas Area */}
      <div
        className="relative h-[650px] bg-[#080B12] rounded-xl border border-[#1C2436] overflow-hidden select-none cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-[#929DB0]">
            Building Identity & Evidence Graph...
          </div>
        ) : (
          <svg
            className="w-full h-full"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            {/* Edges */}
            {edges.map((edge, idx) => {
              const src = nodes.find((n) => n.id === edge.source);
              const tgt = nodes.find((n) => n.id === edge.target);
              if (!src || !tgt || src.x === undefined || tgt.x === undefined) return null;

              const isHighlighted = search && (matchingIds.has(src.id) || matchingIds.has(tgt.id));

              return (
                <line
                  key={`${edge.id || `${edge.source}-${edge.target}`}-${idx}`}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={edge.risk ? '#EF4444' : '#1C2436'}
                  strokeWidth={edge.risk ? 1.5 : 0.8}
                  strokeDasharray={edge.risk ? '4,4' : undefined}
                  opacity={search && !isHighlighted ? 0.15 : 0.6}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              if (node.x === undefined || node.y === undefined) return null;
              const isSelected = selectedNode?.id === node.id;
              const isMatch = !search || matchingIds.has(node.id);
              const color = getNodeColor(node);
              const radius = node.type === 'system' ? 14 : node.type === 'identity' ? 9 : 6;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                  }}
                  className="cursor-pointer"
                  opacity={isMatch ? 1 : 0.2}
                >
                  <circle
                    r={radius}
                    fill={color}
                    fillOpacity={0.85}
                    stroke={isSelected ? '#FFFFFF' : '#080B12'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <text
                    y={radius + 11}
                    textAnchor="middle"
                    fill="#F3F5FA"
                    fontSize={node.type === 'system' ? '10px' : '8.5px'}
                    fontFamily="Geist Mono, monospace"
                    className="pointer-events-none select-none"
                  >
                    {node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Selected Node Details Floating Overlay */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 max-w-sm bg-[#101521]/95 backdrop-blur-md rounded-xl p-4 border border-[#1C2436] shadow-2xl z-10 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-white uppercase">
                {selectedNode.type}: {selectedNode.label}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[#929DB0] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 text-[#929DB0] font-mono text-[11px]">
              <div>ID: <strong className="text-white">{selectedNode.id}</strong></div>
              {selectedNode.system_id && <div>System: <strong className="text-[#8B7CFF]">{selectedNode.system_id}</strong></div>}
              {selectedNode.status && (
                <div>
                  Observed State:{' '}
                  <strong className={selectedNode.status === 'PRESENT' ? 'text-[#EF4444]' : 'text-emerald-400'}>
                    {selectedNode.status}
                  </strong>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
