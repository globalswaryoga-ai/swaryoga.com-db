'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { LoadingSpinner } from '@/components/admin/crm';

type Block = {
  id: string;
  type: string;
  x: number;
  y: number;
  label: string;
  data?: {
    message?: string;
    question?: string;
    options?: { label: string; value: string; nextNodeId?: string }[];
    condition?: string;
    action?: string;
    templateName?: string;
    templateButtons?: { title: string; text?: string; type?: string; label?: string; nextNodeId?: string }[];
    // Timing/Delay fields
    delaySeconds?: number;
    delayMinutes?: number;
    delayHours?: number;
    delayUnit?: 'seconds' | 'minutes' | 'hours'; // For UI display
    // Wait for reply fields
    waitForReply?: boolean;
    waitTimeoutMinutes?: number; // How long to wait for reply
    timeoutNodeId?: string; // Where to go if no reply
    replyDelayMinutes?: number; // Delay after reply before continuing
    // Condition fields
    conditionField?: string;
    conditionOp?: string;
    conditionValue?: string;
    apiUrl?: string;
    apiMethod?: string;
    apiHeaders?: Record<string, string>;
    apiBody?: string;
    leadUpdates?: Record<string, any>;
    assignToUserId?: string;
    assignToLabel?: string;
    notificationType?: string;
    notificationRecipient?: string;
    notificationMessage?: string;
    variableName?: string;
    variableValue?: string;
    mediaUrl?: string;
    mediaCaption?: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
    kbCategory?: string;
    kbFallback?: string;
    aiPrompt?: string;
    aiMaxTokens?: number;
    calendarType?: string;
    paymentAmount?: number;
    paymentCurrency?: string;
    paymentDescription?: string;
    loopCount?: number;
    branchConditions?: { field: string; op: string; value: string; nextNodeId?: string }[];
    randomPaths?: { weight: number; nextNodeId?: string }[];
    webhookUrl?: string;
    assignLabels?: string[];
    presenceType?: string;
    presenceDelay?: number;
    spintaxEnabled?: boolean;
  };
};

type Connection = {
  fromId: string;
  toId: string;
  label?: string;
  optionIndex?: number; // For button/question blocks - which option this connection is from
};

// Comprehensive node types organized by category
const NODE_CATEGORIES = {
  basic: { label: '📝 Basic', color: '#3B82F6' },
  logic: { label: '🧠 Logic', color: '#8B5CF6' },
  actions: { label: '⚡ Actions', color: '#F97316' },
  media: { label: '🎨 Media', color: '#EC4899' },
  integration: { label: '🔌 Integration', color: '#10B981' },
};

const BLOCK_TYPES = [
  // Basic
  { id: 'message', name: 'Send Message', color: '#3B82F6', icon: '💬', category: 'basic', desc: 'Send a text message' },
  { id: 'question', name: 'Ask Question', color: '#3B82F6', icon: '❓', category: 'basic', desc: 'Ask for user input' },
  { id: 'buttons', name: 'Button Menu', color: '#3B82F6', icon: '🔘', category: 'basic', desc: 'Show button options' },
  { id: 'template', name: 'WA Template', color: '#3B82F6', icon: '📋', category: 'basic', desc: 'Send WhatsApp template' },
  { id: 'delay', name: 'Delay', color: '#3B82F6', icon: '⏱️', category: 'basic', desc: 'Wait before next step' },
  { id: 'end', name: 'End Flow', color: '#6B7280', icon: '🏁', category: 'basic', desc: 'End conversation' },
  
  // Logic
  { id: 'condition', name: 'Condition', color: '#8B5CF6', icon: '🔀', category: 'logic', desc: 'Branch based on input' },
  { id: 'wait_reply', name: 'Wait for Reply', color: '#8B5CF6', icon: '⏳', category: 'logic', desc: 'Wait for user response' },
  { id: 'branch', name: 'Multi-Branch', color: '#8B5CF6', icon: '🌿', category: 'logic', desc: 'Multiple condition paths' },
  { id: 'random', name: 'Random Path', color: '#8B5CF6', icon: '🎲', category: 'logic', desc: 'Random selection' },
  { id: 'variable', name: 'Set Variable', color: '#8B5CF6', icon: '📝', category: 'logic', desc: 'Store/retrieve data' },
  { id: 'loop', name: 'Loop', color: '#8B5CF6', icon: '🔄', category: 'logic', desc: 'Repeat steps' },
  
  // Actions
  { id: 'crm_update', name: 'Update Lead', color: '#F97316', icon: '👤', category: 'actions', desc: 'Update CRM data' },
  { id: 'assign_agent', name: 'Assign Agent', color: '#F97316', icon: '🎯', category: 'actions', desc: 'Assign to team' },
  { id: 'notification', name: 'Send Alert', color: '#F97316', icon: '🔔', category: 'actions', desc: 'Notify admin' },
  { id: 'api_call', name: 'API Call', color: '#F97316', icon: '🌐', category: 'actions', desc: 'Call external API' },
  { id: 'webhook', name: 'Webhook', color: '#F97316', icon: '🔗', category: 'actions', desc: 'Trigger webhook' },
  
  // Media
  { id: 'image', name: 'Send Image', color: '#EC4899', icon: '🖼️', category: 'media', desc: 'Send image file' },
  { id: 'document', name: 'Send Document', color: '#EC4899', icon: '📄', category: 'media', desc: 'Send PDF/doc' },
  { id: 'audio', name: 'Send Audio', color: '#EC4899', icon: '🎵', category: 'media', desc: 'Send voice/music' },
  { id: 'video', name: 'Send Video', color: '#EC4899', icon: '🎬', category: 'media', desc: 'Send video file' },
  { id: 'location', name: 'Send Location', color: '#EC4899', icon: '📍', category: 'media', desc: 'Send map pin' },
  
  // Integration
  { id: 'knowledge_base', name: 'Knowledge Base', color: '#10B981', icon: '📚', category: 'integration', desc: 'Search KB for answer' },
  { id: 'ai_response', name: 'AI Response', color: '#10B981', icon: '🤖', category: 'integration', desc: 'Generate with AI' },
  { id: 'calendar', name: 'Calendar', color: '#10B981', icon: '📅', category: 'integration', desc: 'Book appointment' },
  { id: 'payment', name: 'Payment', color: '#10B981', icon: '💳', category: 'integration', desc: 'Request payment' },
];

