'use client';

/**
 * Bulk-send dialog for the Messenger and Instagram inboxes.
 *
 * Pick a saved template (or type free text) and send it to every selected
 * conversation in one shot. If the template has an IMAGE header, the image is
 * sent as an attachment first and the body text follows — Messenger and
 * Instagram cannot carry both in a single message.
 *
 * Meta's standard reply window is 24 hours since the contact last messaged;
 * sendMetaSocialMessage automatically retries a blocked send with the
 * HUMAN_AGENT tag (7-day window) before giving up, so most sends succeed
 * without the sender needing to think about the window at all. Some
 * recipients can still fail while others succeed — the result panel reports
 * each one individually.
 */

import { useEffect, useMemo, useState } from 'react';
import { LoadingSpinner } from '@/components/admin/crm';

type TemplateRow = {
  _id: string;
  templateName?: string;
  templateContent?: string;
  headerFormat?: 'NONE' | 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  headerContent?: string;
  footerText?: string;
  language?: string;
};

export type BulkSendResult = {
  sent: number;
  failed: number;
  total: number;
  withImage?: boolean;
  results?: Array<{ conversationId: string; ok: boolean; error?: string }>;
};

interface Props {
  open: boolean;
  onClose: () => void;
  platform: 'messenger' | 'instagram';
  conversationIds: string[];
  token: string | null;
  accentColor: string;
  accentGradient: string;
  /** Called after a send completes so the parent can refresh + clear selection. */
  onSent?: (result: BulkSendResult) => void;
}

function templateBody(t: TemplateRow): string {
  const header = t.headerFormat === 'TEXT' ? t.headerContent : '';
  return [header, t.templateContent, t.footerText]
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join('\n\n');
}

function templateImage(t: TemplateRow): string {
  return t.headerFormat === 'IMAGE' ? String(t.headerContent || '').trim() : '';
}

export default function SocialBulkSendModal({
  open,
  onClose,
  platform,
  conversationIds,
  token,
  accentColor,
  accentGradient,
  onSent,
}: Props) {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [freeText, setFreeText] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BulkSendResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t._id === selectedId) || null,
    [templates, selectedId],
  );

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setSendError(null);
    if (templates.length > 0 || loading) return;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch('/api/admin/crm/templates?limit=100', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load templates');
        const rows: TemplateRow[] = Array.isArray(data.templates) ? data.templates : [];
        setTemplates(rows.filter((t) => templateBody(t) || templateImage(t)));
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, token, templates.length, loading]);

  if (!open) return null;

  const previewText = selectedTemplate ? templateBody(selectedTemplate) : freeText;
  const previewImage = selectedTemplate ? templateImage(selectedTemplate) : '';
  const canSend = Boolean((previewText.trim() || previewImage) && conversationIds.length > 0 && !sending);

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setSendError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/crm/social-inbox/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          platform,
          conversationIds,
          ...(selectedTemplate ? { templateId: selectedTemplate._id } : { messageContent: freeText }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Bulk send failed');
      const payload: BulkSendResult = data.data || data;
      setResult(payload);
      onSent?.(payload);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Bulk send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between text-white" style={{ background: accentGradient }}>
          <div>
            <h3 className="text-base font-extrabold">Send to {conversationIds.length} selected</h3>
            <p className="text-[11px] opacity-90 capitalize">{platform} · bulk message</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors" title="Close">
            <i className="ph-bold ph-x text-lg"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Result panel */}
          {result && (
            <div className="rounded-xl border p-3" style={{ borderColor: result.failed ? '#fca5a5' : '#86efac', background: result.failed ? '#fef2f2' : '#f0fdf4' }}>
              <div className="text-sm font-bold text-slate-800">
                ✅ Sent {result.sent} / {result.total}
                {result.failed > 0 && <span className="text-red-600"> · {result.failed} failed</span>}
              </div>
              {result.withImage && <div className="text-[11px] text-slate-500 mt-0.5">Image sent as attachment before the text.</div>}
              {result.failed > 0 && (
                <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {(result.results || []).filter((r) => !r.ok).map((r) => (
                    <li key={r.conversationId} className="text-[11px] text-red-600 leading-snug">• {r.error}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[10px] text-slate-500 leading-snug">
                Each send automatically retries with an extended reply window if the standard one has passed.
                Remaining failures are usually chats old enough to need Meta&apos;s "Human Agent" approval (pending
                App Review) or contacts who never messaged first.
              </p>
            </div>
          )}

          {sendError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{sendError}</div>
          )}

          {/* Template picker */}
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Choose a template</div>
            {loading && (
              <div className="flex items-center gap-2 py-3 text-xs text-slate-500">
                <LoadingSpinner size="sm" /> Loading templates…
              </div>
            )}
            {loadError && <div className="text-xs text-red-600 py-2">{loadError}</div>}
            {!loading && !loadError && templates.length === 0 && (
              <div className="text-xs text-slate-400 py-2">No templates found.</div>
            )}
            <div className="grid gap-2 max-h-52 overflow-y-auto">
              {templates.map((t) => {
                const img = templateImage(t);
                const active = t._id === selectedId;
                return (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => { setSelectedId(active ? '' : t._id); setResult(null); }}
                    className="w-full text-left rounded-xl border p-2.5 transition-all flex gap-3 items-start"
                    style={{
                      borderColor: active ? accentColor : '#e2e8f0',
                      background: active ? `${accentColor}0F` : '#fff',
                    }}
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-11 w-11 rounded-lg object-cover shrink-0 bg-slate-100" />
                    ) : (
                      <div className="h-11 w-11 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <i className="ph ph-note text-slate-400"></i>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-slate-700 truncate">{t.templateName || 'Untitled'}</span>
                        {img && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${accentColor}1A`, color: accentColor }}>
                            image
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-2">{templateBody(t) || '(image only)'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Free text fallback */}
          {!selectedTemplate && (
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                …or type a message
              </div>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                rows={4}
                placeholder="Type the message to send to everyone selected…"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-slate-400 resize-none"
              />
            </div>
          )}

          {/* Preview */}
          {(previewText || previewImage) && (
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Preview</div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                {previewImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewImage} alt="" className="max-h-40 rounded-lg object-contain bg-white" />
                )}
                {previewText && (
                  <div className="text-[13px] text-slate-700 whitespace-pre-wrap leading-snug">{previewText}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            {conversationIds.length} recipient{conversationIds.length === 1 ? '' : 's'}
            {previewImage ? ' · image + text' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
              Close
            </button>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-40 flex items-center gap-2"
              style={{ background: accentGradient }}
            >
              {sending ? <LoadingSpinner size="sm" /> : <i className="ph-bold ph-paper-plane-right"></i>}
              {sending ? 'Sending…' : `Send to ${conversationIds.length}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
