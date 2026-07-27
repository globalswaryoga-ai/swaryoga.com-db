'use client';

/**
 * Shared message composer for the Messenger and Instagram inboxes.
 *
 * Mirrors the WhatsApp (Meta) composer's layout and tooling so all three
 * inboxes behave the same way: a ⚡ Actions menu on the left, a toolbar above
 * the input (Auto-correct toggle, Fix, AI reply, translate), and the Send
 * button on the right.
 *
 * Template inserts a saved template's rendered text into the composer, which is
 * then sent as a normal message. Meta-approved WhatsApp templates cannot be
 * *sent as templates* on Messenger/Instagram — that API is WhatsApp-only — but
 * reusing the wording is both allowed and useful inside the 24-hour window.
 *
 * Schedule / Delay / Repeat / Chatbot-flow are intentionally absent: they run
 * on backends that target a phone number (targetPhone / targetLeadIds / a Lead
 * record), and Messenger/Instagram participants have no phone number.
 */

import { useEffect, useRef, useState } from 'react';
import { LoadingSpinner } from '@/components/admin/crm';
import LanguageSelector from '@/app/admin/crm/meta/_components/LanguageSelector';

export type QuickReply = { label: string; text: string };

type TemplateRow = {
  _id: string;
  templateName?: string;
  templateContent?: string;
  headerContent?: string;
  footerText?: string;
  language?: string;
  category?: string;
};

/** Flatten a stored template into the plain text we drop into the composer. */
function renderTemplateText(t: TemplateRow): string {
  return [t.headerContent, t.templateContent, t.footerText]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join('\n\n');
}

type Accent = {
  /** Main brand colour, e.g. '#0078FF' for Messenger. */
  color: string;
  /** Soft background used for hover/active chips. */
  soft: string;
  /** Border colour for the input shell. */
  border: string;
  /** Send-button background (may be a gradient). */
  sendBg: string;
  /** Send-button shadow. */
  sendShadow: string;
};

interface SocialComposerProps {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  /** Admin JWT for the AI/translate endpoints. */
  token: string | null;
  /** Last inbound message text — gives the AI reply useful context. */
  replyContext?: string;
  quickReplies?: QuickReply[];
  accent: Accent;
  disabled?: boolean;
  placeholder?: string;
}

