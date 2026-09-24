'use client';

import React, { useState, useEffect } from 'react';
import { Video, Save, Loader, CheckCircle, Youtube } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function ZoomAnalysisTab() {
  const token = useAuth();
  const [workshopName, setWorkshopName] = useState('Default Workshop');
  const [recordings, setRecordings] = useState<Record<string, string>>({ day1: '', day2: '', day3: '', day4: '', day5: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchRecordings = () => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/admin/crm/recording-management/workshop/recordings?workshopName=${encodeURIComponent(workshopName)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.data?.recordings) {
        setRecordings(prev => ({ ...prev, ...data.data.recordings }));
      }
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchRecordings();
  }, [token, workshopName]);

  const handleSave = async (day: string) => {
    if (!token) return;
    setSaving(day);
    try {
      const res = await fetch('/api/admin/crm/recording-management/workshop/recordings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          day,
          url: recordings[day],
          workshopName
        })
      });
      if (res.ok) {
        // Success
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setSaving(null), 1000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-6 overflow-y-auto">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="h-6 w-6 text-indigo-600" />
            Workshop Recordings
          </h2>
          <p className="text-sm text-gray-500 mt-1">Map YouTube URLs to Workshop Days to prepare them for broadcast</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <input 
            type="text" 
            value={workshopName}
            onChange={e => setWorkshopName(e.target.value)}
            placeholder="Workshop Name"
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col gap-6 max-w-3xl">
        {loading ? (
           <div className="flex items-center gap-2 text-indigo-600"><Loader className="animate-spin w-4 h-4"/> Loading...</div>
        ) : (
          ['day1', 'day2', 'day3', 'day4', 'day5'].map((day) => (
            <div key={day} className="flex flex-col md:flex-row gap-4 items-start md:items-center p-4 border border-gray-100 bg-gray-50 rounded-xl">
              <div className="w-24 font-bold text-gray-800 uppercase tracking-wider text-sm">{day}</div>
              <div className="flex-1 w-full relative">
                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  value={recordings[day] || ''}
                  onChange={e => setRecordings(prev => ({ ...prev, [day]: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button 
                onClick={() => handleSave(day)}
                disabled={saving === day}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors w-full md:w-auto justify-center"
              >
                {saving === day ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saving === day ? 'Saved' : 'Save'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
