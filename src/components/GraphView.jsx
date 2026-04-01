import React, { useMemo, useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls,
  MiniMap,
  MarkerType, 
  ConnectionLineType,
  Handle,
  Position,
  addEdge,
} from 'reactflow';
import { AnimatePresence } from 'framer-motion';
import { MousePointer2, CheckCircle2, AlertCircle, Eye, Grab, ZoomIn } from 'lucide-react';
import 'reactflow/dist/style.css';

// Custom Node - Black with white text, supports highlighting for removed states
const CustomNode = ({ data, selected }) => {
  const isStart = data.label === 'S';
  const showHandles = data.learningMode;
  const isRemoved = data.isRemoved;
  
  return (
    <div
      className="relative group cursor-grab active:cursor-grabbing"
      style={{ width: 80, height: 80 }}
    >
      {/* Main circle */}
      <div 
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: isRemoved ? '#dc2626' : '#111111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: isRemoved 
            ? '3px solid #b91c1c' 
            : selected 
              ? '3px solid #555' 
              : '3px solid #333',
          boxShadow: isRemoved
            ? '0 0 0 4px rgba(220, 38, 38, 0.25), 0 8px 25px rgba(220, 38, 38, 0.3)'
            : selected 
              ? '0 0 0 4px rgba(0,0,0,0.15), 0 8px 25px rgba(0,0,0,0.25)' 
              : '0 4px 15px rgba(0,0,0,0.2)',
          transition: 'all 0.4s ease',
          transform: isRemoved ? 'scale(1.12)' : selected ? 'scale(1.08)' : 'scale(1)',
          position: 'relative',
          overflow: 'hidden',
          animation: isRemoved ? 'pulse-removed 1.5s ease-in-out infinite' : 'none',
        }}
      >
        {/* Subtle inner highlight */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: '50%',
          background: isRemoved 
            ? 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        {/* Strikethrough for removed */}
        {isRemoved && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '10%',
            right: '10%',
            height: 3,
            background: '#fff',
            transform: 'rotate(-45deg)',
            borderRadius: 2,
            opacity: 0.7,
            zIndex: 3,
          }} />
        )}
        
        {/* White text */}
        <span style={{
          color: '#ffffff',
          fontSize: '24px',
          fontWeight: 800,
          fontFamily: 'Inter, sans-serif',
          position: 'relative',
          zIndex: 2,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          opacity: isRemoved ? 0.8 : 1,
        }}>
          {data.label}
        </span>
      </div>

      {/* Removed label */}
      {isRemoved && (
        <div style={{
          position: 'absolute',
          bottom: -20,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '9px',
          fontWeight: 800,
          color: '#dc2626',
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          background: '#fef2f2',
          padding: '1px 6px',
          borderRadius: 4,
          border: '1px solid #fecaca',
        }}>
          REMOVED
        </div>
      )}

      {/* Start symbol indicator */}
      {isStart && !isRemoved && (
        <div style={{
          position: 'absolute',
          top: -6, left: -6, right: -6, bottom: -6,
          borderRadius: '50%',
          border: '2px dashed #999',
          pointerEvents: 'none',
          opacity: 0.5,
        }} />
      )}

      {/* White visible handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{
          width: 14,
          height: 14,
          background: '#ffffff',
          border: '3px solid #111',
          borderRadius: '50%',
          top: -7,
          opacity: showHandles ? 1 : 0,
          pointerEvents: showHandles ? 'auto' : 'none',
          cursor: showHandles ? 'crosshair' : 'default',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          transition: 'opacity 0.2s ease',
        }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{
          width: 14,
          height: 14,
          background: '#ffffff',
          border: '3px solid #111',
          borderRadius: '50%',
          bottom: -7,
          opacity: showHandles ? 1 : 0,
          pointerEvents: showHandles ? 'auto' : 'none',
          cursor: showHandles ? 'crosshair' : 'default',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          transition: 'opacity 0.2s ease',
        }}
      />

      {showHandles && (
        <div style={{
          position: 'absolute',
          bottom: -22,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '9px',
          fontWeight: 700,
          color: '#999',
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          drag to connect
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  customNode: CustomNode,
};

const GraphView = ({ grammar, learningMode, removedSymbols = [] }) => {
  const [manualEdges, setManualEdges] = useState([]);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setManualEdges([]);
    setFeedback(null);
  }, [grammar, learningMode]);

  const { nodes, autoEdges } = useMemo(() => {
    const nonTerminals = Object.keys(grammar);
    // Include removed symbols in the node list to show them highlighted
    const allSymbols = [...new Set([...nonTerminals, ...removedSymbols])];
    const nodes = [];
    const autoEdges = [];
    const centerX = 400;
    const centerY = 300;
    const radius = Math.min(250, 80 + allSymbols.length * 40);

    allSymbols.forEach((v, index) => {
      const angle = (index / allSymbols.length) * 2 * Math.PI - Math.PI / 2;
      const isRemoved = removedSymbols.includes(v);
      nodes.push({
        id: v,
        type: 'customNode',
        data: { label: v, index, learningMode, isRemoved },
        position: { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) },
        draggable: true,
      });

      if (!learningMode && !isRemoved) {
        (grammar[v] || []).forEach(rule => {
          for (const char of rule) {
            if (nonTerminals.includes(char)) {
              const edgeId = `e-${v}-${char}`;
              if (!autoEdges.find(e => e.id === edgeId)) {
                autoEdges.push({
                  id: edgeId,
                  source: v,
                  target: char,
                  animated: true,
                  type: 'straight',
                  markerEnd: { type: MarkerType.ArrowClosed, color: '#333' },
                  style: { 
                    stroke: '#444', 
                    strokeWidth: 2,
                    strokeDasharray: '8 4',
                  },
                  label: `${v}→${char}`,
                  labelStyle: { fill: '#111', fontSize: 10, fontWeight: 600, fontFamily: 'Inter' },
                  labelBgStyle: { fill: '#f5f5f5', stroke: '#ddd', strokeWidth: 1 },
                  labelBgPadding: [6, 4],
                  labelBgBorderRadius: 6,
                });
              }
            }
          }
        });
      }
    });

    return { nodes, autoEdges };
  }, [grammar, learningMode, removedSymbols]);

  const onConnect = useCallback((params) => {
    const { source, target } = params;
    const isValid = (grammar[source] || []).some(rule => rule.includes(target));
    
    if (isValid) {
      setManualEdges(eds => addEdge({ 
        ...params, 
        animated: true, 
        type: 'straight',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#16a34a' }, 
        style: { stroke: '#16a34a', strokeWidth: 3, strokeDasharray: '8 4' },
        label: '✓',
        labelStyle: { fill: '#16a34a', fontSize: 14, fontWeight: 700 },
        labelBgStyle: { fill: '#f0fdf4', stroke: '#bbf7d0', strokeWidth: 1 },
        labelBgPadding: [4, 4],
        labelBgBorderRadius: 8,
      }, eds));
      setFeedback({ type: 'success', message: `Correct! ${source} → ${target} is a valid production.` });
    } else {
      setFeedback({ type: 'error', message: `Incorrect! There's no production from ${source} to ${target}.` });
    }
    
    setTimeout(() => setFeedback(null), 3000);
  }, [grammar]);

  const finalEdges = learningMode ? manualEdges : autoEdges;

  return (
    <div className="h-full w-full bg-white/80 relative overflow-hidden flex flex-col">
      {/* Mode Overlay */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none space-y-3" style={{ maxWidth: 320 }}>
        <div style={{
          padding: '10px 16px',
          borderRadius: 12,
          border: '1px solid',
          borderColor: learningMode ? '#333' : '#e5e5e5',
          background: learningMode ? 'rgba(83, 6, 6, 0.92)' : 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
          pointerEvents: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            {learningMode 
              ? <MousePointer2 style={{ width: 16, height: 16, color: '#ccc' }} /> 
              : <Eye style={{ width: 16, height: 16, color: '#555' }} />}
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: learningMode ? '#fff' : '#333',
            }}>
              {learningMode ? 'Learning Mode' : 'Visualization Mode'}
            </span>
          </div>
          <p style={{
            fontSize: 11,
            color: learningMode ? '#aaa' : '#777',
            lineHeight: 1.4,
            margin: 0,
          }}>
            {learningMode 
              ? '🎯 Drag from bottom handle to top handle of another node' 
              : '📊 Relationships shown automatically. Drag nodes to rearrange.'}
          </p>
        </div>

        {learningMode && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 12,
            border: '1px solid #e5e5e5',
            background: 'rgba(255,255,255,0.92)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            pointerEvents: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#8c0404', fontWeight: 500 }}>
              <Grab style={{ width: 14, height: 14 }} />
              Tip: Connect nodes based on the grammar rules
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            background: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            pointerEvents: 'auto',
          }}>
            {feedback.type === 'success' 
              ? <CheckCircle2 style={{ width: 20, height: 20, color: '#16a34a', flexShrink: 0 }} /> 
              : <AlertCircle style={{ width: 20, height: 20, color: '#dc2626', flexShrink: 0 }} />}
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
              lineHeight: 1.3,
            }}>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Zoom Hint */}
      <div className="absolute bottom-4 right-16 z-20 pointer-events-none" style={{
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#999', fontWeight: 500,
      }}>
        <ZoomIn style={{ width: 12, height: 12 }} />
        Scroll to zoom • Drag to pan
      </div>

      <ReactFlow
        nodes={nodes}
        edges={finalEdges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        className="flex-1"
        nodesDraggable={true}
        nodesConnectable={learningMode}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
        connectionLineStyle={{ stroke: '#555', strokeWidth: 2, strokeDasharray: '8 4' }}
        connectionLineType="straight"
      >
        <Background color="#e5e5e5" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap 
          nodeColor={() => '#111'}
          maskColor="rgba(255, 255, 255, 0.7)"
          style={{ borderRadius: 12, border: '1px solid #e5e5e5' }}
        />
      </ReactFlow>
    </div>
  );
};

export default GraphView;
