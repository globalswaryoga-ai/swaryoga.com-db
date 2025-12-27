'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { LoadingSpinner } from '@/components/admin/crm';

type Block = {
  id: string;
  type: 'message' | 'question' | 'condition' | 'action';
  x: number;
  y: number;
  label: string;
  data?: {
    message?: string;
    question?: string;
    options?: string[];
    condition?: string;
    action?: string;
  };
};

type Connection = {
  fromId: string;
  toId: string;
  label?: string;
};

const BLOCK_TYPES = [
  { id: 'message', name: 'Send a message', color: '#FF6B6B', icon: '💬' },
  { id: 'question', name: 'Ask a question', color: '#FFA500', icon: '❓' },
  { id: 'condition', name: 'Set a condition', color: '#6366F1', icon: '⚙️' },
  { id: 'action', name: 'Action', color: '#10B981', icon: '✓' },
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggingBlock, setDraggingBlock] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const blockColors: Record<string, string> = {
    message: '#FF6B6B',
    question: '#FFA500',
    condition: '#6366F1',
    action: '#10B981',
  };

  // Add block from sidebar
  const addBlock = (type: string) => {
    const newBlock: Block = {
      id: `block_${Date.now()}`,
      type: type as any,
      x: 100,
      y: 100,
      label: BLOCK_TYPES.find((b) => b.id === type)?.name || 'Block',
      data: {
        message: type === 'message' ? 'Enter message text...' : undefined,
        question: type === 'question' ? 'Enter question...' : undefined,
        options: type === 'question' ? ['Option 1', 'Option 2'] : undefined,
      },
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlock(newBlock.id);
  };

  // Canvas mouse down for dragging
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === canvasRef.current) {
      setSelectedBlock(null);
    }
  };

  // Drag block
  const handleBlockMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    blockId: string,
    isOutput?: boolean
  ) => {
    e.preventDefault();
    if (isOutput) {
      setDraggingFrom(blockId);
    } else {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        setDraggingBlock({
          id: blockId,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
        });
      }
      setSelectedBlock(blockId);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingBlock && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(0, e.clientX - canvasRect.left - draggingBlock.offsetX);
      const y = Math.max(0, e.clientY - canvasRect.top - draggingBlock.offsetY);

      setBlocks((prev) =>
        prev.map((b) => (b.id === draggingBlock.id ? { ...b, x, y } : b))
      );
    }
  };

  const handleMouseUp = () => {
    setDraggingBlock(null);
    if (draggingFrom) {
      setDraggingFrom(null);
    }
  };

  // Delete block
  const deleteBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setConnections((prev) =>
      prev.filter((c) => c.fromId !== blockId && c.toId !== blockId)
    );
    if (selectedBlock === blockId) setSelectedBlock(null);
  };

  const updateBlockData = (blockId: string, data: Partial<Block['data']>) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, data: { ...b.data, ...data } } : b
      )
    );
  };

  // Save chatbot
  const saveChatbot = async () => {
    if (!chatbotId) return;
    setSaving(true);
    try {
      await crm.fetch(`/api/admin/crm/chatbots/${chatbotId}`, {
        method: 'PUT',
        body: { blocks, connections },
      });
      alert('Chatbot saved!');
    } catch (err) {
      alert('Failed to save chatbot');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f5f5' }}>
      {/* LEFT SIDEBAR - Block Types */}
      <div
        style={{
          width: 280,
          background: '#fff',
          borderRight: '1px solid #e5e7eb',
          padding: 16,
          overflowY: 'auto',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#1f2937' }}>
          Block Types
        </h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {BLOCK_TYPES.map((blockType) => (
            <button
              key={blockType.id}
              onClick={() => addBlock(blockType.id)}
              style={{
                padding: '12px 14px',
                background: blockType.color,
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as any).style.opacity = '0.85';
                (e.currentTarget as any).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as any).style.opacity = '1';
                (e.currentTarget as any).style.transform = 'translateY(0)';
              }}
            >
              {blockType.icon} {blockType.name}
            </button>
          ))}
        </div>

        <h3
          style={{
            margin: '24px 0 16px 0',
            fontSize: 14,
            fontWeight: 700,
            color: '#1f2937',
          }}
        >
          Operations
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          {['Subscribe', 'Unsubscribe', 'Update Attr', 'Set Tags', 'Assign Team', 'Assign User'].map(
            (op) => (
              <button
                key={op}
                style={{
                  padding: '12px',
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#6b7280',
                  textAlign: 'center',
                }}
              >
                {op}
              </button>
            )
          )}
        </div>
      </div>

      {/* CENTER CANVAS - Flow Designer */}
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1,
          background: '#fafafa',
          position: 'relative',
          overflow: 'auto',
          userSelect: 'none',
        }}
      >
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {connections.map((conn) => {
            const fromBlock = blocks.find((b) => b.id === conn.fromId);
            const toBlock = blocks.find((b) => b.id === conn.toId);
            if (!fromBlock || !toBlock) return null;

            const x1 = fromBlock.x + 120;
            const y1 = fromBlock.y + 50;
            const x2 = toBlock.x;
            const y2 = toBlock.y + 50;

            return (
              <path
                key={`${conn.fromId}-${conn.toId}`}
                d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2} ${x2} ${y2}`}
                stroke="#cbd5e1"
                strokeWidth="2"
                fill="none"
              />
            );
          })}
        </svg>

        {blocks.map((block) => (
          <div
            key={block.id}
            onMouseDown={(e) => handleBlockMouseDown(e, block.id)}
            style={{
              position: 'absolute',
              left: block.x,
              top: block.y,
              width: 240,
              background: '#fff',
              border:
                selectedBlock === block.id
                  ? `3px solid ${blockColors[block.type]}`
                  : '1px solid #e5e7eb',
              borderRadius: 12,
              boxShadow: selectedBlock === block.id ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
              cursor: 'grab',
              transition: 'all 0.2s',
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
              {block.type === 'message' && (
                <div style={{ color: '#1f2937', fontSize: 12, lineHeight: 1.4 }}>
                  {block.data?.message || 'Message'}
                </div>
              )}
              {block.type === 'question' && (
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
                        ● {opt}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {block.type === 'condition' && (
                <div style={{ fontSize: 11, color: '#1f2937' }}>
                  Condition Logic
                </div>
              )}
            </div>

            {/* Output Port */}
            <div
              onMouseDown={(e) => handleBlockMouseDown(e, block.id, true)}
              style={{
                width: 20,
                height: 20,
                background: blockColors[block.type],
                borderRadius: '50%',
                border: '2px solid #fff',
                position: 'absolute',
                right: -10,
                bottom: -10,
                cursor: 'crosshair',
              }}
            />
          </div>
        ))}
      </div>

      {/* RIGHT SIDEBAR - Block Settings */}
      <div
        style={{
          width: 320,
          background: '#fff',
          borderLeft: '1px solid #e5e7eb',
          padding: 16,
          overflowY: 'auto',
        }}
      >
        {selectedBlock ? (
          (() => {
            const block = blocks.find((b) => b.id === selectedBlock);
            if (!block) return null;

            return (
              <>
                <h3
                  style={{
                    margin: '0 0 16px 0',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#1f2937',
                  }}
                >
                  {block.label}
                </h3>

                {block.type === 'message' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <label style={{ display: 'grid', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        Message
                      </span>
                      <textarea
                        value={block.data?.message || ''}
                        onChange={(e) =>
                          updateBlockData(block.id, { message: e.target.value })
                        }
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          border: '1px solid #e5e7eb',
                          fontSize: 12,
                          minHeight: 80,
                          fontFamily: 'inherit',
                        }}
                      />
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {['Message', 'Image', 'Video', 'Audio', 'Document'].map((type) => (
                        <button
                          key={type}
                          style={{
                            padding: '8px',
                            background: '#f0fdf4',
                            border: '1px solid #86efac',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#10b981',
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {block.type === 'question' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <label style={{ display: 'grid', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        Question
                      </span>
                      <textarea
                        value={block.data?.question || ''}
                        onChange={(e) =>
                          updateBlockData(block.id, { question: e.target.value })
                        }
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          border: '1px solid #e5e7eb',
                          fontSize: 12,
                          minHeight: 60,
                          fontFamily: 'inherit',
                        }}
                      />
                    </label>

                    <label style={{ display: 'grid', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        Options
                      </span>
                      {(block.data?.options || []).map((opt, i) => (
                        <input
                          key={i}
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...(block.data?.options || [])];
                            newOpts[i] = e.target.value;
                            updateBlockData(block.id, { options: newOpts });
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 6,
                            border: '1px solid #e5e7eb',
                            fontSize: 12,
                          }}
                        />
                      ))}
                      <button
                        onClick={() => {
                          updateBlockData(block.id, {
                            options: [...(block.data?.options || []), 'New option'],
                          });
                        }}
                        style={{
                          padding: '8px',
                          background: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        + Add option
                      </button>
                    </label>
                  </div>
                )}

                {block.type === 'condition' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <label style={{ display: 'grid', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        Condition
                      </span>
                      <select
                        style={{
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #e5e7eb',
                          fontSize: 12,
                        }}
                      >
                        <option>If equals</option>
                        <option>If contains</option>
                        <option>If greater than</option>
                        <option>If less than</option>
                      </select>
                    </label>
                  </div>
                )}
              </>
            );
          })()
        ) : (
          <div style={{ color: '#6b7280', fontSize: 12 }}>Select a block to edit</div>
        )}

        {/* Bottom Action */}
        {blocks.length > 0 && (
          <button
            onClick={saveChatbot}
            disabled={saving}
            style={{
              width: '100%',
              marginTop: 24,
              padding: '10px',
              background: '#1f7a5b',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save Chatbot'}
          </button>
        )}
      </div>
    </div>
  );
}
