// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Paper,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Zoom,
  Fade,
} from '@mui/material';
import {
  LightbulbOutlined,
  Add,
  Edit,
  Delete,
  Save,
  Close,
  DragIndicator,
  AutoGraph,
} from '@mui/icons-material';
import { supabase } from '@/integrations/supabase/client';

interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  children: MindMapNode[];
  parentId?: string;
  color?: string;
  level?: number;
}

export const StrategicMindMap: React.FC = () => {
  const [nodes, setNodes] = useState<MindMapNode[]>([
    { 
      id: '1', 
      text: 'Craven Delivery', 
      x: 500, 
      y: 300, 
      children: [],
      level: 0,
      color: '#1976d2'
    }
  ]);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [editingNode, setEditingNode] = useState<MindMapNode | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMindMap();
  }, []);

  const fetchMindMap = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ceo_mindmaps')
        .select('*')
        .eq('map_name', 'Strategic Overview')
        .maybeSingle();

      if (data && !error && data.map_data) {
        if (Array.isArray(data.map_data) && data.map_data.length > 0) {
          setNodes(data.map_data);
        }
      }
    } catch (error: any) {
      console.warn('Mind map table not available yet:', error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  const saveMindMap = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('ceo_mindmaps')
        .upsert({
          map_name: 'Strategic Overview',
          map_data: nodes,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'map_name'
        });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setError('Mind map table not created yet. Please run DEPLOY-MINDMAP.sql first.');
        } else {
          throw error;
        }
      } else {
        setError(null);
      }
    } catch (error: any) {
      console.error('Error saving mind map:', error);
      setError('Failed to save mind map: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const findNode = useCallback((nodeList: MindMapNode[], id: string): MindMapNode | null => {
    for (const node of nodeList) {
      if (node.id === id) return node;
      if (node.children && node.children.length > 0) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const updateNode = useCallback((nodeList: MindMapNode[], id: string, updater: (node: MindMapNode) => MindMapNode): MindMapNode[] => {
    return nodeList.map(node => {
      if (node.id === id) {
        const updated = updater(node);
        return { ...updated, children: updated.children || [] };
      }
      if (node.children && node.children.length > 0) {
        return { ...node, children: updateNode(node.children, id, updater) };
      }
      return { ...node, children: node.children || [] };
    });
  }, []);

  const addChildNode = (parentId: string) => {
    const parentNode = findNode(nodes, parentId);
    if (!parentNode) return;

    const newId = Date.now().toString();
    const childCount = (parentNode.children || []).length;
    const angle = (childCount * 60) * (Math.PI / 180);
    const radius = 180;
    const level = (parentNode.level || 0) + 1;

    const colors = [
      '#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', 
      '#d32f2f', '#0288d1', '#388e3c', '#f57c00'
    ];

    const newNode: MindMapNode = {
      id: newId,
      text: 'New Node',
      x: (parentNode.x || 0) + Math.cos(angle) * radius,
      y: (parentNode.y || 0) + Math.sin(angle) * radius,
      children: [],
      parentId: parentId,
      level: level,
      color: colors[level % colors.length]
    };

    setNodes(prevNodes => updateNode(prevNodes, parentId, node => ({
      ...node,
      children: [...(node.children || []), newNode]
    })));

    setSelectedNode(newNode);
  };

  const deleteNode = (id: string) => {
    if (id === '1') {
      setError('Cannot delete root node!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setNodes(nodeList => {
      const updated = [...nodeList];
      const deleteFromChildren = (children: MindMapNode[]): MindMapNode[] => {
        return (children || []).filter(child => {
          if (child.id === id) return false;
          if (child.children && child.children.length > 0) {
            child.children = deleteFromChildren(child.children);
          }
          return true;
        });
      };
      if (updated[0]) {
        updated[0] = { ...updated[0], children: deleteFromChildren(updated[0].children || []) };
      }
      return updated;
    });

    if (selectedNode?.id === id) {
      setSelectedNode(null);
    }
  };

  const handleEdit = (node: MindMapNode) => {
    setEditingNode(node);
    setEditText(node.text);
  };

  const handleSaveEdit = () => {
    if (!editingNode || !editText.trim()) return;

    setNodes(prevNodes => updateNode(prevNodes, editingNode.id, node => ({
      ...node,
      text: editText.trim()
    })));

    setEditingNode(null);
    setEditText('');
    
    if (selectedNode?.id === editingNode.id) {
      setSelectedNode({ ...selectedNode, text: editText.trim() });
    }
  };

  const handleNodeClick = (node: MindMapNode, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedNode(node);
  };

  const handleNodeDragStart = (node: MindMapNode, event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDragging(true);
    setSelectedNode(node);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: event.clientX - rect.left - (node.x || 0),
        y: event.clientY - rect.top - (node.y || 0)
      });
    }
  };

  const handleNodeDrag = useCallback((event: MouseEvent) => {
    if (!isDragging || !selectedNode) return;
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const newX = event.clientX - rect.left - dragOffset.x;
      const newY = event.clientY - rect.top - dragOffset.y;
      
      setNodes(prevNodes => updateNode(prevNodes, selectedNode.id, node => ({
        ...node,
        x: newX,
        y: newY
      })));
    }
  }, [isDragging, selectedNode, dragOffset, updateNode]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleNodeDrag);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleNodeDrag);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleNodeDrag, handleMouseUp]);

  const renderNode = (node: MindMapNode, depth: number = 0): JSX.Element | null => {
    if (!node || !node.id || !node.text) return null;
    if (depth > 8) return null;
    
    const nodeSize = depth === 0 ? { width: 140, height: 90 } : { width: 120, height: 70 };
    const isSelected = selectedNode?.id === node.id;
    const fontSize = depth === 0 ? 18 : 14;
    
    return (
      <g key={node.id}>
        {/* Render connections to children */}
        {(node.children || []).map(child => {
          if (!child || !child.id) return null;
          return (
            <line
              key={`line-${node.id}-${child.id}`}
              x1={node.x || 0}
              y1={(node.y || 0) + nodeSize.height / 2}
              x2={child.x || 0}
              y2={(child.y || 0) - nodeSize.height / 2}
              stroke="#90caf9"
              strokeWidth={isSelected ? 3 : 2}
              strokeDasharray={depth > 2 ? "5,5" : "0"}
              opacity={0.6}
              style={{ transition: 'all 0.3s ease' }}
            />
          );
        })}
        
        {/* Render child nodes */}
        {(node.children || []).map(child => renderNode(child, depth + 1))}
        
        {/* Render node */}
        <g
          onClick={(e) => handleNodeClick(node, e)}
          onMouseDown={(e) => handleNodeDragStart(node, e)}
          style={{ cursor: 'move' }}
        >
          {/* Node shadow */}
          <rect
            x={(node.x || 0) - nodeSize.width / 2 + 2}
            y={(node.y || 0) - nodeSize.height / 2 + 2}
            width={nodeSize.width}
            height={nodeSize.height}
            rx="12"
            fill="rgba(0,0,0,0.1)"
            opacity={0.3}
          />
          
          {/* Node background */}
          <rect
            x={(node.x || 0) - nodeSize.width / 2}
            y={(node.y || 0) - nodeSize.height / 2}
            width={nodeSize.width}
            height={nodeSize.height}
            rx="12"
            fill={node.color || (depth === 0 ? '#1976d2' : '#9c27b0')}
            stroke={isSelected ? '#ff9800' : '#ffffff'}
            strokeWidth={isSelected ? 4 : 2}
            style={{
              transition: 'all 0.3s ease',
              filter: isSelected ? 'drop-shadow(0 4px 12px rgba(255, 152, 0, 0.4))' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))',
            }}
          />
          
          {/* Node text */}
          <text
            x={node.x || 0}
            y={node.y || 0}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={fontSize}
            fontWeight={depth === 0 ? 700 : 600}
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            {node.text || 'Untitled'}
          </text>
          
          {/* Drag indicator */}
          {isSelected && (
            <circle
              cx={(node.x || 0) + nodeSize.width / 2 - 8}
              cy={(node.y || 0) - nodeSize.height / 2 + 8}
              r={6}
              fill="#ff9800"
              opacity={0.8}
            />
          )}
        </g>
      </g>
    );
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LightbulbOutlined sx={{ fontSize: 32, color: 'primary.main' }} />
            Strategic Mind Map
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Visualize strategic relationships and brainstorm initiatives
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={saveMindMap}
          disabled={loading}
          sx={{
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
              boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
            },
          }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Save Mind Map'}
        </Button>
      </Stack>

      {/* Error Alert */}
      {error && (
        <Fade in={!!error}>
          <Alert 
            severity={error.includes('Cannot delete') ? 'warning' : 'error'} 
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        </Fade>
      )}

      {/* Mind Map Canvas */}
      <Card
        elevation={3}
        sx={{
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        }}
      >
        <CardContent sx={{ p: 0, position: 'relative' }}>
          <Box
            ref={containerRef}
            sx={{
              width: '100%',
              height: '600px',
              overflow: 'hidden',
              position: 'relative',
              background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.8) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.6) 0%, transparent 50%)',
            }}
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              style={{
                cursor: isDragging ? 'grabbing' : 'default',
              }}
            >
              <defs>
                <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1976d2" stopOpacity={1} />
                  <stop offset="100%" stopColor="#1565c0" stopOpacity={1} />
                </linearGradient>
              </defs>
              {nodes.map(node => renderNode(node)).filter(Boolean)}
            </svg>
          </Box>
        </CardContent>
      </Card>

      {/* Node Controls */}
      {selectedNode && (
        <Zoom in={!!selectedNode}>
          <Paper
            elevation={4}
            sx={{
              mt: 3,
              p: 3,
              background: 'linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%)',
              border: '2px solid',
              borderColor: 'primary.main',
              borderRadius: 2,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                  {selectedNode.text}
                </Typography>
                {selectedNode.parentId && (
                  <Chip
                    label={`Parent: ${findNode(nodes, selectedNode.parentId)?.text || 'Unknown'}`}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 1 }}
                  />
                )}
                {selectedNode.level !== undefined && (
                  <Chip
                    label={`Level ${selectedNode.level}`}
                    size="small"
                    color="primary"
                    sx={{ mt: 1, ml: 1 }}
                  />
                )}
              </Box>
              <Stack direction="row" spacing={1}>
                <Tooltip title="Add Child Node">
                  <IconButton
                    color="primary"
                    onClick={() => addChildNode(selectedNode.id)}
                    sx={{
                      background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                        transform: 'scale(1.1)',
                      },
                    }}
                  >
                    <Add />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Edit Node">
                  <IconButton
                    color="primary"
                    onClick={() => handleEdit(selectedNode)}
                    sx={{
                      background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1b5e20 0%, #0d3e0f 100%)',
                        transform: 'scale(1.1)',
                      },
                    }}
                  >
                    <Edit />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Node">
                  <IconButton
                    color="error"
                    onClick={() => deleteNode(selectedNode.id)}
                    disabled={selectedNode.id === '1'}
                    sx={{
                      background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #b71c1c 0%, #8b0000 100%)',
                        transform: 'scale(1.1)',
                      },
                      '&.Mui-disabled': {
                        background: '#e0e0e0',
                        color: '#9e9e9e',
                      },
                    }}
                  >
                    <Delete />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Deselect">
                  <IconButton
                    onClick={() => setSelectedNode(null)}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Close />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
            
            <Typography variant="body2" color="text.secondary">
              Drag the node to reposition it. Use the buttons above to manage this node.
            </Typography>
          </Paper>
        </Zoom>
      )}

      {/* Instructions */}
      <Paper
        elevation={1}
        sx={{
          mt: 3,
          p: 2,
          background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
          borderRadius: 2,
        }}
      >
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoGraph sx={{ fontSize: 20 }} />
          How to use:
        </Typography>
        <Stack component="ol" spacing={0.5} sx={{ pl: 3, m: 0 }}>
          <Typography component="li" variant="body2">
            Click on a node to select it
          </Typography>
          <Typography component="li" variant="body2">
            Drag nodes to reposition them
          </Typography>
          <Typography component="li" variant="body2">
            Use "Add Child" to create a new branch
          </Typography>
          <Typography component="li" variant="body2">
            Use "Edit" to change the node text
          </Typography>
          <Typography component="li" variant="body2">
            Use "Delete" to remove a node (root node cannot be deleted)
          </Typography>
          <Typography component="li" variant="body2">
            Click "Save Mind Map" to persist your changes
          </Typography>
        </Stack>
      </Paper>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingNode}
        onClose={() => {
          setEditingNode(null);
          setEditText('');
        }}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Zoom}
      >
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white' }}>
          Edit Node
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            autoFocus
            fullWidth
            label="Node Text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSaveEdit();
              }
            }}
            variant="outlined"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setEditingNode(null);
              setEditText('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={!editText.trim()}
            sx={{
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
              },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
