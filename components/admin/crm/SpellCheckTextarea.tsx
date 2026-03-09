'use client';

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';

interface SpellError {
  word: string;
  start: number;
  end: number;
  suggestions: string[];
}

interface SpellCheckTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  token?: string;
}

export default function SpellCheckTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder = 'Type your message...',
  className = '',
  disabled = false,
  token,
}: SpellCheckTextareaProps) {
  const [errors, setErrors] = useState<SpellError[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; error: SpellError } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check spelling with debounce
  const checkSpelling = useCallback(async (text: string) => {
    if (!text.trim() || !token) {
      setErrors([]);
      return;
    }

    try {
      const res = await fetch('/api/admin/crm/spell-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.errors) {
          setErrors(data.errors);
        }
      }
    } catch (err) {
      console.debug('Spell check failed:', err);
    }
  }, [token]);

  // Debounced spell check on text change
  useEffect(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(() => {
      checkSpelling(value);
    }, 600);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [value, checkSpelling]);

  // Sync scroll
  const handleScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Handle right-click
  const handleContextMenu = (e: React.MouseEvent) => {
    if (!errors.length) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    // Get selection or cursor position
    const cursorPos = textarea.selectionStart;
    
    // Find if cursor is on an error word
    for (const error of errors) {
      if (cursorPos >= error.start && cursorPos <= error.end) {
        e.preventDefault();
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          error,
        });
        return;
      }
    }
  };

  // Apply suggestion
  const applySuggestion = (suggestion: string) => {
    if (!contextMenu) return;
    
    const { error } = contextMenu;
    const newText = value.substring(0, error.start) + suggestion + value.substring(error.end);
    onChange(newText);
    setContextMenu(null);
    
    // Update errors - remove the fixed one
    setErrors(prev => prev.filter(e => e.start !== error.start));
    
    // Re-check after a delay
    setTimeout(() => checkSpelling(newText), 300);
  };

  // Close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Generate highlighted HTML
  const renderHighlights = (): ReactNode[] => {
    if (!errors.length || !value) return [value];

    const parts: ReactNode[] = [];
    let lastIndex = 0;
    const sortedErrors = [...errors].sort((a, b) => a.start - b.start);

    sortedErrors.forEach((error, idx) => {
      // Text before error (transparent, just for spacing)
      if (error.start > lastIndex) {
        parts.push(
          <span key={`t-${idx}`} className="text-transparent">
            {value.substring(lastIndex, error.start)}
          </span>
        );
      }

      // Error word with red underline
      parts.push(
        <mark
          key={`e-${idx}`}
          className="bg-transparent text-transparent relative"
          style={{
            textDecoration: 'underline wavy',
            textDecorationColor: '#ef4444',
            textUnderlineOffset: '3px',
          }}
        >
          {error.word}
        </mark>
      );

      lastIndex = error.end;
    });

    // Remaining text
    if (lastIndex < value.length) {
      parts.push(
        <span key="t-end" className="text-transparent">
          {value.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <div className="relative w-full">
      {/* Highlight layer (behind textarea) */}
      <div
        ref={highlightRef}
        className="absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
        style={{
          padding: '12px 20px',
          fontSize: '15px',
          fontFamily: 'inherit',
          fontWeight: 500,
          lineHeight: '1.5',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          letterSpacing: 'inherit',
          color: 'transparent',
          caretColor: 'transparent',
        }}
        aria-hidden="true"
      >
        {renderHighlights()}
      </div>

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={handleScroll}
        onContextMenu={handleContextMenu}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        className={`relative w-full bg-transparent resize-none ${className}`}
        style={{
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        }}
        rows={1}
      />

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-[100] bg-white rounded-xl shadow-xl border border-slate-200 py-2 min-w-[200px] max-w-[300px] animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 220),
            top: Math.min(contextMenu.y, window.innerHeight - 300),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Spelling
            </div>
            <div className="text-sm font-semibold text-red-600 mt-0.5 flex items-center gap-1.5">
              <span className="line-through opacity-70">{contextMenu.error.word}</span>
              <i className="ph-bold ph-arrow-right text-xs text-slate-400"></i>
            </div>
          </div>

          {/* Suggestions */}
          <div className="py-1">
            {contextMenu.error.suggestions.length > 0 ? (
              contextMenu.error.suggestions.slice(0, 5).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => applySuggestion(suggestion)}
                  className="w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors"
                >
                  <i className="ph-bold ph-check-circle text-emerald-500 text-base"></i>
                  {suggestion}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-slate-400 italic">
                No suggestions
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-slate-100 pt-1">
            <button
              onClick={() => {
                setErrors(prev => prev.filter(e => e.start !== contextMenu.error.start));
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left text-xs font-medium text-slate-500 hover:bg-slate-50 flex items-center gap-2"
            >
              <i className="ph-bold ph-eye-slash"></i>
              Ignore
            </button>
          </div>
        </div>
      )}

      {/* Error count badge */}
      {errors.length > 0 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-red-100 text-red-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">
            {errors.length}
          </div>
        </div>
      )}
    </div>
  );
}