export default function ChatbotBuilder() {
  const router = useRouter();
  const params = useParams();
  const chatbotId = params?.id as string;
  const token = useAuth();
  const crm = useCRM({ token });

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggingBlock, setDraggingBlock] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<string | null>(null);
  const [draggingOptionIndex, setDraggingOptionIndex] = useState<number | null>(null); // Track which option port is being dragged
  const [hoveringBlock, setHoveringBlock] = useState<string | null>(null); // Block being hovered for connection drop
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null); // Track mouse during connection drag
  const [activeCategory, setActiveCategory] = useState<string>('basic');
  const [flowName, setFlowName] = useState('Untitled Flow');
  const [flowEnabled, setFlowEnabled] = useState(true);
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [templates, setTemplates] = useState<Array<{ _id: string; templateName: string; language: string; metaStatus?: string; headerMedia?: { url: string; type?: string }; headerFormat?: string; templateContent?: string; bodyText?: string; footerText?: string; buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>; category?: string }>>([]);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasInnerRef = useRef<HTMLDivElement>(null);
  const rafMoveRef = useRef<number | null>(null);

  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // blockId of emoji target
  const [emojiTarget, setEmojiTarget] = useState<'message' | 'question'>('message');

  // Zoom helpers
  const zoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
  const zoomOut = () => setZoom(z => Math.max(z - 0.1, 0.2));
  const zoomReset = () => { setZoom(1); setCanvasPan({ x: 0, y: 0 }); };
  const fitToView = () => {
    if (blocks.length === 0 || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const minX = Math.min(...blocks.map(b => b.x));
    const maxX = Math.max(...blocks.map(b => b.x + 240));
    const minY = Math.min(...blocks.map(b => b.y));
    const maxY = Math.max(...blocks.map(b => b.y + 200));
    const contentW = maxX - minX + 80;
    const contentH = maxY - minY + 80;
    const scaleX = rect.width / contentW;
    const scaleY = rect.height / contentH;
    const newZoom = Math.max(0.2, Math.min(Math.min(scaleX, scaleY), 1));
    setZoom(newZoom);
    setCanvasPan({ x: -minX + 40, y: -minY + 40 });
  };

  // WhatsApp text formatting helper
  const formatWhatsAppText = (text: string) => {
    if (!text) return text;
    // Replace *bold* with <strong>
    let formatted = text.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    // Replace _italic_ with <em>
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
    // Replace ~strikethrough~ with <s>
    formatted = formatted.replace(/~([^~]+)~/g, '<s>$1</s>');
    // Replace ```monospace``` with <code>
    formatted = formatted.replace(/```([^`]+)```/g, '<code>$1</code>');
    return formatted;
  };

  // Extract YouTube video ID from URL
  const getYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  };

  // Extract first URL from text
  const extractUrl = (text: string): string | null => {
    const m = text.match(/https?:\/\/[^\s<]+/);
    return m ? m[0] : null;
  };

  // Render URL preview for a text (YouTube thumbnail or generic link badge)
  const renderUrlPreview = (text: string) => {
    const url = extractUrl(text);
    if (!url) return null;
    const ytId = getYouTubeId(url);
    if (ytId) {
      return (
        <div style={{ marginTop: 6, borderRadius: 6, overflow: 'hidden', position: 'relative', background: '#000' }}>
          <img
            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
            alt="YouTube"
            style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block', opacity: 0.9 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 32, height: 22, background: 'red', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>▶</span>
            </div>
          </div>
          <div style={{ padding: '4px 6px', background: '#fafafa', fontSize: 9, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#ef4444' }}>▶</span> YouTube
          </div>
        </div>
      );
    }
    // Generic link preview
    const hostname = (() => { try { return new URL(url).hostname; } catch { return url.slice(0, 30); } })();
    return (
      <div style={{ marginTop: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '4px 8px', fontSize: 10, color: '#166534', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>🔗</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hostname}</span>
      </div>
    );
  };

  // Common emojis for quick pick
  const COMMON_EMOJIS = [
    '😊','😂','❤️','🙏','👍','🎉','✅','⭐','🔥','💪',
    '📞','💬','🙌','😍','🤝','👋','🎯','💡','📌','🌟',
    '👏','😇','🧘','🕉️','☀️','🌙','🙂','🤩','💐','🎊',
  ];

  // Get block color helper
  const getBlockColor = (type: string) => {
    return BLOCK_TYPES.find(b => b.id === type)?.color || '#6B7280';
  };
  
  const getBlockIcon = (type: string) => {
    return BLOCK_TYPES.find(b => b.id === type)?.icon || '📦';
  };

  // Fetch data on mount
  useEffect(() => {
    if (!token) return;

    const fetchDetail = async () => {
      if (chatbotId === 'new') {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await crm.fetch(`/api/admin/crm/chatbot-flows/${chatbotId}`);
        setFlowName(res?.name || 'Untitled Flow');
        setFlowEnabled(res?.enabled !== false);
        setTriggerKeywords(Array.isArray(res?.triggerKeywords) ? res.triggerKeywords : []);
        if (res?.metadata?.canvas) {
          setBlocks(res.metadata.canvas.blocks || []);
          setConnections(res.metadata.canvas.connections || []);
        } else if (res?.nodes) {
          setBlocks(res.nodes.map((n: any, idx: number) => ({
            id: n.nodeId,
            type: n.type,
            x: n.position?.x || 100 + idx * 50,
            y: n.position?.y || 100 + idx * 50,
            label: BLOCK_TYPES.find(b => b.id === n.type)?.name || n.type,
            data: { 
              message: n.messageText, 
              question: n.questionText,
              options: n.options,
              ...n
            }
          })));
        }
      } catch (err) {
        console.error('Failed to load flow', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [chatbotId, token]);

  // Fetch templates for template block dropdown
  useEffect(() => {
    if (!token) return;
    const fetchTemplates = async () => {
      try {
        const res = await crm.fetch('/api/admin/crm/templates');
        if (res?.templates) {
          setTemplates(res.templates);
        }
      } catch (err) {
        console.error('Failed to load templates', err);
      }
    };
    fetchTemplates();
  }, [token]);

  const blockColors: Record<string, string> = BLOCK_TYPES.reduce((acc, b) => {
    acc[b.id] = b.color;
    return acc;
  }, {} as Record<string, string>);

  // Add block from sidebar
  const addBlock = useCallback(
    (type: string) => {
      const blockType = BLOCK_TYPES.find((b) => b.id === type);
      // Place new blocks in the visible viewport area, accounting for pan
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const viewCenterX = canvasRect ? (canvasRect.width / 2) / zoom - canvasPan.x : 300;
      const viewCenterY = canvasRect ? (canvasRect.height / 2) / zoom - canvasPan.y : 200;
      const newBlock: Block = {
        id: `block_${Date.now()}`,
        type: type as any,
        x: viewCenterX - 120 + blocks.length * 30,
        y: viewCenterY - 100 + blocks.length * 30,
        label: blockType?.name || 'Block',
        data: {
          message: type === 'message' || type === 'end' ? 'Enter message text...' : undefined,
          question: type === 'question' || type === 'buttons' ? 'Enter question...' : undefined,
          options: ['question', 'buttons'].includes(type) 
            ? [{ label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' }] 
            : undefined,
          // Delay settings - enhanced with units
          delayMinutes: type === 'delay' ? 5 : undefined,
          delayUnit: type === 'delay' ? 'minutes' : undefined,
          // Wait for Reply settings
          waitForReply: type === 'wait_reply' ? true : undefined,
          waitTimeoutMinutes: type === 'wait_reply' ? 60 : undefined, // Default: wait 1 hour
          replyDelayMinutes: type === 'wait_reply' ? 2 : undefined, // Default: 2 min delay after reply
          templateName: type === 'template' ? '' : undefined,
          templateButtons: type === 'template' ? [] : undefined,
          conditionField: type === 'condition' ? 'text' : undefined,
          conditionOp: type === 'condition' ? 'contains' : undefined,
          conditionValue: type === 'condition' ? '' : undefined,
          apiUrl: type === 'api_call' ? '' : undefined,
          apiMethod: type === 'api_call' ? 'POST' : undefined,
          webhookUrl: type === 'webhook' ? '' : undefined,
          mediaUrl: ['image', 'document', 'audio', 'video'].includes(type) ? '' : undefined,
          mediaCaption: ['image', 'video'].includes(type) ? '' : undefined,
          latitude: type === 'location' ? 0 : undefined,
          longitude: type === 'location' ? 0 : undefined,
          locationName: type === 'location' ? '' : undefined,
          kbCategory: type === 'knowledge_base' ? '' : undefined,
          kbFallback: type === 'knowledge_base' ? 'Sorry, I could not find an answer.' : undefined,
          aiPrompt: type === 'ai_response' ? '' : undefined,
          aiMaxTokens: type === 'ai_response' ? 150 : undefined,
          calendarType: type === 'calendar' ? 'booking' : undefined,
          paymentAmount: type === 'payment' ? 0 : undefined,
          paymentCurrency: type === 'payment' ? 'INR' : undefined,
          paymentDescription: type === 'payment' ? '' : undefined,
          variableName: type === 'variable' ? '' : undefined,
          variableValue: type === 'variable' ? '' : undefined,
          loopCount: type === 'loop' ? 3 : undefined,
          leadUpdates: type === 'crm_update' ? {} : undefined,
          assignToUserId: type === 'assign_agent' ? '' : undefined,
          assignToLabel: type === 'assign_agent' ? '' : undefined,
          notificationType: type === 'notification' ? 'email' : undefined,
          notificationRecipient: type === 'notification' ? '' : undefined,
          notificationMessage: type === 'notification' ? '' : undefined,
          branchConditions: type === 'branch' ? [] : undefined,
          randomPaths: type === 'random' ? [{ weight: 50 }, { weight: 50 }] : undefined,
        },
      };
      setBlocks((prev) => [...prev, newBlock]);
      setSelectedBlock(newBlock.id);
    },
    [blocks.length, zoom, canvasPan] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Canvas mouse down for dragging or panning
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === canvasRef.current || e.target === canvasInnerRef.current) {
        setSelectedBlock(null);
        // Left click on canvas background → pan, or Middle mouse button
        if (e.button === 0 || e.button === 1) {
          e.preventDefault();
          setIsPanning(true);
          panStartRef.current = { x: e.clientX, y: e.clientY, panX: canvasPan.x, panY: canvasPan.y };
        }
      }
    },
    [canvasPan.x, canvasPan.y]
  );

  // Drag block
  const handleBlockMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, blockId: string, isOutput?: boolean) => {
      e.preventDefault();
      if (isOutput) {
        setDraggingFrom(blockId);
        return;
      }

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const block = blocks.find(b => b.id === blockId);
        if (block) {
          // Calculate offset in content-space
          const contentX = (e.clientX - canvasRect.left) / zoom - canvasPan.x;
          const contentY = (e.clientY - canvasRect.top) / zoom - canvasPan.y;
          setDraggingBlock({
            id: blockId,
            offsetX: contentX - block.x,
            offsetY: contentY - block.y,
          });
        }
      }
      setSelectedBlock(blockId);
    },
    [blocks, zoom, canvasPan] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canvasRef.current) return;
      
      // Handle panning
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setCanvasPan({ x: panStartRef.current.panX + dx / zoom, y: panStartRef.current.panY + dy / zoom });
        return;
      }
      
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      // Track mouse position for connection line drawing (in content-space coords)
      if (draggingFrom) {
        setMousePos({
          x: (e.clientX - canvasRect.left) / zoom - canvasPan.x,
          y: (e.clientY - canvasRect.top) / zoom - canvasPan.y,
        });
        return;
      }
      
      if (!draggingBlock) return;

      // Throttle updates to animation frames to avoid rerender thrash ("vibrating").
      if (rafMoveRef.current) return;
      rafMoveRef.current = window.requestAnimationFrame(() => {
        rafMoveRef.current = null;
        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const x = Math.max(0, (e.clientX - canvasRect.left) / zoom - canvasPan.x - draggingBlock.offsetX);
        const y = Math.max(0, (e.clientY - canvasRect.top) / zoom - canvasPan.y - draggingBlock.offsetY);

        setBlocks((prev) => prev.map((b) => (b.id === draggingBlock.id ? { ...b, x, y } : b)));
      });
    },
    [draggingBlock, draggingFrom, zoom, canvasPan, isPanning]
  );

  // Handle dropping connection on a block's input port
  const handleInputPortMouseUp = useCallback((targetBlockId: string) => {
    if (draggingFrom && draggingFrom !== targetBlockId) {
      const fromBlock = blocks.find(b => b.id === draggingFrom);
      
      // For button/question/template blocks with optionIndex, check if this option already has a connection
      if (draggingOptionIndex !== null && (fromBlock?.type === 'buttons' || fromBlock?.type === 'question' || fromBlock?.type === 'template')) {
        // Remove existing connection from this option, then add new one
        setConnections(prev => [
          ...prev.filter(c => !(c.fromId === draggingFrom && c.optionIndex === draggingOptionIndex)),
          { fromId: draggingFrom, toId: targetBlockId, optionIndex: draggingOptionIndex }
        ]);
      } else {
        // Regular block - prevent duplicate connections
        const existsAlready = connections.some(c => c.fromId === draggingFrom && c.toId === targetBlockId && c.optionIndex === undefined);
        if (!existsAlready) {
          setConnections(prev => [...prev, { fromId: draggingFrom, toId: targetBlockId }]);
        }
      }
    }
    setDraggingFrom(null);
    setDraggingOptionIndex(null);
    setMousePos(null);
    setHoveringBlock(null);
  }, [draggingFrom, draggingOptionIndex, connections, blocks]);

  const handleMouseUp = useCallback(() => {
    setDraggingBlock(null);
    setDraggingFrom(null);
    setDraggingOptionIndex(null);
    setMousePos(null);
    setHoveringBlock(null);
    setIsPanning(false);
    if (rafMoveRef.current) {
      window.cancelAnimationFrame(rafMoveRef.current);
      rafMoveRef.current = null;
    }
  }, []);

  // Wheel zoom handler (Ctrl+Scroll or pinch)
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom(prev => Math.min(2, Math.max(0.2, prev + delta)));
    } else {
      // Without Ctrl: pan (Shift+Scroll = horizontal pan for mouse wheel users)
      const dx = e.shiftKey ? e.deltaY : e.deltaX;
      const dy = e.shiftKey ? 0 : e.deltaY;
      setCanvasPan(prev => ({
        x: prev.x - dx / zoom,
        y: prev.y - dy / zoom,
      }));
    }
  }, [zoom]);

  // Delete block
  const deleteBlock = useCallback((blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setConnections((prev) =>
      prev.filter((c) => c.fromId !== blockId && c.toId !== blockId)
    );
    if (selectedBlock === blockId) setSelectedBlock(null);
  }, [selectedBlock]);

  // Duplicate block - creates a copy offset 40px down-right with same data
  const duplicateBlock = useCallback((blockId: string) => {
    const source = blocks.find(b => b.id === blockId);
    if (!source) return;
    const newId = `block_${Date.now()}`;
    const cloned: Block = {
      ...source,
      id: newId,
      x: source.x + 40,
      y: source.y + 40,
      label: `${source.label} (Copy)`,
      data: source.data ? JSON.parse(JSON.stringify(source.data)) : undefined,
    };
    setBlocks(prev => [...prev, cloned]);
    setSelectedBlock(newId);
  }, [blocks]);

  // Delete connection - also handle optionIndex
  const deleteConnection = useCallback((fromId: string, toId: string, optionIndex?: number) => {
    setConnections((prev) => prev.filter((c) => {
      if (optionIndex !== undefined) {
        return !(c.fromId === fromId && c.toId === toId && c.optionIndex === optionIndex);
      }
      return !(c.fromId === fromId && c.toId === toId);
    }));
  }, []);

  const updateBlockData = useCallback((blockId: string, data: Partial<Block['data']>) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, data: { ...b.data, ...data } } : b
      )
    );
  }, []);

  // Save chatbot
  const saveChatbot = useCallback(async () => {
    if (!chatbotId) return;
    setSaving(true);
    try {
      // Map canvas to nodes for the engine
      const nodes = blocks.map(b => {
        // For blocks with options (buttons/question/template), nextNodeId should be the
        // connection WITHOUT an optionIndex (the default output). For simple blocks, any connection.
        const nextConn = connections.find(c => c.fromId === b.id && c.optionIndex === undefined);
        
        // Calculate total delay in seconds for the engine
        let totalDelaySeconds = 0;
        if (b.type === 'delay') {
          const unit = b.data?.delayUnit || 'minutes';
          if (unit === 'seconds') totalDelaySeconds = b.data?.delaySeconds || 0;
          else if (unit === 'minutes') totalDelaySeconds = (b.data?.delayMinutes || 0) * 60;
          else if (unit === 'hours') totalDelaySeconds = (b.data?.delayHours || 0) * 3600;
        }
        
        // Find timeout/fallback connection for wait_reply and condition nodes
        const timeoutConn = connections.find(c => c.fromId === b.id && c.label === 'timeout');
        const fallbackConn = connections.find(c => c.fromId === b.id && c.label === 'fallback');
        
        const node: any = {
          nodeId: b.id,
          type: b.type,
          position: { x: b.x, y: b.y },
          // Basic fields
          messageText: b.data?.message,
          questionText: b.data?.question,
          templateName: b.data?.templateName,
          // Timing fields - enhanced
          delaySeconds: totalDelaySeconds || b.data?.delaySeconds,
          delayMinutes: b.data?.delayMinutes,
          delayHours: b.data?.delayHours,
          delayUnit: b.data?.delayUnit,
          // Wait for reply fields
          waitForReply: b.data?.waitForReply || (b.type === 'wait_reply'),
          waitTimeoutMinutes: b.data?.waitTimeoutMinutes,
          replyDelayMinutes: b.data?.replyDelayMinutes,
          timeoutNodeId: timeoutConn?.toId || b.data?.timeoutNodeId,
          fallbackNodeId: fallbackConn?.toId || (b.data as any)?.fallbackNodeId,
          options: b.data?.options?.map((o, i) => ({
            label: typeof o === 'string' ? o : o.label,
            value: typeof o === 'string' ? o : o.value,
            nextNodeId: connections.find(c => c.fromId === b.id && (c.optionIndex === i || c.label === String(i)))?.toId || undefined
          })),
          // Template button connections
          templateButtons: b.data?.templateButtons?.map((btn: any, i: number) => ({
            title: btn.title || btn.text || `Button ${i + 1}`,
            type: btn.type || 'QUICK_REPLY',
            nextNodeId: connections.find(c => c.fromId === b.id && c.optionIndex === i)?.toId || undefined
          })),
          nextNodeId: nextConn?.toId,
          // Logic fields
          conditionField: b.data?.conditionField,
          conditionOp: b.data?.conditionOp,
          conditionValue: b.data?.conditionValue,
          variableName: b.data?.variableName,
          variableValue: b.data?.variableValue,
          loopCount: b.data?.loopCount,
          branchConditions: b.data?.branchConditions,
          randomPaths: b.data?.randomPaths,
          // Action fields
          apiUrl: b.data?.apiUrl,
          apiMethod: b.data?.apiMethod,
          apiHeaders: b.data?.apiHeaders,
          apiBody: b.data?.apiBody,
          webhookUrl: b.data?.webhookUrl,
          leadUpdates: b.data?.leadUpdates,
          assignToUserId: b.data?.assignToUserId,
          assignToLabel: b.data?.assignToLabel,
          notificationType: b.data?.notificationType,
          notificationRecipient: b.data?.notificationRecipient,
          notificationMessage: b.data?.notificationMessage,
          // Media fields
          mediaUrl: b.data?.mediaUrl,
          mediaCaption: b.data?.mediaCaption,
          latitude: b.data?.latitude,
          longitude: b.data?.longitude,
          locationName: b.data?.locationName,
          // Integration fields
          kbCategory: b.data?.kbCategory,
          kbFallback: b.data?.kbFallback,
          aiPrompt: b.data?.aiPrompt,
          aiMaxTokens: b.data?.aiMaxTokens,
          calendarType: b.data?.calendarType,
          paymentAmount: b.data?.paymentAmount,
          paymentCurrency: b.data?.paymentCurrency,
          paymentDescription: b.data?.paymentDescription,
          // Legacy fields
          assignLabels: b.data?.assignLabels,
          presenceType: b.data?.presenceType || 'none',
          presenceDelay: b.data?.presenceDelay || 0,
          spintaxEnabled: b.data?.spintaxEnabled || false,
        };
        return node;
      });

      const endpoint = chatbotId === 'new' ? '/api/admin/crm/chatbot-flows' : `/api/admin/crm/chatbot-flows/${chatbotId}`;
      const method = chatbotId === 'new' ? 'POST' : 'PUT';

      const res = await crm.fetch(endpoint, {
        method,
        body: {
          name: flowName,
          enabled: flowEnabled,
          triggerKeywords,
          nodes,
          startNodeId: blocks[0]?.id,
          metadata: {
            canvas: { blocks, connections }
          }
        },
      });

      if (chatbotId === 'new') {
        router.push(`/admin/crm/chatbots/builder/${res._id}`);
      }
      alert('Chatbot saved!');
    } catch (err) {
      alert('Failed to save chatbot');
    } finally {
      setSaving(false);
    }
  }, [chatbotId, crm, blocks, connections, router, flowName, flowEnabled, triggerKeywords]);

  if (loading) return <div className="flex items-center justify-center h-full bg-gray-50"><LoadingSpinner /></div>;

  const filteredBlocks = BLOCK_TYPES.filter(b => b.category === activeCategory);

  return (
    <div className="flex flex-col h-[100svh] bg-gray-50 overflow-hidden">
      {/* TOP HEADER */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/admin/crm/chatbots')}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            ← Back
          </button>
          <input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="text-lg font-bold border-0 border-b-2 border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1 bg-transparent"
            placeholder="Flow Name"
          />
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${flowEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {flowEnabled ? '✅ Active' : '❌ Inactive'}
          </span>
          {/* Trigger Keywords */}
          <div className="flex items-center gap-1 ml-2 border-l border-gray-200 pl-3">
            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">Keywords:</span>
            <div className="flex items-center gap-1 flex-wrap max-w-[300px]">
              {triggerKeywords.map((kw, i) => (
                <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-semibold">
                  {kw}
                  <button onClick={() => setTriggerKeywords(prev => prev.filter((_, idx) => idx !== i))} className="text-amber-500 hover:text-red-600 ml-0.5">×</button>
                </span>
              ))}
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ',') && keywordInput.trim()) {
                    e.preventDefault();
                    const kw = keywordInput.trim().toLowerCase();
                    if (!triggerKeywords.includes(kw)) {
                      setTriggerKeywords(prev => [...prev, kw]);
                    }
                    setKeywordInput('');
                  }
                }}
                className="w-20 text-[11px] border-0 border-b border-transparent hover:border-gray-300 focus:border-amber-500 focus:outline-none bg-transparent py-0.5 px-1"
                placeholder="+ add"
                title="Type a keyword and press Enter. When a customer sends this word, this flow starts automatically."
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={flowEnabled}
              onChange={(e) => setFlowEnabled(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Enabled</span>
          </label>
          <button
            onClick={saveChatbot}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : '💾 Save Flow'}
          </button>
          {chatbotId && chatbotId !== 'new' && (
            <button
              onClick={async () => {
                try {
                  const res = await crm.fetch(`/api/admin/crm/chatbot-flows/${chatbotId}/duplicate`, { method: 'POST' });
                  if (res?._id) router.push(`/admin/crm/chatbots/builder/${res._id}`);
                } catch { alert('Failed to duplicate flow'); }
              }}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold text-sm"
              title="Create a copy of this flow"
            >
              📋 Duplicate Flow
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
      {/* LEFT SIDEBAR - Block Types */}
      <div className="w-[280px] bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
        {/* Category Tabs */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex flex-wrap gap-1">
            {Object.entries(NODE_CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCategory === key
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={{ backgroundColor: activeCategory === key ? cat.color : undefined }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Block List */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid gap-2">
            {filteredBlocks.map((blockType) => (
              <button
                key={blockType.id}
                onClick={() => addBlock(blockType.id)}
                className="rounded-xl px-3 py-2.5 text-left text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-100"
                style={{ background: blockType.color }}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{blockType.icon}</span>
                  <div>
                    <div className="text-[13px] font-semibold">{blockType.name}</div>
                    <div className="text-[10px] opacity-80">{blockType.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Node Count */}
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            {blocks.length} nodes in flow
          </div>
        </div>
      </div>

      {/* CENTER CANVAS - Flow Designer */}
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="flex-1 relative overflow-hidden select-none"
        style={{
          cursor: isPanning ? 'grabbing' : draggingFrom ? 'crosshair' : 'grab',
          backgroundColor: '#f8fafc',
          backgroundImage: `radial-gradient(circle, #d1d5db ${zoom > 0.5 ? '1px' : '0.5px'}, transparent 1px)`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${canvasPan.x * zoom}px ${canvasPan.y * zoom}px`,
        }}
      >
        {/* Connection drag hint */}
        {draggingFrom && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 animate-pulse">
            🔗 Drop on a block's left port to connect
          </div>
        )}

        {/* Zoom/Pan Transform Container */}
        <div
          ref={canvasInnerRef}
          style={{
            transform: `scale(${zoom}) translate(${canvasPan.x}px, ${canvasPan.y}px)`,
            transformOrigin: '0 0',
            position: 'absolute',
            inset: 0,
            width: '5000px',
            height: '5000px',
          }}
        >
        
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 1, pointerEvents: draggingFrom ? 'none' : 'auto' }}
        >
          {/* Existing connections */}
          {connections.map((conn) => {
            const fromBlock = blocks.find((b) => b.id === conn.fromId);
            const toBlock = blocks.find((b) => b.id === conn.toId);
            if (!fromBlock || !toBlock) return null;

            const x1 = fromBlock.x + 240; // Right side (output port)
            
            // Calculate Y1 based on block type and optionIndex
            let y1 = fromBlock.y + 50; // Default center
            if ((fromBlock.type === 'buttons' || fromBlock.type === 'question') && fromBlock.data?.options && fromBlock.data.options.length > 0) {
              // Use optionIndex from connection if available
              const idx = conn.optionIndex !== undefined ? conn.optionIndex : 0;
              const baseOffset = 100;
              const optionHeight = 32;
              y1 = fromBlock.y + baseOffset + (idx * optionHeight) + (optionHeight / 2);
            } else if (fromBlock.type === 'template') {
              // Template blocks with buttons get per-button output ports
              const tplBtns = fromBlock.data?.templateButtons || [];
              if (tplBtns.length > 0 && conn.optionIndex !== undefined) {
                // Calculate Y based on template preview height + button index
                const tpl = templates.find(t => t.templateName === fromBlock.data?.templateName);
                const hasImage = !!(tpl?.headerMedia?.url);
                const bodyText = tpl?.templateContent || tpl?.bodyText || '';
                const bodyLines = Math.min(Math.ceil(bodyText.length / 25), 4);
                const previewBaseHeight = 40 + (hasImage ? 60 : 0) + (bodyLines * 14) + 12;
                const buttonHeight = 24;
                const idx = conn.optionIndex;
                y1 = fromBlock.y + previewBaseHeight + (idx * buttonHeight) + (buttonHeight / 2) + 8;
              } else if (fromBlock.data?.templateName) {
                y1 = fromBlock.y + 80;
              }
            }
            
            const x2 = toBlock.x; // Left side (input port)
            
            // Calculate Y2 - target block's input port position
            let y2 = toBlock.y + 50; // Default center
            // Adjust for taller blocks
            if ((toBlock.type === 'buttons' || toBlock.type === 'question') && toBlock.data?.options) {
              y2 = toBlock.y + 80;
            } else if (toBlock.type === 'template') {
              // Calculate midpoint of template block for input port
              const tplBtns = toBlock.data?.templateButtons || [];
              const tpl = templates.find(t => t.templateName === toBlock.data?.templateName);
              const hasImage = !!(tpl?.headerMedia?.url);
              const bodyText = tpl?.templateContent || tpl?.bodyText || '';
              const bodyLines = Math.min(Math.ceil(bodyText.length / 25), 4);
              const previewBaseHeight = 40 + (hasImage ? 60 : 0) + (bodyLines * 14) + 12 + (tplBtns.length * 24);
              y2 = toBlock.y + Math.max(50, previewBaseHeight / 2);
            }
            
            // Calculate control points for smooth bezier curve
            const midX = (x1 + x2) / 2;
            
            // Get option label for display
            const optionLabel = conn.optionIndex !== undefined && fromBlock.data?.options?.[conn.optionIndex]
              ? (typeof fromBlock.data.options[conn.optionIndex] === 'string' 
                  ? fromBlock.data.options[conn.optionIndex] 
                  : fromBlock.data.options[conn.optionIndex].label)
              : null;

            return (
              <g key={`${conn.fromId}-${conn.toId}-${conn.optionIndex ?? 'default'}`} className="group cursor-pointer" style={{ pointerEvents: 'auto' }}>
                {/* Invisible wider path for easier clicking */}
                <path
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  stroke="transparent"
                  strokeWidth="12"
                  fill="none"
                  onClick={() => deleteConnection(conn.fromId, conn.toId, conn.optionIndex)}
                />
                {/* Visible path */}
                <path
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  stroke="#94a3b8"
                  strokeWidth="2"
                  fill="none"
                  className="group-hover:stroke-red-400 transition-colors"
                  onClick={() => deleteConnection(conn.fromId, conn.toId, conn.optionIndex)}
                />
                {/* Arrow head */}
                <polygon
                  points={`${x2},${y2} ${x2 - 8},${y2 - 5} ${x2 - 8},${y2 + 5}`}
                  fill="#94a3b8"
                  className="group-hover:fill-red-400 transition-colors"
                />
                {/* Delete icon on hover */}
                <g className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteConnection(conn.fromId, conn.toId, conn.optionIndex)}>
                  <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r="10" fill="#ef4444" />
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 4} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">×</text>
                </g>
              </g>
            );
          })}
          
          {/* Temporary connection line while dragging */}
          {draggingFrom && mousePos && (() => {
            const fromBlock = blocks.find(b => b.id === draggingFrom);
            if (!fromBlock) return null;
            
            const x1 = fromBlock.x + 240;
            const y1 = fromBlock.y + 50;
            const x2 = mousePos.x;
            const y2 = mousePos.y;
            const midX = (x1 + x2) / 2;
            
            return (
              <path
                d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
              />
            );
          })()}
        </svg>

        {blocks.map((block) => (
          <div
            key={block.id}
            onMouseDown={(e) => handleBlockMouseDown(e, block.id)}
            className="absolute w-[240px] bg-white rounded-xl cursor-grab"
            style={{
              left: block.x,
              top: block.y,
              border:
                selectedBlock === block.id
                  ? `3px solid ${blockColors[block.type]}`
                  : hoveringBlock === block.id && draggingFrom
                    ? '3px solid #22c55e'
                    : '1px solid #e5e7eb',
              boxShadow: selectedBlock === block.id 
                ? '0 4px 12px rgba(0,0,0,0.1)' 
                : hoveringBlock === block.id && draggingFrom 
                  ? '0 0 16px rgba(34, 197, 94, 0.4)' 
                  : 'none',
              transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
              zIndex: selectedBlock === block.id ? 5 : 2,
            }}
          >
            {/* Block Header */}
            <div
              style={{
                background: blockColors[block.type],
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{block.label}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#fff',
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                  title="Duplicate block"
                >
                  📋
                </button>
                <button
                  onClick={() => deleteBlock(block.id)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#fff',
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Block Content */}
            <div style={{ padding: '12px 14px', color: '#6b7280', fontSize: 12 }}>
              {/* Message types */}
              {block.type === 'message' && (
                <div style={{ background: '#e5ddd5', borderRadius: 8, padding: 8, maxWidth: 210 }}>
                  {/* Video/URL preview on top */}
                  {block.data?.message && renderUrlPreview(block.data.message)}
                  <div style={{ background: '#fff', borderRadius: 6, padding: '6px 8px', marginTop: block.data?.message && extractUrl(block.data.message) ? 6 : 0 }}>
                    <p style={{ color: '#1f2937', fontSize: 11, lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}
                       dangerouslySetInnerHTML={{ __html: formatWhatsAppText((block.data?.message || 'Enter message...').length > 100 ? (block.data?.message || '').slice(0, 100) + '...' : (block.data?.message || 'Enter message...')) }}
                    />
                  </div>
                </div>
              )}
              
              {/* Question/Buttons types - WhatsApp style blue buttons */}
              {(['question', 'buttons'].includes(block.type)) && (
                <div>
                  {/* Video/URL preview on top */}
                  {block.data?.question && renderUrlPreview(block.data.question)}
                  <div style={{ color: '#1f2937', fontSize: 12, marginBottom: 4, marginTop: block.data?.question && extractUrl(block.data.question) ? 6 : 0, lineHeight: 1.4 }}
                       dangerouslySetInnerHTML={{ __html: formatWhatsAppText((block.data?.question || 'Enter question...').length > 80 ? (block.data?.question || '').slice(0, 80) + '...' : (block.data?.question || 'Enter question...')) }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, borderTop: '1px solid #e5e7eb', paddingTop: 6 }}>
                    {(block.data?.options || []).map((opt, i) => {
                      const label = typeof opt === 'string' ? opt : opt.label;
                      const hasConn = connections.some(c => c.fromId === block.id && c.optionIndex === i);
                      return (
                        <div
                          key={i}
                          style={{
                            fontSize: 12,
                            padding: '6px 10px',
                            background: hasConn ? '#EFF6FF' : '#ffffff',
                            borderRadius: 8,
                            color: '#2563EB',
                            fontWeight: 600,
                            textAlign: 'center',
                            border: `1.5px solid ${hasConn ? '#93C5FD' : '#BFDBFE'}`,
                            cursor: 'default',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {label || `Button ${i + 1}`}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Template - with inline preview popup */}
              {block.type === 'template' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  <div>📋 {block.data?.templateName || 'Select template...'}</div>
                  {/* Inline Preview */}
                  {block.data?.templateName && (() => {
                    const tpl = templates.find(t => t.templateName === block.data?.templateName);
                    if (!tpl) return null;
                    const bodyText = tpl.templateContent || tpl.bodyText || '';
                    return (
                      <div style={{ marginTop: 6, background: '#e5ddd5', borderRadius: 8, padding: 6, maxWidth: 200 }}>
                        {/* Header Image */}
                        {tpl.headerMedia?.url && (
                          <img 
                            src={tpl.headerMedia.url} 
                            alt="" 
                            style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 6 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        {/* Body */}
                        <div style={{ background: '#fff', borderRadius: 6, padding: 6, marginTop: tpl.headerMedia?.url ? 4 : 0 }}>
                          <p 
                            style={{ fontSize: 10, color: '#222', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.3 }}
                            dangerouslySetInnerHTML={{ __html: formatWhatsAppText(bodyText.length > 80 ? bodyText.slice(0, 80) + '...' : bodyText || '(No body)') }}
                          />
                        </div>
                        {/* Buttons - use templateButtons (manual) or template buttons */}
                        {(() => {
                          const btns = block.data?.templateButtons && block.data.templateButtons.length > 0 
                            ? block.data.templateButtons 
                            : tpl.buttons || [];
                          if (btns.length === 0) return null;
                          return (
                            <div style={{ marginTop: 4, borderTop: '1px solid #d1d5db' }}>
                              {btns.slice(0, 3).map((btn: any, i: number) => {
                                const hasConn = connections.some(c => c.fromId === block.id && c.optionIndex === i);
                                return (
                                  <div key={i} style={{ 
                                    background: hasConn ? '#EFF6FF' : '#fff', 
                                    borderRadius: 4, 
                                    padding: '5px 8px', 
                                    textAlign: 'center', 
                                    color: '#2563EB', 
                                    fontSize: 11, 
                                    fontWeight: 600,
                                    marginTop: 2,
                                    border: `1.5px solid ${hasConn ? '#93C5FD' : '#BFDBFE'}`,
                                    letterSpacing: '0.01em'
                                  }}>
                                    {btn.title || btn.text || btn.label || 'Button'}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {/* Delay - Enhanced with units & visual timer */}
              {block.type === 'delay' && (
                <div style={{ textAlign: 'center', padding: '6px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20, padding: '6px 14px' }}>
                    <span style={{ fontSize: 18 }}>⏱️</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
                      {block.data?.delayMinutes || block.data?.delaySeconds || block.data?.delayHours || 0} {block.data?.delayUnit || 'minutes'}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>then continue to next step</div>
                </div>
              )}
              
              {/* Wait for Reply - NEW */}
              {block.type === 'wait_reply' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  <div>⏳ Wait for user reply</div>
                  <div style={{ marginTop: 4, fontSize: 10, color: '#6b7280' }}>
                    Timeout: {block.data?.waitTimeoutMinutes || 60} min
                  </div>
                  {block.data?.replyDelayMinutes && (
                    <div style={{ fontSize: 10, color: '#6b7280' }}>
                      Then wait: {block.data.replyDelayMinutes} min
                    </div>
                  )}
                </div>
              )}
              
              {/* End */}
              {block.type === 'end' && (
                <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>🏁</span>
                  <span>{block.data?.message || 'End conversation'}</span>
                </div>
              )}
              
              {/* Condition */}
              {block.type === 'condition' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  If {block.data?.conditionField || 'field'} {block.data?.conditionOp || 'contains'} "{block.data?.conditionValue || '...'}"
                </div>
              )}
              
              {/* Branch */}
              {block.type === 'branch' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  🌿 {(block.data?.branchConditions || []).length || 0} branches
                </div>
              )}
              
              {/* Random */}
              {block.type === 'random' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  🎲 {(block.data?.randomPaths || []).length || 2} random paths
                </div>
              )}
              
              {/* Variable */}
              {block.type === 'variable' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  📝 {block.data?.variableName || 'var'} = {block.data?.variableValue || '...'}
                </div>
              )}
              
              {/* Loop */}
              {block.type === 'loop' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  🔄 Repeat {block.data?.loopCount || 3} times
                </div>
              )}
              
              {/* CRM Update */}
              {block.type === 'crm_update' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  👤 Update lead fields
                </div>
              )}
              
              {/* Assign Agent */}
              {block.type === 'assign_agent' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  🎯 {block.data?.assignToLabel || block.data?.assignToUserId || 'Select agent...'}
                </div>
              )}
              
              {/* Notification */}
              {block.type === 'notification' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  🔔 {block.data?.notificationType || 'email'} alert
                </div>
              )}
              
              {/* API Call */}
              {block.type === 'api_call' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  🌐 {block.data?.apiMethod || 'POST'} {block.data?.apiUrl?.substring(0, 30) || 'Enter URL...'}
                </div>
              )}
              
              {/* Webhook */}
              {block.type === 'webhook' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  🔗 {block.data?.webhookUrl?.substring(0, 30) || 'Enter webhook URL...'}
                </div>
              )}
              
              {/* Media types - with inline preview */}
              {['image', 'document', 'audio', 'video'].includes(block.type) && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  {block.type === 'image' && block.data?.mediaUrl ? (
                    <div>
                      <img
                        src={block.data.mediaUrl}
                        alt="Preview"
                        style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6, display: 'block', marginBottom: 4 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {block.data?.mediaCaption && (
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{block.data.mediaCaption}</div>
                      )}
                    </div>
                  ) : block.type === 'video' && block.data?.mediaUrl ? (
                    <div>
                      {(() => {
                        const ytId = getYouTubeId(block.data.mediaUrl || '');
                        if (ytId) return (
                          <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', marginBottom: 4 }}>
                            <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 32, height: 22, background: 'red', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>▶</span>
                              </div>
                            </div>
                          </div>
                        );
                        return <div>🎬 {block.data.mediaUrl?.substring(0, 30)}...</div>;
                      })()}
                      {block.data?.mediaCaption && (
                        <div style={{ fontSize: 10, color: '#6b7280' }}>{block.data.mediaCaption}</div>
                      )}
                    </div>
                  ) : (
                    <div>{getBlockIcon(block.type)} {block.data?.mediaUrl?.substring(0, 30) || 'Enter media URL...'}</div>
                  )}
                </div>
              )}
              
              {/* Location */}
              {block.type === 'location' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  📍 {block.data?.locationName || `${block.data?.latitude || 0}, ${block.data?.longitude || 0}`}
                </div>
              )}
              
              {/* Knowledge Base */}
              {block.type === 'knowledge_base' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  📚 Search KB{block.data?.kbCategory ? ` (${block.data.kbCategory})` : ''}
                </div>
              )}
              
              {/* AI Response */}
              {block.type === 'ai_response' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  🤖 Generate AI response
                </div>
              )}
              
              {/* Calendar */}
              {block.type === 'calendar' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  📅 {block.data?.calendarType || 'booking'}
                </div>
              )}
              
              {/* Payment */}
              {block.type === 'payment' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  💳 {block.data?.paymentCurrency || 'INR'} {block.data?.paymentAmount || 0}
                </div>
              )}
            </div>

            {/* Input Port (Left side - for receiving connections) */}
            {(() => {
              // Calculate input port Y position based on block type
              let inputPortTop = '50%';
              let inputPortTransform = 'translateY(-50%)';
              
              if ((block.type === 'buttons' || block.type === 'question') && block.data?.options && block.data.options.length > 0) {
                inputPortTop = '80px';
                inputPortTransform = 'none';
              } else if (block.type === 'template' && block.data?.templateName) {
                inputPortTop = '100px';
                inputPortTransform = 'none';
              }
              
              return (
                <div
                  onMouseUp={() => handleInputPortMouseUp(block.id)}
                  onMouseEnter={() => draggingFrom && setHoveringBlock(block.id)}
                  onMouseLeave={() => setHoveringBlock(null)}
                  style={{
                    width: 16,
                    height: 16,
                    background: hoveringBlock === block.id && draggingFrom ? '#22c55e' : '#e5e7eb',
                    borderRadius: '50%',
                    border: `2px solid ${hoveringBlock === block.id && draggingFrom ? '#16a34a' : '#cbd5e1'}`,
                    position: 'absolute',
                    left: -8,
                    top: inputPortTop,
                    transform: inputPortTransform,
                    cursor: draggingFrom ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                    zIndex: 10,
                  }}
                  title="Drop connection here"
                />
              );
            })()}

            {/* Output Port (Right side - for creating connections) */}
            {/* For Button Menu / Question with options, show multiple output ports */}
            {/* Also for Template blocks with buttons */}
            {block.type === 'template' && (() => {
              const tplBtns = block.data?.templateButtons || [];
              if (tplBtns.length === 0) return null;
              
              // Calculate preview height to position button ports correctly
              const tpl = templates.find(t => t.templateName === block.data?.templateName);
              const hasImage = !!(tpl?.headerMedia?.url);
              const bodyText = tpl?.templateContent || tpl?.bodyText || '';
              const bodyLines = Math.min(Math.ceil(bodyText.length / 25), 4);
              const previewBaseHeight = 40 + (hasImage ? 60 : 0) + (bodyLines * 14) + 12;
              const buttonHeight = 24;
              
              return (
                <>
                  {tplBtns.map((btn: any, idx: number) => {
                    const portY = previewBaseHeight + (idx * buttonHeight) + (buttonHeight / 2) + 8;
                    const hasConnection = connections.some(c => c.fromId === block.id && c.optionIndex === idx);
                    return (
                      <div
                        key={`tpl-port-${idx}`}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingFrom(block.id);
                          setDraggingOptionIndex(idx);
                          setMousePos({ x: e.clientX, y: e.clientY });
                        }}
                        style={{
                          width: 14,
                          height: 14,
                          background: hasConnection ? '#22c55e' : '#3b82f6',
                          borderRadius: '50%',
                          border: '2px solid #fff',
                          position: 'absolute',
                          right: -7,
                          top: portY,
                          cursor: 'crosshair',
                          transition: 'all 0.15s ease',
                          boxShadow: hasConnection ? '0 0 4px rgba(34, 197, 94, 0.6)' : '0 0 4px rgba(59, 130, 246, 0.4)',
                          zIndex: 10,
                        }}
                        title={`Connect: "${btn.title || btn.text || btn.label || 'Button ' + (idx+1)}" → ${hasConnection ? '(connected)' : 'drag to target'}`}
                      />
                    );
                  })}
                </>
              );
            })()}
            {(block.type === 'buttons' || block.type === 'question') && block.data?.options && block.data.options.length > 0 ? (
              <>
                {block.data.options.map((opt: any, idx: number) => {
                  // Calculate vertical position for each option's port
                  const baseOffset = 100; // Header height approximately
                  const optionHeight = 32; // Height per option row
                  const portY = baseOffset + (idx * optionHeight) + (optionHeight / 2);
                  
                  // Check if this option has a connection
                  const hasConnection = connections.some(c => c.fromId === block.id && c.optionIndex === idx);
                  
                  return (
                    <div
                      key={`port-${idx}`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingFrom(block.id);
                        setDraggingOptionIndex(idx);
                        setMousePos({ x: e.clientX, y: e.clientY });
                      }}
                      style={{
                        width: 14,
                        height: 14,
                        background: hasConnection ? '#22c55e' : '#3b82f6',
                        borderRadius: '50%',
                        border: '2px solid #fff',
                        position: 'absolute',
                        right: -7,
                        top: portY,
                        cursor: 'crosshair',
                        transition: 'all 0.15s ease',
                        boxShadow: hasConnection ? '0 0 4px rgba(34, 197, 94, 0.6)' : '0 0 4px rgba(59, 130, 246, 0.4)',
                        zIndex: 10,
                      }}
                      title={`Connect: "${typeof opt === 'string' ? opt : opt.label}" → ${hasConnection ? '(connected)' : 'drag to target'}`}
                    />
                  );
                })}
              </>
            ) : (
              /* Show single default output port only if template block has no buttons */
              (block.type !== 'template' || !(block.data?.templateButtons && block.data.templateButtons.length > 0)) && (
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleBlockMouseDown(e, block.id, true);
                }}
                style={{
                  width: 16,
                  height: 16,
                  background: draggingFrom === block.id ? '#3b82f6' : blockColors[block.type],
                  borderRadius: '50%',
                  border: '2px solid #fff',
                  position: 'absolute',
                  right: -8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'crosshair',
                  transition: 'all 0.15s ease',
                  boxShadow: draggingFrom === block.id ? '0 0 8px rgba(59, 130, 246, 0.6)' : 'none',
                  zIndex: 10,
                }}
                title="Drag to connect"
              />
              )
            )}
          </div>
        ))}
        </div>{/* Close zoom/pan transform container */}

        {/* Zoom Controls Bar */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1.5 z-50">
          <button
            onClick={zoomOut}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 font-bold text-lg transition-colors"
            title="Zoom Out"
            type="button"
          >
            −
          </button>
          <div className="w-14 text-center text-xs font-medium text-gray-700 select-none">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={zoomIn}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 font-bold text-lg transition-colors"
            title="Zoom In"
            type="button"
          >
            +
          </button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button
            onClick={fitToView}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 transition-colors"
            title="Fit to View"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="12" height="12" rx="1" />
              <path d="M2 6h4V2M10 2v4h4M14 10h-4v4M6 14v-4H2" />
            </svg>
          </button>
          <button
            onClick={zoomReset}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 text-[10px] font-semibold transition-colors"
            title="Reset Zoom"
            type="button"
          >
            1:1
          </button>
        </div>
      </div>

      {/* RIGHT SIDEBAR - Block Settings */}
      <div
        style={{
          width: 360,
          background: '#fff',
          borderLeft: '1px solid #e5e7eb',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {selectedBlock ? (
          (() => {
            const block = blocks.find((b) => b.id === selectedBlock);
            if (!block) return null;

            const blockType = BLOCK_TYPES.find(b => b.id === block.type);

            return (
              <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{blockType?.icon || '📦'}</span>
                    <h3 className="text-base font-bold text-gray-900 m-0">
                      {blockType?.name || block.type}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 m-0">{blockType?.desc}</p>
                </div>

                <div className="p-4 space-y-4">
                  {/* MESSAGE / END */}
                  {(['message', 'end'].includes(block.type)) && (
                    <label className="block">
                      <span className="text-xs font-semibold text-gray-700">Message Text</span>
                      <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-200">
                        {/* Formatting Toolbar */}
                        <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
                          <button
                            type="button"
                            onClick={() => {
                              const ta = document.getElementById(`msg-ta-${block.id}`) as HTMLTextAreaElement;
                              if (!ta) return;
                              const start = ta.selectionStart;
                              const end = ta.selectionEnd;
                              const text = block.data?.message || '';
                              const selected = text.slice(start, end);
                              const newText = text.slice(0, start) + '*' + (selected || 'bold') + '*' + text.slice(end);
                              updateBlockData(block.id, { message: newText });
                            }}
                            className="px-2 py-1 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                            title="Bold (*text*)"
                          >B</button>
                          <button
                            type="button"
                            onClick={() => {
                              const ta = document.getElementById(`msg-ta-${block.id}`) as HTMLTextAreaElement;
                              if (!ta) return;
                              const start = ta.selectionStart;
                              const end = ta.selectionEnd;
                              const text = block.data?.message || '';
                              const selected = text.slice(start, end);
                              const newText = text.slice(0, start) + '_' + (selected || 'italic') + '_' + text.slice(end);
                              updateBlockData(block.id, { message: newText });
                            }}
                            className="px-2 py-1 text-xs italic text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                            title="Italic (_text_)"
                          >I</button>
                          <button
                            type="button"
                            onClick={() => {
                              const ta = document.getElementById(`msg-ta-${block.id}`) as HTMLTextAreaElement;
                              if (!ta) return;
                              const start = ta.selectionStart;
                              const end = ta.selectionEnd;
                              const text = block.data?.message || '';
                              const selected = text.slice(start, end);
                              const newText = text.slice(0, start) + '~' + (selected || 'strikethrough') + '~' + text.slice(end);
                              updateBlockData(block.id, { message: newText });
                            }}
                            className="px-2 py-1 text-xs line-through text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                            title="Strikethrough (~text~)"
                          >S</button>
                          <div className="w-px h-5 bg-gray-300 mx-1" />
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowEmojiPicker(showEmojiPicker === block.id + '-msg' ? null : block.id + '-msg')}
                              className="px-2 py-1 text-sm bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                              title="Insert emoji"
                            >😊</button>
                            {showEmojiPicker === block.id + '-msg' && (
                              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 w-[220px]">
                                <div className="grid grid-cols-10 gap-0.5">
                                  {COMMON_EMOJIS.map(em => (
                                    <button
                                      key={em}
                                      type="button"
                                      onClick={() => {
                                        const ta = document.getElementById(`msg-ta-${block.id}`) as HTMLTextAreaElement;
                                        const pos = ta?.selectionStart || (block.data?.message || '').length;
                                        const text = block.data?.message || '';
                                        updateBlockData(block.id, { message: text.slice(0, pos) + em + text.slice(pos) });
                                        setShowEmojiPicker(null);
                                      }}
                                      className="text-lg hover:bg-gray-100 rounded p-0.5 leading-none"
                                    >{em}</button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <textarea
                          id={`msg-ta-${block.id}`}
                          value={block.data?.message || ''}
                          onChange={(e) => updateBlockData(block.id, { message: e.target.value })}
                          className="w-full px-3 py-2 text-sm resize-none border-0 focus:outline-none focus:ring-0"
                          rows={3}
                          placeholder="Enter message... Use *bold* _italic_ ~strike~"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Use *bold* _italic_ ~strikethrough~</p>
                    </label>
                  )}

                  {/* QUESTION / BUTTONS */}
                  {(['question', 'buttons'].includes(block.type)) && (
                    <>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Question Text</span>
                        <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-200">
                          {/* Formatting Toolbar */}
                          <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
                            <button
                              type="button"
                              onClick={() => {
                                const ta = document.getElementById(`q-ta-${block.id}`) as HTMLTextAreaElement;
                                if (!ta) return;
                                const start = ta.selectionStart;
                                const end = ta.selectionEnd;
                                const text = block.data?.question || '';
                                const selected = text.slice(start, end);
                                const newText = text.slice(0, start) + '*' + (selected || 'bold') + '*' + text.slice(end);
                                updateBlockData(block.id, { question: newText });
                              }}
                              className="px-2 py-1 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                              title="Bold (*text*)"
                            >B</button>
                            <button
                              type="button"
                              onClick={() => {
                                const ta = document.getElementById(`q-ta-${block.id}`) as HTMLTextAreaElement;
                                if (!ta) return;
                                const start = ta.selectionStart;
                                const end = ta.selectionEnd;
                                const text = block.data?.question || '';
                                const selected = text.slice(start, end);
                                const newText = text.slice(0, start) + '_' + (selected || 'italic') + '_' + text.slice(end);
                                updateBlockData(block.id, { question: newText });
                              }}
                              className="px-2 py-1 text-xs italic text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                              title="Italic (_text_)"
                            >I</button>
                            <button
                              type="button"
                              onClick={() => {
                                const ta = document.getElementById(`q-ta-${block.id}`) as HTMLTextAreaElement;
                                if (!ta) return;
                                const start = ta.selectionStart;
                                const end = ta.selectionEnd;
                                const text = block.data?.question || '';
                                const selected = text.slice(start, end);
                                const newText = text.slice(0, start) + '~' + (selected || 'strikethrough') + '~' + text.slice(end);
                                updateBlockData(block.id, { question: newText });
                              }}
                              className="px-2 py-1 text-xs line-through text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                              title="Strikethrough (~text~)"
                            >S</button>
                            <div className="w-px h-5 bg-gray-300 mx-1" />
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowEmojiPicker(showEmojiPicker === block.id + '-q' ? null : block.id + '-q')}
                                className="px-2 py-1 text-sm bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                                title="Insert emoji"
                              >😊</button>
                              {showEmojiPicker === block.id + '-q' && (
                                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 w-[220px]">
                                  <div className="grid grid-cols-10 gap-0.5">
                                    {COMMON_EMOJIS.map(em => (
                                      <button
                                        key={em}
                                        type="button"
                                        onClick={() => {
                                          const ta = document.getElementById(`q-ta-${block.id}`) as HTMLTextAreaElement;
                                          const pos = ta?.selectionStart || (block.data?.question || '').length;
                                          const text = block.data?.question || '';
                                          updateBlockData(block.id, { question: text.slice(0, pos) + em + text.slice(pos) });
                                          setShowEmojiPicker(null);
                                        }}
                                        className="text-lg hover:bg-gray-100 rounded p-0.5 leading-none"
                                      >{em}</button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <textarea
                            id={`q-ta-${block.id}`}
                            value={block.data?.question || ''}
                            onChange={(e) => updateBlockData(block.id, { question: e.target.value })}
                            className="w-full px-3 py-2 text-sm resize-none border-0 focus:outline-none focus:ring-0"
                            rows={2}
                            placeholder="Enter question... Use *bold* _italic_"
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Use *bold* _italic_ ~strikethrough~</p>
                      </label>
                      <div>
                        <span className="text-xs font-semibold text-gray-700">Options</span>
                        <p className="text-[11px] text-gray-500 mt-0.5 mb-2">Create clickable buttons for user responses</p>
                        <div className="mt-1 space-y-2">
                          {(block.data?.options || []).map((opt, i) => {
                            const label = typeof opt === 'string' ? opt : opt.label;
                            const hasConn = connections.some(c => c.fromId === block.id && c.optionIndex === i);
                            return (
                              <div key={i} className="flex gap-2 items-center">
                                <div 
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                  style={{ background: hasConn ? '#22c55e' : '#3b82f6' }}
                                >
                                  {i + 1}
                                </div>
                                <div className="flex-1 relative">
                                  <input
                                    value={label}
                                    onChange={(e) => {
                                      const newOpts = [...(block.data?.options || [])];
                                      newOpts[i] = { label: e.target.value, value: e.target.value };
                                      updateBlockData(block.id, { options: newOpts });
                                    }}
                                    maxLength={20}
                                    className={`w-full px-3 py-2 border-2 rounded-lg text-sm font-medium focus:outline-none transition-all ${label.length > 20 ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-400' : 'border-indigo-200 bg-indigo-50 text-indigo-700 focus:border-indigo-400 focus:bg-white'}`}
                                    placeholder={`Button ${i + 1} text`}
                                  />
                                  <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono ${label.length >= 18 ? 'text-red-500' : 'text-gray-400'}`}>{label.length}/20</span>
                                </div>
                                <button
                                  onClick={() => {
                                    const newOpts = (block.data?.options || []).filter((_, idx) => idx !== i);
                                    updateBlockData(block.id, { options: newOpts });
                                    // Remove connections from this option
                                    setConnections(prev => prev.filter(c => !(c.fromId === block.id && c.optionIndex === i)));
                                  }}
                                  className="px-2 text-red-500 hover:bg-red-50 rounded text-lg"
                                >✕</button>
                              </div>
                            );
                          })}
                          <button
                            onClick={() => {
                              updateBlockData(block.id, {
                                options: [...(block.data?.options || []), { label: 'New button', value: 'new_button' }],
                              });
                            }}
                            className="w-full px-3 py-2.5 bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 text-sm font-semibold hover:bg-indigo-100 hover:border-indigo-400 transition-all"
                          >
                            + Add Button
                          </button>
                          {(block.data?.options || []).length > 0 && (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 mt-2">
                              <p className="text-[11px] text-indigo-700">
                                💡 Each button creates an output connector on the canvas. Drag from the <span className="inline-block w-3 h-3 rounded-full bg-indigo-500 align-middle"></span> port to connect each button to its next step.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* TEMPLATE */}
                  {block.type === 'template' && (
                    <div className="space-y-4">
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Select Template</span>
                        <select
                          value={block.data?.templateName || ''}
                          onChange={(e) => updateBlockData(block.id, { templateName: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        >
                          <option value="">-- Select a template --</option>
                          {templates.map((tpl) => (
                            <option key={tpl._id} value={tpl.templateName}>
                              {tpl.templateName} ({tpl.language}) {tpl.metaStatus === 'APPROVED' ? '✅' : tpl.metaStatus === 'PENDING' ? '⏳' : '❌'}
                            </option>
                          ))}
                        </select>
                      </label>
                      {templates.length === 0 && (
                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                          No templates found. Create templates in the CRM Templates section first.
                        </p>
                      )}
                      {block.data?.templateName && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <span className="text-xs font-medium text-green-700">
                            Selected: {block.data.templateName}
                          </span>
                        </div>
                      )}

                      {/* Auto-sync template buttons when template is selected */}
                      {block.data?.templateName && (() => {
                        const tpl = templates.find(t => t.templateName === block.data?.templateName);
                        const tplButtons = tpl?.buttons || [];
                        const currentButtons = block.data?.templateButtons || [];
                        
                        return (
                          <>
                            {/* Show sync button if template has buttons */}
                            {tplButtons.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateBlockData(block.id, {
                                    templateButtons: tplButtons.map((btn: any) => ({
                                      title: btn.title || btn.text || btn.label || 'Button',
                                      type: btn.type || 'QUICK_REPLY',
                                    }))
                                  });
                                }}
                                className="w-full px-3 py-2 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                              >
                                🔄 Sync {tplButtons.length} button{tplButtons.length > 1 ? 's' : ''} from template
                              </button>
                            )}
                          </>
                        );
                      })()}

                      {/* Manual Button Connectors Editor */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">Button Connectors</span>
                          <span className="text-[10px] text-gray-400">Each button = 1 output port</span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Add buttons to create per-button output connectors on the canvas. Drag each port to the next node.
                        </p>
                        <div className="space-y-2">
                          {(block.data?.templateButtons || []).map((btn: any, i: number) => (
                            <div key={i} className="flex gap-2 items-center">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ background: connections.some(c => c.fromId === block.id && c.optionIndex === i) ? '#22c55e' : '#3b82f6' }}
                              >{i + 1}</div>
                              <div className="flex-1 relative">
                                <input
                                  value={btn.title || btn.text || ''}
                                  onChange={(e) => {
                                    const newBtns = [...(block.data?.templateButtons || [])];
                                    newBtns[i] = { ...newBtns[i], title: e.target.value };
                                    updateBlockData(block.id, { templateButtons: newBtns });
                                  }}
                                  maxLength={20}
                                  className={`w-full px-3 py-1.5 border rounded-lg text-sm ${(btn.title || btn.text || '').length > 20 ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                                  placeholder={`Button ${i + 1} label`}
                                />
                                <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono ${(btn.title || btn.text || '').length >= 18 ? 'text-red-500' : 'text-gray-400'}`}>{(btn.title || btn.text || '').length}/20</span>
                              </div>
                              <button
                                onClick={() => {
                                  const newBtns = (block.data?.templateButtons || []).filter((_: any, idx: number) => idx !== i);
                                  updateBlockData(block.id, { templateButtons: newBtns });
                                  // Also remove connections from this button
                                  setConnections(prev => prev.filter(c => !(c.fromId === block.id && c.optionIndex === i)));
                                }}
                                className="px-2 text-red-500 hover:bg-red-50 rounded"
                              >✕</button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const newBtns = [...(block.data?.templateButtons || []), { title: `Button ${(block.data?.templateButtons || []).length + 1}`, type: 'QUICK_REPLY' }];
                              updateBlockData(block.id, { templateButtons: newBtns });
                            }}
                            className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm hover:border-indigo-400 hover:text-indigo-500"
                          >
                            + Add Button Connector
                          </button>
                        </div>
                        {(block.data?.templateButtons || []).length > 0 && (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2">
                            <p className="text-[11px] text-indigo-700">
                              💡 Drag from each <span className="inline-block w-3 h-3 rounded-full bg-indigo-500 align-middle"></span> port on the canvas to connect each button to its next step.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Template Preview */}
                      {block.data?.templateName && (() => {
                        const tpl = templates.find(t => t.templateName === block.data?.templateName);
                        if (!tpl) return null;
                        const bodyText = tpl.templateContent || tpl.bodyText || '';
                        return (
                          <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                            <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200">
                              <span className="text-xs font-semibold text-gray-600">📱 Template Preview</span>
                            </div>
                            <div className="bg-[#e5ddd5] p-3">
                              <div className="max-w-[280px] bg-white rounded-lg shadow-sm overflow-hidden">
                                {/* Header Image */}
                                {tpl.headerMedia?.url && (
                                  <div className="bg-gray-100">
                                    <img 
                                      src={tpl.headerMedia.url} 
                                      alt="Template header" 
                                      className="w-full h-32 object-cover"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  </div>
                                )}
                                {/* Body */}
                                <div className="p-3">
                                  <p 
                                    className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: formatWhatsAppText(bodyText || '(No body text)') }}
                                  />
                                  {/* Footer */}
                                  {tpl.footerText && (
                                    <p className="text-xs text-gray-500 mt-2">{tpl.footerText}</p>
                                  )}
                                  {/* Timestamp */}
                                  <p className="text-[10px] text-gray-400 text-right mt-1">
                                    {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                {/* Buttons */}
                                {tpl.buttons && tpl.buttons.length > 0 && (
                                  <div className="border-t border-gray-100">
                                    {tpl.buttons.map((btn: any, i: number) => (
                                      <div key={i} className="flex items-center justify-center gap-1 py-2 border-b border-gray-100 last:border-b-0 text-indigo-500 text-sm font-medium">
                                        {btn.type === 'URL' && <span>🔗</span>}
                                        {btn.type === 'PHONE_NUMBER' && <span>📞</span>}
                                        {btn.type === 'QUICK_REPLY' && <span>↩️</span>}
                                        {btn.title || btn.text || btn.label || 'Button'}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Meta info */}
                            <div className="px-3 py-2 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                              <span>📂 {tpl.category || 'MARKETING'}</span>
                              <span>🌐 {tpl.language || 'en'}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* DELAY - Enhanced with time units */}
                  {block.type === 'delay' && (
                    <div className="space-y-4">
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-indigo-700 mb-2">
                          <span>⏱️</span>
                          <span className="text-sm font-medium">Delay Timer</span>
                        </div>
                        <p className="text-xs text-indigo-600">
                          Wait for a specific time before proceeding to the next step.
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block">
                            <span className="text-xs font-semibold text-gray-700">Duration</span>
                            <input
                              type="number"
                              value={
                                block.data?.delayUnit === 'seconds' 
                                  ? (block.data?.delaySeconds || 0)
                                  : block.data?.delayUnit === 'hours'
                                    ? (block.data?.delayHours || 0)
                                    : (block.data?.delayMinutes || 5)
                              }
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const unit = block.data?.delayUnit || 'minutes';
                                updateBlockData(block.id, {
                                  delaySeconds: unit === 'seconds' ? val : undefined,
                                  delayMinutes: unit === 'minutes' ? val : undefined,
                                  delayHours: unit === 'hours' ? val : undefined,
                                });
                              }}
                              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              min={0}
                              max={block.data?.delayUnit === 'hours' ? 72 : 9999}
                            />
                          </label>
                        </div>
                        <div className="w-28">
                          <label className="block">
                            <span className="text-xs font-semibold text-gray-700">Unit</span>
                            <select
                              value={block.data?.delayUnit || 'minutes'}
                              onChange={(e) => {
                                const unit = e.target.value as 'seconds' | 'minutes' | 'hours';
                                // Convert existing value to new unit
                                const currentVal = block.data?.delayMinutes || block.data?.delaySeconds || block.data?.delayHours || 5;
                                updateBlockData(block.id, {
                                  delayUnit: unit,
                                  delaySeconds: unit === 'seconds' ? currentVal : undefined,
                                  delayMinutes: unit === 'minutes' ? currentVal : undefined,
                                  delayHours: unit === 'hours' ? Math.min(currentVal, 72) : undefined,
                                });
                              }}
                              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            >
                              <option value="seconds">Seconds</option>
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                            </select>
                          </label>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        💡 Common delays: 2 min (quick follow-up), 30 min (reminder), 1-24 hours (drip campaign)
                      </div>
                    </div>
                  )}

                  {/* WAIT FOR REPLY - NEW */}
                  {block.type === 'wait_reply' && (
                    <div className="space-y-4">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-purple-700 mb-2">
                          <span>⏳</span>
                          <span className="text-sm font-medium">Wait for User Reply</span>
                        </div>
                        <p className="text-xs text-purple-600">
                          Pause and wait for the user to respond. If no reply within timeout, go to fallback path.
                        </p>
                      </div>
                      
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Timeout (minutes)</span>
                        <p className="text-xs text-gray-500 mb-1">How long to wait for user reply</p>
                        <input
                          type="number"
                          value={block.data?.waitTimeoutMinutes || 60}
                          onChange={(e) => updateBlockData(block.id, { waitTimeoutMinutes: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          min={1}
                          max={10080}
                          placeholder="60"
                        />
                        <div className="flex flex-wrap gap-1 mt-2">
                          {[5, 15, 30, 60, 120, 1440].map(mins => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => updateBlockData(block.id, { waitTimeoutMinutes: mins })}
                              className={`px-2 py-1 text-xs rounded ${
                                block.data?.waitTimeoutMinutes === mins 
                                  ? 'bg-purple-600 text-white' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {mins < 60 ? `${mins}m` : mins === 60 ? '1hr' : mins === 120 ? '2hr' : '24hr'}
                            </button>
                          ))}
                        </div>
                      </label>
                      
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Delay After Reply (minutes)</span>
                        <p className="text-xs text-gray-500 mb-1">Wait time after user replies before continuing</p>
                        <input
                          type="number"
                          value={block.data?.replyDelayMinutes || 0}
                          onChange={(e) => updateBlockData(block.id, { replyDelayMinutes: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          min={0}
                          max={60}
                          placeholder="0"
                        />
                        <div className="flex flex-wrap gap-1 mt-2">
                          {[0, 1, 2, 5, 10].map(mins => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => updateBlockData(block.id, { replyDelayMinutes: mins })}
                              className={`px-2 py-1 text-xs rounded ${
                                (block.data?.replyDelayMinutes || 0) === mins 
                                  ? 'bg-purple-600 text-white' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {mins === 0 ? 'Instant' : `${mins}m`}
                            </button>
                          ))}
                        </div>
                      </label>
                      
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Timeout Action (Fallback)</span>
                        <p className="text-xs text-gray-500 mb-1">Which node to go to if user doesn&apos;t reply</p>
                        <select
                          value={block.data?.timeoutNodeId || ''}
                          onChange={(e) => updateBlockData(block.id, { timeoutNodeId: e.target.value || undefined })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="">End Flow (No action)</option>
                          {blocks
                            .filter(b => b.id !== block.id)
                            .map(b => {
                              const bt = BLOCK_TYPES.find(t => t.id === b.type);
                              return (
                                <option key={b.id} value={b.id}>
                                  {bt?.icon || '📦'} {b.label || bt?.name || b.type}
                                </option>
                              );
                            })
                          }
                        </select>
                      </label>
                      
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-amber-700 text-xs">
                          <span>💡</span>
                          <span>
                            <strong>Tip:</strong> Connect this node to two paths:
                            <br />• Main path → continues when user replies
                            <br />• Timeout path → triggers if no reply
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CONDITION */}
                  {block.type === 'condition' && (
                    <>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Field</span>
                        <select
                          value={block.data?.conditionField || 'text'}
                          onChange={(e) => updateBlockData(block.id, { conditionField: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="text">User Message</option>
                          <option value="label">Lead Label</option>
                          <option value="status">Lead Status</option>
                          <option value="variable">Variable</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Operator</span>
                        <select
                          value={block.data?.conditionOp || 'contains'}
                          onChange={(e) => updateBlockData(block.id, { conditionOp: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="contains">Contains</option>
                          <option value="equals">Equals</option>
                          <option value="startsWith">Starts With</option>
                          <option value="endsWith">Ends With</option>
                          <option value="regex">Regex</option>
                          <option value="gt">Greater Than</option>
                          <option value="lt">Less Than</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Value</span>
                        <input
                          value={block.data?.conditionValue || ''}
                          onChange={(e) => updateBlockData(block.id, { conditionValue: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="Value to match"
                        />
                      </label>
                    </>
                  )}

                  {/* VARIABLE */}
                  {block.type === 'variable' && (
                    <>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Variable Name</span>
                        <input
                          value={block.data?.variableName || ''}
                          onChange={(e) => updateBlockData(block.id, { variableName: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="e.g. user_name"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Value</span>
                        <input
                          value={block.data?.variableValue || ''}
                          onChange={(e) => updateBlockData(block.id, { variableValue: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="Value or {{user_input}}"
                        />
                      </label>
                    </>
                  )}

                  {/* LOOP */}
                  {block.type === 'loop' && (
                    <label className="block">
                      <span className="text-xs font-semibold text-gray-700">Loop Count</span>
                      <input
                        type="number"
                        value={block.data?.loopCount || 3}
                        onChange={(e) => updateBlockData(block.id, { loopCount: Number(e.target.value) })}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        min={1}
                        max={10}
                      />
                    </label>
                  )}

                  {/* CRM UPDATE */}
                  {block.type === 'crm_update' && (
                    <label className="block">
                      <span className="text-xs font-semibold text-gray-700">Lead Updates (JSON)</span>
                      <textarea
                        value={JSON.stringify(block.data?.leadUpdates || {}, null, 2)}
                        onChange={(e) => {
                          try {
                            updateBlockData(block.id, { leadUpdates: JSON.parse(e.target.value) });
                          } catch {}
                        }}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                        rows={4}
                        placeholder='{"status": "prospect"}'
                      />
                    </label>
                  )}

                  {/* ASSIGN AGENT */}
                  {block.type === 'assign_agent' && (
                    <>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Agent User ID</span>
                        <input
                          value={block.data?.assignToUserId || ''}
                          onChange={(e) => updateBlockData(block.id, { assignToUserId: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="User ID or leave empty for round-robin"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Agent Label</span>
                        <input
                          value={block.data?.assignToLabel || ''}
                          onChange={(e) => updateBlockData(block.id, { assignToLabel: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="Display name (optional)"
                        />
                      </label>
                    </>
                  )}

                  {/* NOTIFICATION */}
                  {block.type === 'notification' && (
                    <>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Type</span>
                        <select
                          value={block.data?.notificationType || 'email'}
                          onChange={(e) => updateBlockData(block.id, { notificationType: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="email">Email</option>
                          <option value="sms">SMS</option>
                          <option value="push">Push Notification</option>
                          <option value="whatsapp">WhatsApp</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Recipient</span>
                        <input
                          value={block.data?.notificationRecipient || ''}
                          onChange={(e) => updateBlockData(block.id, { notificationRecipient: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="Email/phone or {{admin_email}}"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Message</span>
                        <textarea
                          value={block.data?.notificationMessage || ''}
                          onChange={(e) => updateBlockData(block.id, { notificationMessage: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          rows={2}
                          placeholder="Notification message..."
                        />
                      </label>
                    </>
                  )}

                  {/* API CALL */}
                  {block.type === 'api_call' && (
                    <>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">URL</span>
                        <input
                          value={block.data?.apiUrl || ''}
                          onChange={(e) => updateBlockData(block.id, { apiUrl: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="https://api.example.com/endpoint"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Method</span>
                        <select
                          value={block.data?.apiMethod || 'POST'}
                          onChange={(e) => updateBlockData(block.id, { apiMethod: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Body (JSON)</span>
                        <textarea
                          value={block.data?.apiBody || ''}
                          onChange={(e) => updateBlockData(block.id, { apiBody: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                          rows={3}
                          placeholder='{"key": "value"}'
                        />
                      </label>
                    </>
                  )}

                  {/* WEBHOOK */}
                  {block.type === 'webhook' && (
                    <label className="block">
                      <span className="text-xs font-semibold text-gray-700">Webhook URL</span>
                      <input
                        value={block.data?.webhookUrl || ''}
                        onChange={(e) => updateBlockData(block.id, { webhookUrl: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="https://webhook.example.com/..."
                      />
                    </label>
                  )}

                  {/* MEDIA NODES */}
                  {(['image', 'document', 'audio', 'video'].includes(block.type)) && (
                    <div className="space-y-4">
                      {/* Upload Section */}
                      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <input
                          type="file"
                          id={`file-upload-${block.id}`}
                          className="hidden"
                          accept={
                            block.type === 'image' ? 'image/*' :
                            block.type === 'document' ? '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx' :
                            block.type === 'audio' ? 'audio/*' :
                            block.type === 'video' ? 'video/*' : '*/*'
                          }
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            setUploadingBlockId(block.id);
                            try {
                              // Convert to base64
                              const reader = new FileReader();
                              reader.onload = async () => {
                                const base64 = reader.result as string;
                                try {
                                  const res = await crm.fetch('/api/admin/crm/upload/s3/base64', {
                                    method: 'POST',
                                    body: {
                                      base64,
                                      fileName: file.name,
                                      category: 'chatbot-media'
                                    }
                                  });
                                  // useCRM unwraps data, so res = { key, publicUrl, indirectUrl }
                                  const url = res?.publicUrl || res?.data?.publicUrl;
                                  if (url) {
                                    updateBlockData(block.id, { mediaUrl: url });
                                  }
                                } catch (uploadErr) {
                                  console.error('Upload failed:', uploadErr);
                                }
                                setUploadingBlockId(null);
                              };
                              reader.readAsDataURL(file);
                            } catch (err) {
                              console.error('Upload failed:', err);
                              setUploadingBlockId(null);
                            }
                          }}
                        />
                        <label
                          htmlFor={`file-upload-${block.id}`}
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          {uploadingBlockId === block.id ? (
                            <>
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                              <span className="text-sm text-gray-500">Uploading to S3...</span>
                            </>
                          ) : (
                            <>
                              <div className="text-3xl">
                                {block.type === 'image' ? '🖼️' : block.type === 'document' ? '📄' : block.type === 'audio' ? '🎵' : '🎬'}
                              </div>
                              <span className="text-sm font-medium text-pink-600">Click to upload {block.type}</span>
                              <span className="text-xs text-gray-400">
                                {block.type === 'image' ? 'JPG, PNG, GIF up to 5MB' :
                                 block.type === 'document' ? 'PDF, DOC, XLS, PPT up to 10MB' :
                                 block.type === 'audio' ? 'MP3, WAV, OGG up to 16MB' :
                                 'MP4, WebM up to 16MB'}
                              </span>
                            </>
                          )}
                        </label>
                      </div>

                      {/* Preview or URL */}
                      {block.data?.mediaUrl && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-green-700">✅ Uploaded</span>
                            <button
                              onClick={() => updateBlockData(block.id, { mediaUrl: '' })}
                              className="text-xs text-red-500 hover:text-red-700"
                            >Remove</button>
                          </div>
                          {block.type === 'image' && (
                            <img src={block.data.mediaUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                          )}
                          {block.type !== 'image' && (
                            <p className="text-xs text-green-600 truncate">{block.data.mediaUrl}</p>
                          )}
                        </div>
                      )}

                      {/* Or enter URL manually */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="px-2 bg-white text-gray-400">or enter URL</span>
                        </div>
                      </div>

                      <input
                        value={block.data?.mediaUrl || ''}
                        onChange={(e) => updateBlockData(block.id, { mediaUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="https://..."
                      />

                      {(['image', 'video'].includes(block.type)) && (
                        <label className="block">
                          <span className="text-xs font-semibold text-gray-700">Caption (optional)</span>
                          <input
                            value={block.data?.mediaCaption || ''}
                            onChange={(e) => updateBlockData(block.id, { mediaCaption: e.target.value })}
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {/* LOCATION */}
                  {block.type === 'location' && (
                    <>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Location Name</span>
                        <input
                          value={block.data?.locationName || ''}
                          onChange={(e) => updateBlockData(block.id, { locationName: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="Swar Yoga Studio"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-gray-700">Latitude</span>
                          <input
                            type="number"
                            step="0.000001"
                            value={block.data?.latitude || 0}
                            onChange={(e) => updateBlockData(block.id, { latitude: Number(e.target.value) })}
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-gray-700">Longitude</span>
                          <input
                            type="number"
                            step="0.000001"
                            value={block.data?.longitude || 0}
                            onChange={(e) => updateBlockData(block.id, { longitude: Number(e.target.value) })}
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          />
                        </label>
                      </div>
                    </>
                  )}

                  {/* KNOWLEDGE BASE */}
                  {block.type === 'knowledge_base' && (
                    <>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Category Filter</span>
                        <select
                          value={block.data?.kbCategory || ''}
                          onChange={(e) => updateBlockData(block.id, { kbCategory: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                          <option value="">All Categories</option>
                          <option value="general">General</option>
                          <option value="workshops">Workshops</option>
                          <option value="pricing">Pricing</option>
                          <option value="schedule">Schedule</option>
                          <option value="booking">Booking</option>
                          <option value="payment">Payment</option>
                          <option value="refund">Refund</option>
                          <option value="location">Location</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Fallback Message</span>
                        <textarea
                          value={block.data?.kbFallback || ''}
                          onChange={(e) => updateBlockData(block.id, { kbFallback: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          rows={2}
                          placeholder="Message when no KB match found"
                        />
                      </label>
                    </>
                  )}

                  {/* AI RESPONSE */}
                  {block.type === 'ai_response' && (
                    <>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Custom Prompt (optional)</span>
                        <textarea
                          value={block.data?.aiPrompt || ''}
                          onChange={(e) => updateBlockData(block.id, { aiPrompt: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          rows={3}
                          placeholder="Additional instructions for AI..."
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Max Tokens</span>
                        <input
                          type="number"
                          value={block.data?.aiMaxTokens || 150}
                          onChange={(e) => updateBlockData(block.id, { aiMaxTokens: Number(e.target.value) })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          min={50}
                          max={500}
                        />
                      </label>
                    </>
                  )}

                  {/* CALENDAR */}
                  {block.type === 'calendar' && (
                    <label className="block">
                      <span className="text-xs font-semibold text-gray-700">Calendar Type</span>
                      <select
                        value={block.data?.calendarType || 'booking'}
                        onChange={(e) => updateBlockData(block.id, { calendarType: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="booking">Booking</option>
                        <option value="consultation">Consultation</option>
                        <option value="workshop">Workshop</option>
                        <option value="class">Class</option>
                      </select>
                    </label>
                  )}

                  {/* PAYMENT */}
                  {block.type === 'payment' && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-gray-700">Amount</span>
                          <input
                            type="number"
                            value={block.data?.paymentAmount || 0}
                            onChange={(e) => updateBlockData(block.id, { paymentAmount: Number(e.target.value) })}
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            min={0}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-gray-700">Currency</span>
                          <select
                            value={block.data?.paymentCurrency || 'INR'}
                            onChange={(e) => updateBlockData(block.id, { paymentCurrency: e.target.value })}
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          >
                            <option value="INR">INR</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                          </select>
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Description</span>
                        <input
                          value={block.data?.paymentDescription || ''}
                          onChange={(e) => updateBlockData(block.id, { paymentDescription: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="Workshop registration fee"
                        />
                      </label>
                    </>
                  )}

                  {/* Common: Labels */}
                  <div className="border-t border-gray-100 pt-4">
                    <label className="block">
                      <span className="text-xs font-semibold text-gray-700">Assign Labels</span>
                      <input
                        value={(block.data?.assignLabels || []).join(', ')}
                        onChange={(e) => updateBlockData(block.id, { 
                          assignLabels: e.target.value.split(',').map(l => l.trim()).filter(Boolean)
                        })}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="label1, label2"
                      />
                    </label>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="text-4xl mb-3">👆</div>
            <h3 className="font-bold text-gray-800 mb-1">Select a Node</h3>
            <p className="text-gray-500 text-sm">Click on a node to edit its properties</p>
          </div>
        )}

        {/* Bottom Action */}
        {blocks.length > 0 && selectedBlock && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-2">
            <button
              onClick={() => duplicateBlock(selectedBlock)}
              className="w-full px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100"
            >
              📋 Duplicate Node
            </button>
            <button
              onClick={() => deleteBlock(selectedBlock)}
              className="w-full px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100"
            >
              🗑️ Delete Node
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
