'use client';

import dynamic from 'next/dynamic';

const loading = () => <div role="status" className="p-6 text-sm text-slate-500">Loading registration tab...</div>;

export const WorkshopFormTab = dynamic(() => import('./_WorkshopFormTab').then(module => module.WorkshopFormTab), { loading });
export const MetaLeadsTab = dynamic(() => import('./_MetaLeadsTab').then(module => module.MetaLeadsTab), { loading });
export const LeadsManagementTab = dynamic(() => import('./_LeadsManagementTab').then(module => module.LeadsManagementTab), { loading });
export const WhatsAppMessengerTab = dynamic(() => import('./_WhatsAppMessengerTab').then(module => module.WhatsAppMessengerTab), { loading });
