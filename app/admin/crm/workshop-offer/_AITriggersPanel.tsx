import React from 'react';

interface AITriggersPanelProps {
  workshops?: any[];
  leadsData?: any[];
  selectedLanguage?: string;
  selectedBatchId?: string;
  batchDecisions?: Record<string, any>;
}

export function AITriggersPanel({
  workshops = [],
  leadsData = [],
  selectedLanguage,
  selectedBatchId,
  batchDecisions = {},
}: AITriggersPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">⚡</span>
        <h3 className="font-bold text-slate-800 text-base">AI Triggers</h3>
        <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Coming Soon</span>
      </div>
      <p className="text-sm text-slate-500">
        Automated AI trigger workflows will appear here. Configure when to automatically send WhatsApp messages,
        follow-ups, and reminders based on lead behaviour.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
        <div className="border border-dashed border-slate-200 rounded-lg p-3">📩 Auto Follow-Up</div>
        <div className="border border-dashed border-slate-200 rounded-lg p-3">📅 Batch Reminder</div>
        <div className="border border-dashed border-slate-200 rounded-lg p-3">🎓 Certificate Trigger</div>
        <div className="border border-dashed border-slate-200 rounded-lg p-3">🔁 Re-engagement</div>
      </div>
    </div>
  );
}
