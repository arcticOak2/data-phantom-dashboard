import React, { useMemo, useCallback, useEffect, useState } from 'react';
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Panel, 
  MarkerType, 
  Handle,
  useReactFlow
} from 'reactflow';
import { createPortal } from 'react-dom';
import 'reactflow/dist/style.css';

// Helper functions
const getStatusColor = (status) => {
  switch (status) {
    case 'SUCCESS':
      return { bg: '#10b981', text: 'white' }; // Green - success
    case 'FAILED':
      return { bg: '#ef4444', text: 'white' }; // Red - failure
    case 'RUNNING':
      return { bg: '#fbbf24', text: 'black' }; // Bright yellow - active/energetic
    case 'PENDING':
      return { bg: '#60a5fa', text: 'white' }; // Light blue - waiting/queued
    case 'CANCELLED':
      return { bg: '#6b7280', text: 'white' }; // Dark gray - stopped/inactive
    case 'IDLE':
      return { bg: '#a78bfa', text: 'white' }; // Light purple - sleeping/relaxed
    case 'PARTIAL_SUCCESS':
      return { bg: '#f97316', text: 'white' }; // Orange - partial/warning
    case 'UPSTREAM_FAILED':
      return { bg: '#f59e0b', text: 'white' }; // Amber - upstream failure
    case 'UNKNOWN':
    default:
      return { bg: '#9ca3af', text: 'white' }; // Medium gray - unknown
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'SPARK_SQL':
      return (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case 'PY_SPARK':
      return (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case 'PRESTO':
      return (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
    case 'HIVE':
      return (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
        </svg>
      );
    case 'SQL':
      return (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4" />
          <path d="M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z" />
          <path d="M3 12c1 0 2-1 2-2s-1-2-2-2-2 1-2 2 1 2 2 2z" />
          <path d="M12 3c0 1-1 2-2 2s-2 1-2 2 1 2 2 2 2 1 2 2 1-2 2-2 2-1 2-2-1-2-2-2-2-1-2-2z" />
        </svg>
      );
    default:
      return (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11H1l9-9 9 9h-8v7a2 2 0 0 1-2 2H9v-7z" />
          <path d="M20 20h-2a2 2 0 0 1-2-2V9" />
        </svg>
      );
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'PENDING':
      return (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12,6 12,12 16,14" />
        </svg>
      );
    case 'RUNNING':
      return (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case 'COMPLETED':
    case 'SUCCESS':
      return (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 12l2 2 4-4" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
    case 'FAILED':
      return (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      );
    default:
      return (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
  }
};

// Custom Task Node Component
const TaskNode = ({ data, onTooltipShow, onTooltipHide, isSelected = false }) => {
  const statusColors = getStatusColor(data.status);
  
  return (
    <div 
      style={{
        background: isSelected ? 'var(--primary-50)' : 'white',
        border: isSelected ? '2px solid var(--primary-500)' : '1px solid var(--neutral-200)',
        borderRadius: 'var(--radius-sm)',
        padding: '6px',
        width: '90px',
        height: '90px',
        boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onMouseEnter={(e) => {

        e.target.style.transform = 'scale(1.05)';
        e.target.style.boxShadow = 'var(--shadow-md)';
        
        const rect = e.target.getBoundingClientRect();
        onTooltipShow({
          data,
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
      }}
      onMouseLeave={(e) => {

        e.target.style.transform = 'scale(1)';
        e.target.style.boxShadow = 'var(--shadow-sm)';
        onTooltipHide();
      }}
      onMouseOut={(e) => {

        e.target.style.transform = 'scale(1)';
        e.target.style.boxShadow = 'var(--shadow-sm)';
        onTooltipHide();
      }}
    >
      {/* Status Indicator Bar - More Prominent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: statusColors.bg,
        borderRadius: '4px 4px 0 0',
        boxShadow: `0 1px 3px ${statusColors.bg}40`
      }} />
      
      {/* Selection Indicator */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '12px',
          height: '12px',
          background: 'var(--primary-600)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
          border: '1px solid white'
        }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20,6 9,17 4,12" />
          </svg>
        </div>
      )}
      
      {/* Task Type Icon */}
      <div style={{
        width: '20px',
        height: '20px',
        background: 'var(--primary-100)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--primary-700)',
        marginBottom: '6px'
      }}>
        {getTypeIcon(data.type)}
      </div>
      
      {/* Task Name */}
      <div style={{
        fontWeight: '600',
        fontSize: '8px',
        color: 'var(--neutral-900)',
        textAlign: 'center',
        marginBottom: '4px',
        lineHeight: '1.2',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {data.name}
      </div>
      
      {/* Status Indicators - More Prominent */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '2px'
      }}>
        {/* Current Status Indicator - Larger and More Visible */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          padding: '2px 6px',
          background: statusColors.bg,
          borderRadius: '12px',
          border: '1px solid white',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
        }}>
          {/* Status Dot */}
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'white',
            opacity: 0.9
          }} />
          {/* Status Text */}
          <span style={{
            fontSize: '7px',
            fontWeight: '600',
            color: statusColors.text,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {data.status}
          </span>
        </div>
        
        {/* Last Run Status Indicator - If Different */}
        {data.lastRunStatus && data.lastRunStatus !== data.status && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '1px 4px',
            background: getStatusColor(data.lastRunStatus).bg,
            borderRadius: '8px',
            border: '1px solid white',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: 'white',
              opacity: 0.8
            }} />
            <span style={{
              fontSize: '6px',
              fontWeight: '500',
              color: getStatusColor(data.lastRunStatus).text,
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>
              {data.lastRunStatus}
            </span>
          </div>
        )}
      </div>
      

      
      {/* React Flow Handles */}
      <Handle
        type="target"
        position="top"
        style={{
          background: 'var(--primary-500)',
          width: '4px',
          height: '4px',
          border: '1px solid white',
          boxShadow: 'var(--shadow-sm)'
        }}
      />
      <Handle
        type="source"
        position="bottom"
        style={{
          background: 'var(--primary-500)',
          width: '4px',
          height: '4px',
          border: '1px solid white',
          boxShadow: 'var(--shadow-sm)'
        }}
      />
    </div>
  );
};

const TaskGraph = ({ tasks, onTaskClick, selectedTasks = {} }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [tooltip, setTooltip] = useState({ show: false, data: null, x: 0, y: 0 });
  const [tooltipTimeout, setTooltipTimeout] = useState(null);

  // Ensure tasks is always an array
  const safeTasks = Array.isArray(tasks) ? tasks : [];



  // Create node types
  const nodeTypes = {
    taskNode: (props) => (
      <TaskNode 
        {...props} 
        isSelected={selectedTasks[props.data.id] || false}
        onTooltipShow={(tooltipData) => {

          // Clear any existing timeout
          if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            setTooltipTimeout(null);
          }
          setTooltip({ show: true, ...tooltipData });
          
          // Auto-hide after 3 seconds
          const timeout = setTimeout(() => {

            setTooltip({ show: false, data: null, x: 0, y: 0 });
            setTooltipTimeout(null);
          }, 3000);
          setTooltipTimeout(timeout);
        }}
        onTooltipHide={() => {

          // Clear any existing timeout
          if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            setTooltipTimeout(null);
          }
          setTooltip({ show: false, data: null, x: 0, y: 0 });
        }}
      />
    )
  };

  // Convert tasks to React Flow format
  const reactFlowNodes = useMemo(() => {
    if (!safeTasks || safeTasks.length === 0) return [];
    
    return safeTasks.map((task, index) => ({
      id: task.id,
      type: 'taskNode',
      position: { x: index * 120, y: index * 100 },
      data: {
        name: task.name,
        type: task.type,
        status: task.status,
        lastRunStatus: task.lastRunStatus,
        outputLocation: task.outputLocation
      }
    }));
  }, [safeTasks]);

  const reactFlowEdges = useMemo(() => {
    if (!safeTasks || safeTasks.length === 0) return [];
    
    const edges = [];
    safeTasks.forEach(task => {
      if (task.parentId) {
        edges.push({
          id: `${task.parentId}-${task.id}`,
          source: task.parentId,
          target: task.id,
          sourceHandle: 'source',
          targetHandle: 'target',
          type: 'smoothstep',
          style: {
            stroke: 'var(--primary-500)',
            strokeWidth: 2,
            strokeDasharray: '0'
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: 'var(--primary-500)'
          },
          animated: true
        });
      }
    });
    
    return edges;
  }, [safeTasks]);

  // Update React Flow when tasks change
  useEffect(() => {
    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
  }, [reactFlowNodes, reactFlowEdges, setNodes, setEdges]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
    };
  }, [tooltipTimeout]);

  // Hide tooltip when clicking outside or moving mouse away
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltip.show) {

        setTooltip({ show: false, data: null, x: 0, y: 0 });
        if (tooltipTimeout) {
          clearTimeout(tooltipTimeout);
          setTooltipTimeout(null);
        }
      }
    };

    const handleMouseMove = (event) => {
      if (tooltip.show) {
        // Check if mouse is far from the tooltip area
        const distance = Math.sqrt(
          Math.pow(event.clientX - tooltip.x, 2) + 
          Math.pow(event.clientY - tooltip.y, 2)
        );
        
        // If mouse is more than 100px away from tooltip center, hide it
        if (distance > 100) {

          setTooltip({ show: false, data: null, x: 0, y: 0 });
          if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            setTooltipTimeout(null);
          }
        }
      }
    };

    if (tooltip.show) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('mousemove', handleMouseMove);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [tooltip.show, tooltip.x, tooltip.y, tooltipTimeout]);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((event, node) => {

    
    // Hide tooltip when clicking on node
    setTooltip({ show: false, data: null, x: 0, y: 0 });
    
    if (onTaskClick) {
      // Convert React Flow node data back to task format
      const taskData = {
        id: node.id,
        name: node.data.name,
        type: node.data.type,
        status: node.data.status,
        outputLocation: node.data.outputLocation
      };

      onTaskClick(taskData);
    } else {

    }
  }, [onTaskClick]);

  if (!safeTasks || safeTasks.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        color: 'var(--neutral-500)',
        textAlign: 'center',
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--neutral-200)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: 'var(--neutral-100)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3v18h18" />
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
          </svg>
        </div>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: 'var(--neutral-700)',
          margin: '0 0 8px 0'
        }}>
          No Tasks to Visualize
        </h3>
        <p style={{
          fontSize: '14px',
          margin: 0,
          maxWidth: '400px',
          lineHeight: '1.5'
        }}>
          Create some tasks to see their dependencies visualized as a graph
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--neutral-200)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
      height: '500px'
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        style={{
          background: 'white'
        }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: {
            stroke: 'var(--primary-500)',
            strokeWidth: 2
          }
        }}
        elevateEdgesOnSelect={true}
        elevateNodesOnSelect={false}
      >
        {/* Controls */}
        <Controls style={{
          background: 'white',
          border: '1px solid var(--neutral-200)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)'
        }} />
        
        {/* Mini Map */}
        <MiniMap 
          style={{
            background: 'white',
            border: '1px solid var(--neutral-200)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)'
          }}
          nodeColor="var(--primary-500)"
        />
        
        {/* Background */}
        <Background 
          color="var(--neutral-300)"
          gap={10}
          size={1}
        />
        
        {/* Info Panel */}
        <Panel position="top-right" style={{
          background: 'white',
          border: '1px solid var(--neutral-200)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          boxShadow: 'var(--shadow-sm)',
          fontSize: '13px',
          color: 'var(--neutral-700)'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            Task Dependencies
          </div>
          <div style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>
            {safeTasks.length} tasks • {edges.length} connections
          </div>
        </Panel>
      </ReactFlow>
      
      {/* Portal-based Tooltip */}
      {tooltip.show && tooltip.data && createPortal(
        <div style={{
          position: 'fixed',
          left: `${tooltip.x}px`,
          top: `${tooltip.y}px`,
          transform: 'translateX(-50%) translateY(-100%)',
          background: 'var(--neutral-900)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          fontSize: '12px',
          fontWeight: '500',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 9999,
          pointerEvents: 'auto',
          maxWidth: '200px',
          wordWrap: 'break-word',
          whiteSpace: 'normal',
          marginBottom: '8px'
        }}>
          {/* Close Button */}
          <button
            onClick={() => {

              setTooltip({ show: false, data: null, x: 0, y: 0 });
              if (tooltipTimeout) {
                clearTimeout(tooltipTimeout);
                setTooltipTimeout(null);
              }
            }}
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              opacity: 0.7,
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '1'}
            onMouseLeave={(e) => e.target.style.opacity = '0.7'}
          >
            ×
          </button>
          
          <div style={{ fontWeight: '600', marginBottom: '4px', paddingRight: '20px' }}>
            {tooltip.data.name}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '2px' }}>
            Type: {tooltip.data.type.replace('_', ' ')}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '2px' }}>
            Status: {tooltip.data.status}
          </div>
          {tooltip.data.outputLocation && (
            <div style={{ fontSize: '10px', opacity: 0.8, fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}>
              📁 {tooltip.data.outputLocation}
            </div>
          )}
          {/* Tooltip Arrow */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid var(--neutral-900)'
          }} />
        </div>,
        document.body
      )}
    </div>
  );
};

export default TaskGraph;
