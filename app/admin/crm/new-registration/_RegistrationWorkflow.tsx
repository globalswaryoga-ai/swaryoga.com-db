'use client';

const steps = ['Meta leads', 'Form responses', 'AI screening', 'Meta follow-up', 'Zoom review', 'Final approval', 'Group admission'];

export function RegistrationWorkflow({ activeTab }: { activeTab: string }) {
  const active = activeTab === 'meta_leads' ? 0 : activeTab === 'leads_management' ? 2 : activeTab === 'whatsapp_messenger' ? 3 : 1;
  return (
    <nav aria-label="Registration workflow" className="mb-4 flex flex-wrap gap-1.5">
      {steps.map((step, index) => (
        <span key={step} aria-current={index === active ? 'step' : undefined} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${index === active ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
          <span className="text-[10px] opacity-70">{index + 1}</span>{step}
        </span>
      ))}
    </nav>
  );
}