export default function SocialComposer({
  value,
  onChange,
  onSend,
  token,
  replyContext = '',
  quickReplies = [],
  accent,
  disabled = false,
  placeholder = 'Type a message...',
}: SocialComposerProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [autoCorrectEnabled, setAutoCorrectEnabled] = useState(true);
  const [isFixing, setIsFixing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the popovers when clicking outside the composer.
  useEffect(() => {
    if (!actionsOpen && !quickOpen && !templateOpen && !unavailable) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
        setQuickOpen(false);
        setTemplateOpen(false);
        setUnavailable(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [actionsOpen, quickOpen, templateOpen, unavailable]);

  const showUnavailable = (feature: string) => {
    setActionsOpen(false);
    setQuickOpen(false);
    setTemplateOpen(false);
    setUnavailable(feature);
  };

  const openTemplates = async () => {
    setActionsOpen(false);
    setQuickOpen(false);
    setTemplateOpen(true);
    if (templates.length > 0 || templatesLoading) return;
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const res = await fetch('/api/admin/crm/templates?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load templates');
      const rows: TemplateRow[] = Array.isArray(data.templates) ? data.templates : [];
      setTemplates(rows.filter((t) => renderTemplateText(t)));
    } catch (err) {
      setTemplatesError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const callAiAssist = async (body: Record<string, unknown>): Promise<string | null> => {
    const res = await fetch('/api/admin/crm/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return data?.success && data?.result ? String(data.result) : null;
  };

  const handleFix = async () => {
    if (!value.trim() || isFixing) return;
    setIsFixing(true);
    try {
      const fixed = await callAiAssist({ text: value, mode: 'fix' });
      if (fixed) onChange(fixed);
    } catch (err) {
      console.error('AI Fix failed:', err);
    } finally {
      setIsFixing(false);
    }
  };

  const handleAiReply = async () => {
    if (isReplying) return;
    setIsReplying(true);
    try {
      const reply = await callAiAssist({ mode: 'reply', context: replyContext });
      if (reply) onChange(reply);
    } catch (err) {
      console.error('AI Reply failed:', err);
    } finally {
      setIsReplying(false);
    }
  };

  const handleTranslate = async (text: string, targetLang: string) => {
    const res = await fetch('/api/cloud-translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text, targetLang }),
    });
    if (!res.ok) throw new Error('Translation failed');
    const data = await res.json();
    return data.translatedText;
  };

  const applyQuickReply = (text: string) => {
    onChange(text);
    setQuickOpen(false);
    setActionsOpen(false);
  };

  return (
    <div ref={wrapRef} className="flex items-end gap-2 max-w-6xl mx-auto">
      {/* ⚡ Actions */}
      <div className="relative self-end">
        <button
          type="button"
          onClick={() => { setActionsOpen((o) => !o); setQuickOpen(false); }}
          title="Quick actions"
          className="h-9 w-9 flex items-center justify-center rounded-lg text-white transition-all active:scale-95 hover:shadow-lg"
          style={{ background: accent.sendBg, boxShadow: accent.sendShadow }}
        >
          <i className="ph-bold ph-lightning text-[16px]"></i>
        </button>

        {actionsOpen && (
          <div
            className="absolute bottom-full mb-3 left-0 backdrop-blur-xl rounded-2xl flex-col p-2 min-w-[240px] z-50"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,255,0.95) 100%)',
              border: `1px solid ${accent.border}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div className="px-2 py-1.5 flex items-center justify-between">
              <div className="text-xs font-extrabold tracking-widest uppercase text-slate-400">Actions</div>
              <button
                type="button"
                onClick={() => setActionsOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50"
                title="Close"
              >
                <i className="ph ph-x"></i>
              </button>
            </div>

            <div className="space-y-1 px-1 pb-1">
              <button
                type="button"
                onClick={() => { setQuickOpen(true); setActionsOpen(false); }}
                className="w-full px-3 py-2 text-sm text-left text-slate-700 rounded-xl flex items-center gap-3 transition-colors hover:bg-slate-50"
                style={{ color: undefined }}
              >
                <i className="ph ph-lightning text-lg" style={{ color: accent.color }}></i>
                Quick message
              </button>
              <button
                type="button"
                onClick={() => showUnavailable('Schedule message')}
                className="w-full px-3 py-2 text-sm text-left text-slate-700 rounded-xl flex items-center gap-3 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
              >
                <i className="ph ph-calendar-plus text-lg"></i>
                Schedule message
              </button>
              <button
                type="button"
                onClick={openTemplates}
                className="w-full px-3 py-2 text-sm text-left text-slate-700 rounded-xl flex items-center gap-3 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
              >
                <i className="ph ph-note text-lg"></i>
                Template
              </button>
              <button
                type="button"
                onClick={() => showUnavailable('Delay message')}
                className="w-full px-3 py-2 text-sm text-left text-slate-700 rounded-xl flex items-center gap-3 transition-colors hover:bg-amber-50 hover:text-amber-700"
              >
                <i className="ph ph-timer text-lg"></i>
                Delay message
              </button>
              <button
                type="button"
                onClick={() => showUnavailable('Repeat mode')}
                className="w-full px-3 py-2 text-sm text-left text-slate-700 rounded-xl flex items-center gap-3 transition-colors hover:bg-violet-50 hover:text-violet-700"
              >
                <i className="ph ph-repeat text-lg"></i>
                Repeat mode
              </button>
              <button
                type="button"
                onClick={() => showUnavailable('Chatbot flow')}
                className="w-full px-3 py-2 text-sm text-left text-slate-700 rounded-xl flex items-center gap-3 transition-colors hover:bg-cyan-50 hover:text-cyan-700"
              >
                <i className="ph ph-robot text-lg"></i>
                Chatbot flow
              </button>
            </div>
          </div>
        )}

        {/* Not-yet-available notice for the phone-keyed WhatsApp actions */}
        {unavailable && (
          <div
            className="absolute bottom-full mb-3 left-0 backdrop-blur-xl rounded-2xl p-3 w-[320px] z-50"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,251,240,0.95) 100%)',
              border: '1px solid rgba(245,158,11,0.35)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <i className="ph-fill ph-info text-amber-500 text-base mt-0.5"></i>
                <div>
                  <div className="text-[13px] font-bold text-slate-700">{unavailable}</div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">
                    Not available for Messenger/Instagram yet. This runs on the WhatsApp scheduling
                    engine, which targets a <b>phone number</b> — and Messenger/Instagram contacts
                    don&apos;t have one. It needs a backend change to target a conversation instead.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnavailable(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 shrink-0"
                title="Close"
              >
                <i className="ph ph-x"></i>
              </button>
            </div>
          </div>
        )}

        {/* Template picker */}
        {templateOpen && (
          <div
            className="absolute bottom-full mb-3 left-0 backdrop-blur-xl rounded-2xl p-2 w-[340px] max-h-[360px] overflow-y-auto z-50"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,255,0.95) 100%)',
              border: `1px solid ${accent.border}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div className="px-2 py-1.5 flex items-center justify-between">
              <div className="text-xs font-extrabold tracking-widest uppercase text-slate-400">Template</div>
              <button
                type="button"
                onClick={() => setTemplateOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50"
                title="Close"
              >
                <i className="ph ph-x"></i>
              </button>
            </div>

            <p className="px-3 pb-2 text-[10px] leading-snug text-slate-400">
              Inserts the template text into your message. Sent as a normal message — Meta template
              sending is WhatsApp-only.
            </p>

            {templatesLoading && (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500">
                <LoadingSpinner size="sm" /> Loading templates…
              </div>
            )}
            {templatesError && (
              <div className="px-3 py-2 text-xs text-red-600">{templatesError}</div>
            )}
            {!templatesLoading && !templatesError && templates.length === 0 && (
              <div className="px-3 py-3 text-xs text-slate-400">No templates found.</div>
            )}

            <div className="space-y-1 px-1 pb-1">
              {templates.map((t) => (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => {
                    onChange(renderTemplateText(t));
                    setTemplateOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl transition-colors hover:bg-indigo-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-700 truncate">
                      {t.templateName || 'Untitled'}
                    </span>
                    {t.language && (
                      <span className="text-[9px] font-bold uppercase text-slate-400 shrink-0">{t.language}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-2">{renderTemplateText(t)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick replies list */}
        {quickOpen && quickReplies.length > 0 && (
          <div
            className="absolute bottom-full mb-3 left-0 backdrop-blur-xl rounded-2xl p-2 w-[300px] max-h-[320px] overflow-y-auto z-50"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,255,0.95) 100%)',
              border: `1px solid ${accent.border}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div className="px-2 py-1.5 flex items-center justify-between sticky top-0">
              <div className="text-xs font-extrabold tracking-widest uppercase text-slate-400">Quick message</div>
              <button
                type="button"
                onClick={() => setQuickOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50"
                title="Close"
              >
                <i className="ph ph-x"></i>
              </button>
            </div>
            <div className="space-y-1 px-1 pb-1">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyQuickReply(reply.text)}
                  className="w-full px-3 py-2 text-left rounded-xl transition-colors hover:bg-slate-50"
                >
                  <div className="text-[13px] font-bold text-slate-700">{reply.label}</div>
                  <div className="text-[11px] text-slate-400 truncate">{reply.text}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input + toolbar */}
      <div
        className="flex-1 rounded-lg bg-white/80 backdrop-blur-sm transition-all relative"
        style={{ border: `1px solid ${accent.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
      >
        <div className="flex items-center gap-1 px-2 pt-1.5 border-b" style={{ borderColor: accent.border }}>
          <button
            type="button"
            onClick={() => setAutoCorrectEnabled((v) => !v)}
            className={`h-6 px-1.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
              autoCorrectEnabled ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100'
            }`}
            title={autoCorrectEnabled ? 'Auto-correct ON' : 'Auto-correct OFF'}
          >
            <i className={`ph-fill ${autoCorrectEnabled ? 'ph-check-circle' : 'ph-circle'} text-xs`}></i>
            <span className="hidden xl:inline">Auto</span>
          </button>

          <button
            type="button"
            onClick={handleFix}
            disabled={isFixing || !value.trim()}
            className={`h-6 px-1.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 disabled:opacity-40 ${
              isFixing ? 'bg-violet-100 text-violet-700' : 'text-violet-600 hover:bg-violet-50'
            }`}
            title="Fix spelling"
          >
            {isFixing ? <LoadingSpinner size="sm" /> : <i className="ph-fill ph-magic-wand text-xs"></i>}
            <span className="hidden xl:inline">Fix</span>
          </button>

          <button
            type="button"
            onClick={handleAiReply}
            disabled={isReplying}
            className={`h-6 px-1.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 disabled:opacity-40 ${
              isReplying ? 'bg-fuchsia-100 text-fuchsia-700' : 'text-fuchsia-600 hover:bg-fuchsia-50'
            }`}
            title="AI suggest reply"
          >
            {isReplying ? <LoadingSpinner size="sm" /> : <i className="ph-fill ph-sparkle text-xs"></i>}
            <span className="hidden xl:inline">AI</span>
          </button>

          <LanguageSelector
            currentText={value}
            onTextTranslated={(t) => onChange(t)}
            onTranslate={handleTranslate}
          />
        </div>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={autoCorrectEnabled ? `${placeholder} (Auto ON)` : placeholder}
          rows={1}
          disabled={disabled}
          className="w-full px-3 py-2 border-none focus:ring-0 max-h-28 min-h-[36px] placeholder:text-slate-400 font-medium text-slate-700 text-[13px] resize-none bg-transparent outline-none"
        />
      </div>

      <button
        type="button"
        onClick={onSend}
        disabled={!value.trim() || disabled}
        className="text-white h-8 px-4 rounded-lg font-bold text-xs transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5 self-end hover:shadow-lg hover:scale-105"
        style={{ background: accent.sendBg, boxShadow: accent.sendShadow }}
      >
        <i className="ph-bold ph-paper-plane-right text-sm"></i>
        <span className="hidden xl:inline">Send</span>
      </button>
    </div>
  );
}
