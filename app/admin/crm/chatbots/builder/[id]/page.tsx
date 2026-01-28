'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
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
  const [hoveringBlock, setHoveringBlock] = useState<string | null>(null); // Block being hovered for connection drop
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null); // Track mouse during connection drag
  const [activeCategory, setActiveCategory] = useState<string>('basic');
  const [flowName, setFlowName] = useState('Untitled Flow');
  const [flowEnabled, setFlowEnabled] = useState(true);
  const [templates, setTemplates] = useState<Array<{ _id: string; templateName: string; language: string; metaStatus?: string; headerMedia?: { url: string } }>>([]);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const rafMoveRef = useRef<number | null>(null);

  // Get block color helper
  const getBlockColor = (type: string) => {
    return BLOCK_TYPES.find(b => b.id === type)?.color || '#6B7280';
  };
  
  const getBlockIcon = (type: string) => {
    return BLOCK_TYPES.find(b => b.id === type)?.icon || '📦';
  };

  // Fetch data on mount
  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }

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
      const newBlock: Block = {
        id: `block_${Date.now()}`,
        type: type as any,
        x: 150 + blocks.length * 30,
        y: 150 + blocks.length * 30,
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
    [blocks.length]
  );

  // Canvas mouse down for dragging
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === canvasRef.current) {
        setSelectedBlock(null);
      }
    },
    []
  );

  // Drag block
  const handleBlockMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, blockId: string, isOutput?: boolean) => {
      e.preventDefault();
      if (isOutput) {
        setDraggingFrom(blockId);
        return;
      }

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        setDraggingBlock({
          id: blockId,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
        });
      }
      setSelectedBlock(blockId);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canvasRef.current) return;
      
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      // Track mouse position for connection line drawing
      if (draggingFrom) {
        setMousePos({
          x: e.clientX - canvasRect.left,
          y: e.clientY - canvasRect.top,
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
        const x = Math.max(0, e.clientX - canvasRect.left - draggingBlock.offsetX);
        const y = Math.max(0, e.clientY - canvasRect.top - draggingBlock.offsetY);

        setBlocks((prev) => prev.map((b) => (b.id === draggingBlock.id ? { ...b, x, y } : b)));
      });
    },
    [draggingBlock, draggingFrom]
  );

  // Handle dropping connection on a block's input port
  const handleInputPortMouseUp = useCallback((targetBlockId: string) => {
    if (draggingFrom && draggingFrom !== targetBlockId) {
      // Prevent duplicate connections
      const existsAlready = connections.some(c => c.fromId === draggingFrom && c.toId === targetBlockId);
      if (!existsAlready) {
        setConnections(prev => [...prev, { fromId: draggingFrom, toId: targetBlockId }]);
      }
    }
    setDraggingFrom(null);
    setMousePos(null);
    setHoveringBlock(null);
  }, [draggingFrom, connections]);

  const handleMouseUp = useCallback(() => {
    setDraggingBlock(null);
    setDraggingFrom(null);
    setMousePos(null);
    setHoveringBlock(null);
    if (rafMoveRef.current) {
      window.cancelAnimationFrame(rafMoveRef.current);
      rafMoveRef.current = null;
    }
  }, []);

  // Delete block
  const deleteBlock = useCallback((blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setConnections((prev) =>
      prev.filter((c) => c.fromId !== blockId && c.toId !== blockId)
    );
    if (selectedBlock === blockId) setSelectedBlock(null);
  }, [selectedBlock]);

  // Delete connection
  const deleteConnection = useCallback((fromId: string, toId: string) => {
    setConnections((prev) => prev.filter((c) => !(c.fromId === fromId && c.toId === toId)));
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
        const nextConn = connections.find(c => c.fromId === b.id);
        
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
          fallbackNodeId: fallbackConn?.toId || b.data?.fallbackNodeId,
          options: b.data?.options?.map((o, i) => ({
            label: typeof o === 'string' ? o : o.label,
            value: typeof o === 'string' ? o : o.value,
            nextNodeId: connections.find(c => c.fromId === b.id && c.label === String(i))?.toId || undefined
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
  }, [chatbotId, crm, blocks, connections, router, flowName, flowEnabled]);

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
            className="text-lg font-bold border-0 border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 bg-transparent"
            placeholder="Flow Name"
          />
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${flowEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {flowEnabled ? '✅ Active' : '❌ Inactive'}
          </span>
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
        className="flex-1 bg-gray-50 relative overflow-auto select-none"
        style={{ cursor: draggingFrom ? 'crosshair' : 'default' }}
      >
        {/* Connection drag hint */}
        {draggingFrom && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 animate-pulse">
            🔗 Drop on a block's left port to connect
          </div>
        )}
        
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
            const y1 = fromBlock.y + 50;
            const x2 = toBlock.x; // Left side (input port)
            const y2 = toBlock.y + 50;
            
            // Calculate control points for smooth bezier curve
            const midX = (x1 + x2) / 2;

            return (
              <g key={`${conn.fromId}-${conn.toId}`} className="group cursor-pointer" style={{ pointerEvents: 'auto' }}>
                {/* Invisible wider path for easier clicking */}
                <path
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  stroke="transparent"
                  strokeWidth="12"
                  fill="none"
                  onClick={() => deleteConnection(conn.fromId, conn.toId)}
                />
                {/* Visible path */}
                <path
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  stroke="#94a3b8"
                  strokeWidth="2"
                  fill="none"
                  className="group-hover:stroke-red-400 transition-colors"
                  onClick={() => deleteConnection(conn.fromId, conn.toId)}
                />
                {/* Arrow head */}
                <polygon
                  points={`${x2},${y2} ${x2 - 8},${y2 - 5} ${x2 - 8},${y2 + 5}`}
                  fill="#94a3b8"
                  className="group-hover:fill-red-400 transition-colors"
                />
                {/* Delete icon on hover */}
                <g className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteConnection(conn.fromId, conn.toId)}>
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

            {/* Block Content */}
            <div style={{ padding: '12px 14px', color: '#6b7280', fontSize: 12 }}>
              {/* Message types */}
              {block.type === 'message' && (
                <div style={{ color: '#1f2937', fontSize: 12, lineHeight: 1.4 }}>
                  {block.data?.message || 'Message'}
                </div>
              )}
              
              {/* Question/Buttons types */}
              {(['question', 'buttons'].includes(block.type)) && (
                <div>
                  <div style={{ color: '#1f2937', fontSize: 12, marginBottom: 8 }}>
                    {block.data?.question || 'Question'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(block.data?.options || []).map((opt, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 11,
                          padding: '4px 8px',
                          background: '#f3f4f6',
                          borderRadius: 4,
                          color: '#1f2937',
                        }}
                      >
                        ● {typeof opt === 'string' ? opt : opt.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Template */}
              {block.type === 'template' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  📋 {block.data?.templateName || 'Select template...'}
                </div>
              )}
              
              {/* Delay - Enhanced with units */}
              {block.type === 'delay' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  ⏱️ Wait {block.data?.delayMinutes || block.data?.delaySeconds || 0} {block.data?.delayUnit || 'minutes'}
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
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  {block.data?.message || 'End conversation'}
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
              
              {/* Media types */}
              {['image', 'document', 'audio', 'video'].includes(block.type) && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  {getBlockIcon(block.type)} {block.data?.mediaUrl?.substring(0, 30) || 'Enter media URL...'}
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
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: draggingFrom ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
                zIndex: 10,
              }}
              title="Drop connection here"
            />

            {/* Output Port (Right side - for creating connections) */}
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
          </div>
        ))}
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
                      <textarea
                        value={block.data?.message || ''}
                        onChange={(e) => updateBlockData(block.id, { message: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                        rows={3}
                        placeholder="Enter message..."
                      />
                    </label>
                  )}

                  {/* QUESTION / BUTTONS */}
                  {(['question', 'buttons'].includes(block.type)) && (
                    <>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Question Text</span>
                        <textarea
                          value={block.data?.question || ''}
                          onChange={(e) => updateBlockData(block.id, { question: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                          rows={2}
                        />
                      </label>
                      <div>
                        <span className="text-xs font-semibold text-gray-700">Options</span>
                        <div className="mt-1 space-y-2">
                          {(block.data?.options || []).map((opt, i) => (
                            <div key={i} className="flex gap-2">
                              <input
                                value={typeof opt === 'string' ? opt : opt.label}
                                onChange={(e) => {
                                  const newOpts = [...(block.data?.options || [])];
                                  newOpts[i] = { label: e.target.value, value: e.target.value };
                                  updateBlockData(block.id, { options: newOpts });
                                }}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              />
                              <button
                                onClick={() => {
                                  const newOpts = (block.data?.options || []).filter((_, idx) => idx !== i);
                                  updateBlockData(block.id, { options: newOpts });
                                }}
                                className="px-2 text-red-500 hover:bg-red-50 rounded"
                              >✕</button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              updateBlockData(block.id, {
                                options: [...(block.data?.options || []), { label: 'New option', value: 'new_option' }],
                              });
                            }}
                            className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 text-sm hover:border-blue-400"
                          >
                            + Add option
                          </button>
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
                    </div>
                  )}

                  {/* DELAY - Enhanced with time units */}
                  {block.type === 'delay' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-blue-700 mb-2">
                          <span>⏱️</span>
                          <span className="text-sm font-medium">Delay Timer</span>
                        </div>
                        <p className="text-xs text-blue-600">
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
                                const res = await crm.fetch('/api/admin/crm/upload/s3/base64', {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    base64,
                                    fileName: file.name,
                                    category: 'chatbot-media'
                                  })
                                });
                                if (res?.data?.publicUrl) {
                                  updateBlockData(block.id, { mediaUrl: res.data.publicUrl });
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
          <div className="p-4 border-t border-gray-100 bg-gray-50">
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
