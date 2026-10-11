'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Save, Sparkles, FileCheck, Palette, Image as ImageIcon, Video } from 'lucide-react';
import { offerAutosave, offerFetch, offerJson, offerStorage } from '@/lib/workshopOfferClient';
import { useOfferRecords } from '@/hooks/useOfferRecords';
import { useOfferAutosave } from '@/hooks/useOfferAutosave';
import type { OfferDesign } from '@/lib/workshopOfferDesign';

type Lead = { id: string; name?: string; mobile?: string; phoneNumber?: string; email?: string; leadId?: string };
type StudioDesign = OfferDesign & { generationStatus?: string; generationError?: string; predictionId?: string };

function defaultDesign(): OfferDesign {
  return { id: crypto.randomUUID(), kind: 'ad', title: 'Swar Yoga Creative', headline: 'Discover your inner balance', subtitle: 'Swar Yoga\nA mindful practice for everyday life', footer: 'Learn more · Contact Swar Yoga', accent: '#c8a35e', background: '#152b2a', textColor: '#ffffff', fontFamily: 'sans', width: 1080, height: 1080, status: 'draft' };
}

export function OfferStudio({ leads }: { leads: Lead[] }) {
  const store = useOfferRecords();
  const [design, setDesign] = useState<StudioDesign | null>(null);
  const [saved, setSaved] = useState<StudioDesign[]>([]);
  const [drafts, setDrafts] = useState<Record<string, StudioDesign>>(() => {
    try { return JSON.parse(offerStorage.getItem('crm_offer_studio_drafts') || '{}'); } catch { return {}; }
  });
  const draftStatus = useOfferAutosave({ crm_offer_studio_drafts: drafts }, offerAutosave.status().loaded);
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('English');
  const [media, setMedia] = useState('copy');
  const [format, setFormat] = useState('square');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState(false);
  const [canvaConnected, setCanvaConnected] = useState(false);
  const [canvaId, setCanvaId] = useState('');
  const [templates, setTemplates] = useState<Array<{ _id: string; templateName: string }>>([]);
  const [templateId, setTemplateId] = useState('');
  const [deliveryApproved, setDeliveryApproved] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderGeneration = useRef(0);
  const [renderedId, setRenderedId] = useState('');

  const refresh = async () => {
    const response = await offerJson<{ data: StudioDesign[] }>('designs');
    setSaved(response.data.filter(row => ['ad', 'receipt', 'certificate'].includes(row.kind)));
    setDesign(previous => response.data.find(row => row.id === previous?.id && row.status === 'final') || previous);
  };
  useEffect(() => {
    setDesign(Object.values(drafts).find(row => row.status === 'draft') || defaultDesign());
    void refresh().catch(error => setError(String(error.message)));
    void offerJson<{ data: typeof templates }>('delivery').then(response => setTemplates(response.data)).catch(error => setError(String(error.message)));
    void offerJson<{ connected: boolean }>('canva').then(result => setCanvaConnected(result.connected)).catch(error => setError(String(error.message)));
  }, []);

  useEffect(() => {
    if (!design?.predictionId || ['succeeded', 'failed', 'canceled'].includes(design.generationStatus || '')) return;
    let canceled = false;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = Date.now() + 10 * 60_000;
    const poll = async () => {
      try {
        const result = await offerJson<{ data: StudioDesign }>(`creative?id=${encodeURIComponent(design.id)}`);
        if (canceled) return;
        if (['succeeded', 'failed', 'canceled'].includes(result.data.generationStatus || '')) {
          setDesign(previous => previous?.id === result.data.id ? { ...previous, imageUrl: result.data.imageUrl, videoUrl: result.data.videoUrl, generationStatus: result.data.generationStatus, generationError: result.data.generationError } : previous);
          if (result.data.generationError) setError(result.data.generationError);
          void refresh().catch(error => setError(String(error.message)));
          return;
        }
        if (Date.now() > deadline) { setError('Generation is still processing. Your job is saved; reopen this draft to check later.'); return; }
        timer = setTimeout(poll, 5000);
      } catch (error) { if (!canceled) setError(error instanceof Error ? error.message : 'Generation check failed. Reopen the saved job to retry.'); }
    };
    timer = setTimeout(poll, 3000);
    return () => { canceled = true; clearTimeout(timer); };
  }, [design?.id, design?.predictionId, design?.generationStatus]);

  useEffect(() => {
    if (!design || !canvas.current) return;
    const generation = ++renderGeneration.current;
    setRenderedId('');
    const draw = async () => {
      await document.fonts.ready;
      if (generation !== renderGeneration.current) return;
      const element = canvas.current!;
      const context = element.getContext('2d');
      if (!context) throw new Error('Canvas rendering is unavailable in this browser');
      element.width = design.width; element.height = design.height;
      context.fillStyle = design.background; context.fillRect(0, 0, design.width, design.height);
      if (design.imageUrl) {
        const response = await offerFetch(`/api/admin/crm/media/proxy?url=${encodeURIComponent(design.imageUrl)}`);
        if (!response.ok) throw new Error('Saved background could not be loaded');
        const image = await createImageBitmap(await response.blob());
        if (generation !== renderGeneration.current) { image.close(); return; }
        const scale = Math.max(design.width / image.width, design.height / image.height);
        context.drawImage(image, (design.width - image.width * scale) / 2, (design.height - image.height * scale) / 2, image.width * scale, image.height * scale);
        image.close();
        context.fillStyle = 'rgba(0,0,0,0.52)'; context.fillRect(0, 0, design.width, design.height);
      }
      const padding = design.width * 0.075;
      context.strokeStyle = design.accent; context.lineWidth = 3;
      context.strokeRect(padding / 2, padding / 2, design.width - padding, design.height - padding);
      const font = design.fontFamily === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif';
      const text = (value: string, size: number, y: number, color: string, bold = false) => {
        context.font = `${bold ? 'bold ' : ''}${size}px ${font}`;
        context.fillStyle = color;
        let currentY = y;
        for (const paragraph of value.split('\n')) {
          let line = '';
          for (const word of paragraph.split(/\s+/)) {
            if (context.measureText(`${line} ${word}`).width > design.width - padding * 2 && line) {
              context.fillText(line, padding, currentY); currentY += size * 1.4; line = word;
            } else line = line ? `${line} ${word}` : word;
          }
          context.fillText(line, padding, currentY); currentY += size * 1.4;
        }
        return currentY;
      };
      text('SWAR YOGA', design.width * 0.026, padding * 1.4, design.accent, true);
      const end = text(design.headline, design.width * 0.059, design.height * 0.29, design.textColor, true);
      text(design.subtitle, design.width * 0.029, end + design.height * 0.06, design.textColor);
      text(design.footer, design.width * 0.023, design.height * 0.86, design.accent);
      if (design.documentNumber) text(design.documentNumber, design.width * 0.016, design.height * 0.95, design.textColor);
      if (generation === renderGeneration.current) setRenderedId(design.id);
    };
    void draw().catch(error => setError(error instanceof Error ? error.message : 'Preview could not be rendered'));
  }, [design]);

  const act = async (operation: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Action failed'); }
    finally { setBusy(false); }
  };
  const update = (patch: Partial<OfferDesign>) => {
    if (!design || design.status === 'final') return;
    const updated = { ...design, ...patch };
    setDesign(updated);
    setDrafts(previous => ({ ...previous, [updated.id]: updated }));
  };
  const makeDocument = (lead: Lead, kind: 'receipt' | 'certificate') => {
    const record = store.records[lead.id];
    setApproved(false);
    setDesign({ ...defaultDesign(), id: `${kind}-${lead.id.replace(/[^\w-]/g, '_')}`, kind, leadId: lead.id, title: `${kind} · ${lead.name || lead.id}`,
      headline: kind === 'receipt' ? 'Payment Receipt' : 'Certificate of Participation',
      subtitle: kind === 'receipt'
        ? `${lead.name || 'Participant'}\nAmount received: INR ${record.amount}\nDate: ${record.date}\nPayment mode: ${record.paymentMode}\n${record.workshopName || 'Swar Yoga Workshop'}`
        : `Presented to ${lead.name || 'Participant'}\n${record.workshopName || 'Swar Yoga Workshop'}\nRecognizing participation in the workshop`,
      footer: 'Issued by Swar Yoga · Admin verified', width: 1600, height: 1100, background: '#fffaf1', textColor: '#152b2a' });
  };
  const finalized = design?.status === 'final';
  useEffect(() => { setDeliveryApproved(false); }, [design?.id]);
  const paid = leads.filter(lead => store.records[lead.id]?.status === 'received' && store.records[lead.id]?.pushedToCreateReceipts);

  return <div className="p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold text-slate-900">Creative & Document Studio</h2><p className="text-sm text-slate-500">Edit here, save in Bunny, then review before delivery. Canva connection is optional.</p></div>
      <button className="border rounded-lg px-4 py-2" disabled={busy} onClick={() => void act(async () => {
        const response = await offerJson<{ url: string }>('canva', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'connect' }) });
        window.location.assign(response.url);
      })}>{canvaConnected ? 'Reconnect Canva' : 'Connect Canva'}</button>
    </div>
    {(error || store.error || draftStatus.error) && <div role="alert" className="rounded-lg bg-red-50 text-red-700 p-3">{error || store.error || draftStatus.error}
      {draftStatus.error && <button className="ml-3 underline" onClick={() => { void draftStatus.retry().catch(error => setError(error.message)); }}>Retry draft save</button>}
    </div>}
    <p role="status" className="text-xs text-slate-500">{draftStatus.saving || draftStatus.pending ? 'Saving editable design draft…' : 'Edits save automatically as drafts. Finalize PDF and send remain explicit.'}</p>
    {notice && <div role="status" className="rounded-lg bg-emerald-50 text-emerald-800 p-3">{notice}</div>}
    <div className="rounded-xl border bg-white p-4">
      <h3 className="font-semibold mb-3">Confirmed payments ready for documents</h3>
      {!paid.length && <p className="text-sm text-slate-500">Confirm payments in Offer Details, then queue them from Amount Received.</p>}
      <div className="flex flex-wrap gap-2">{paid.map(lead => <div key={lead.id} className="border rounded-lg p-3">
        <span className="font-semibold">{lead.name || lead.id}</span><span className="ml-2 text-sm">INR {String(store.records[lead.id].amount)}</span>
        <div className="flex gap-2 mt-2">
          <button className="text-sm text-indigo-700" onClick={() => makeDocument(lead, 'receipt')}>Create receipt</button>
          <button className="text-sm text-indigo-700" onClick={() => makeDocument(lead, 'certificate')}>Review certificate</button>
        </div>
      </div>)}</div>
    </div>
    <div className="grid xl:grid-cols-[340px_1fr] gap-5 items-start">
      <aside className="bg-white rounded-xl border p-4 space-y-4">
        <h3 className="font-bold flex gap-2 items-center"><Palette size={18} /> Editing sidebar</h3>
        <button className="w-full border rounded-lg p-2" onClick={() => { setApproved(false); setDesign(defaultDesign()); }}>New advertisement</button>
        <label className="block text-sm font-medium">Saved designs<select className="mt-1 w-full border rounded-lg p-2" value={design?.id || ''} onChange={event => { const row = saved.find(row => row.id === event.target.value); if (row) { setApproved(false); setDesign(row.status === 'final' ? row : drafts[row.id] || row); } }}>
          <option value="">Select a saved design…</option>{saved.map(row => <option key={row.id} value={row.id}>{row.title} · {row.status}</option>)}
        </select></label>
        <fieldset disabled={busy || finalized} className="space-y-3">
          {(['title', 'headline', 'subtitle', 'footer'] as const).map(key => <label key={key} className="block text-sm font-medium capitalize">{key}<textarea rows={key === 'subtitle' ? 5 : 2} className="mt-1 border rounded-lg w-full p-2" value={design?.[key] || ''} onChange={event => update({ [key]: event.target.value })} /></label>)}
          <div className="flex gap-3">{(['accent', 'background', 'textColor'] as const).map(key => <label key={key} className="text-xs">{key}<input aria-label={key} type="color" className="block h-9 w-16" value={design?.[key] || '#ffffff'} onChange={event => update({ [key]: event.target.value })} /></label>)}</div>
          <label className="block text-sm">Typography<select className="border rounded-lg p-2 w-full" value={design?.fontFamily} onChange={event => update({ fontFamily: event.target.value === 'serif' ? 'serif' : 'sans' })}><option value="sans">Clean sans-serif</option><option value="serif">Classic serif</option></select></label>
          <label className="block text-sm">Canvas size<select className="border rounded-lg p-2 w-full" value={`${design?.width}x${design?.height}`} onChange={event => { const [width, height] = event.target.value.split('x').map(Number); update({ width, height }); }}><option value="1080x1080">Square · 1080 × 1080</option><option value="1024x1024">AI Square · 1024 × 1024</option><option value="1024x1792">Story · 1024 × 1792</option><option value="1792x1024">Landscape · 1792 × 1024</option><option value="1600x1100">Document · 1600 × 1100</option></select></label>
        </fieldset>
        {design?.kind === 'certificate' && !finalized && <label className="flex gap-2 text-sm"><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} />I verified participation and approve certificate eligibility.</label>}
        <div className="flex gap-2">
          <button disabled={busy || finalized || !design} className="flex gap-1 items-center border rounded-lg p-2" onClick={() => void act(async () => {
            await offerAutosave.save({});
            const response = await offerJson<{ data: StudioDesign }>('designs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ design: { ...design, status: 'draft' }, previous: saved.find(row => row.id === design?.id) || {}, approveCertificate: approved }) });
            setDesign(response.data); await refresh(); setNotice('Draft saved permanently in Bunny.');
          })}><Save size={16} />Save draft</button>
          <button disabled={busy || finalized || !design || renderedId !== design.id || (design.kind !== 'ad' && !design.documentNumber)} className="flex gap-1 items-center bg-indigo-600 text-white rounded-lg p-2" onClick={() => void act(async () => {
            await offerAutosave.save({});
            const response = await offerJson<{ data: StudioDesign }>('designs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ design: { ...design, status: 'final' }, previous: saved.find(row => row.id === design?.id) || {}, png: canvas.current!.toDataURL('image/png'), approveCertificate: approved }) });
            setDesign(response.data); await refresh(); await store.reload(); setNotice('Final PDF saved in Bunny. No WhatsApp message was sent.');
          })}><FileCheck size={16} />Finalize PDF</button>
        </div>
        {finalized && design?.kind !== 'ad' && <div className="border-t pt-3 space-y-2">
          <h3 className="font-semibold">Approved Meta document delivery</h3>
          <select aria-label="Approved document template" value={templateId} onChange={event => setTemplateId(event.target.value)} className="w-full border rounded p-2"><option value="">Select approved document template</option>{templates.map(template => <option key={template._id} value={template._id}>{template.templateName}</option>)}</select>
          <label className="text-sm flex gap-2"><input type="checkbox" checked={deliveryApproved} onChange={event => setDeliveryApproved(event.target.checked)} />I checked the recipient, PDF and messaging consent.</label>
          <button disabled={busy || !templateId || !deliveryApproved} className="w-full bg-emerald-700 text-white rounded p-2" onClick={() => void act(async () => {
            const response = await offerJson<{ message: string }>('delivery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ designId: design.id, templateId, approved: true }) });
            setNotice(response.message); await store.reload();
          })}>Queue Meta delivery once</button>
          <a href="/admin/crm/broadcast" className="text-sm underline">View Broadcast Reports</a>
        </div>}
        <div className="border-t pt-4 space-y-3">
          <h3 className="font-bold flex items-center gap-2"><Sparkles size={18} />AI creative brief</h3>
          <textarea aria-label="AI creative brief" className="border rounded-lg p-2 w-full" rows={4} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="Describe your audience, workshop, mood and call to action. Include only confirmed details." />
          <div className="flex gap-2"><select aria-label="Creative language" value={language} onChange={event => setLanguage(event.target.value)} className="border rounded p-1">{['English', 'Hindi', 'Marathi', 'Kannada'].map(value => <option key={value}>{value}</option>)}</select>
            <select aria-label="Creative format" value={format} onChange={event => setFormat(event.target.value)} className="border rounded p-1"><option value="square">Square</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div>
          <select aria-label="AI media type" value={media} onChange={event => setMedia(event.target.value)} className="border rounded p-2 w-full"><option value="copy">Copy & layout only</option><option value="image">AI image background (paid)</option><option value="video">AI video background (paid)</option></select>
          <p className="text-xs text-slate-500">Image/video uses your configured provider credits. Jobs are saved and checked asynchronously; text stays editable.</p>
          <button disabled={busy || !prompt.trim()} className="bg-slate-900 text-white rounded-lg p-2 w-full" onClick={() => void act(async () => {
            const result = await offerJson<{ data: StudioDesign }>('creative', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, language, format, media }) });
            setDesign(result.data); await refresh(); setNotice(media === 'copy' ? 'AI draft saved. Review the wording before publishing.' : 'Generation job saved. You can keep editing while it processes.');
          })}>{busy ? 'Working…' : 'Generate draft'}</button>
        </div>
        <div className="border-t pt-3 space-y-2"><label className="text-sm">Canva design ID<input aria-label="Canva design ID" className="border rounded p-2 w-full" value={canvaId} onChange={event => setCanvaId(event.target.value)} /></label>
          <button disabled={!canvaConnected || busy || !canvaId} className="border rounded p-2 w-full" onClick={() => void act(async () => {
            const result = await offerJson<{ data: { id: string } }>('canva', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'export', designId: canvaId }) });
            for (let count = 0; count < 20; count++) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              const status = await offerJson<{ data: { fileUrl?: string } }>(`canva?id=${result.data.id}`);
              if (status.data.fileUrl) { setNotice('Canva PDF imported permanently into Bunny.'); window.open(status.data.fileUrl, '_blank', 'noopener,noreferrer'); return; }
            }
            throw new Error('Canva export is still processing; its job is saved. Retry checking later.');
          })}>Import Canva PDF</button></div>
      </aside>
      <section className="rounded-xl bg-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{design?.title || 'Loading studio…'} {finalized && '· Final document locked'}</span>
          <div className="flex gap-3">
            <button className="flex items-center gap-1 text-sm" disabled={!design || renderedId !== design.id} onClick={() => {
              const link = document.createElement('a'); link.download = `${design!.id}.png`; link.href = canvas.current!.toDataURL('image/png'); link.click();
            }}><ImageIcon size={16} />Download PNG</button>
            {design?.fileUrl && <a href={design.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm"><Download size={16} />Saved PDF</a>}
          </div>
        </div>
        <canvas ref={canvas} aria-label="Editable design preview" className="block w-full max-w-[740px] h-auto mx-auto shadow-xl" />
        {design?.generationStatus && <p role="status" className="text-sm">Generation: {design.generationStatus}</p>}
        {design?.videoUrl && <div><p className="text-sm flex gap-2 mb-2"><Video size={16} />Saved AI video background (copy is shown separately above)</p><video controls src={design.videoUrl} className="max-h-96 w-full" /><a href={design.videoUrl} target="_blank" rel="noreferrer" className="text-sm underline">Download saved MP4</a></div>}
      </section>
    </div>
  </div>;
}
