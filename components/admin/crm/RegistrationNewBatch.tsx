'use client';
import { useState } from 'react';
import { useToast } from '@/components/admin/crm/ui/Toast';
import { Plus } from 'lucide-react';

export default function RegistrationNewBatch({ onSuccess }: { onSuccess?: (data: any) => void }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleNewBatchRegistration = async () => {
    setLoading(true);
    try {
      // Placeholder sequential API calls – replace URLs with real endpoints later
      await fetch('/api/admin/google-form/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      await fetch('/api/admin/onboarding/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      await fetch('/api/admin/onboarding/welcome-message', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      await fetch('/api/admin/zoom/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      await fetch('/api/admin/whatsapp/add-to-group', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const kitRes = await fetch('/api/admin/onboarding/send-kit', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const kitData = await kitRes.json();
      
      toast.success('New batch registration completed successfully!');
      if (onSuccess) {
        onSuccess(kitData);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to register new batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleNewBatchRegistration}
      disabled={loading}
      className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:scale-105 transition-transform text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
      ) : (
        <Plus size={18} />
      )}
      Register New Batch
    </button>
  );
}
