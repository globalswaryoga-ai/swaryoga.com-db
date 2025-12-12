'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function AddSampleVisionsButton() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAddVisions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/visions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-samples' }),
      });

      const data = await response.json();

      if (data.success) {
        // Add to localStorage
        const existingVisions = JSON.parse(
          localStorage.getItem('swar-life-planner-visions') || '[]'
        );
        const allVisions = [...existingVisions, ...data.visions];
        localStorage.setItem('swar-life-planner-visions', JSON.stringify(allVisions));

        setSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to add visions:', error);
      alert('Failed to add visions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAddVisions}
      disabled={loading || success}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
        success
          ? 'bg-green-600 text-white'
          : 'bg-emerald-600 text-white hover:bg-emerald-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Plus className="h-4 w-4" />
      <span>
        {loading ? 'Adding...' : success ? '✓ Added 4 Visions!' : 'Add 4 Sample Visions'}
      </span>
    </button>
  );
}
