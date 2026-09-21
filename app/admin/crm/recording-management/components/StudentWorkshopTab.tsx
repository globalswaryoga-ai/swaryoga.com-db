'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Search, Users, Download, Send, Loader, CheckCircle, Video, CheckSquare, Square, Phone, Calendar } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  phone: string;
  source: string;
  day1: boolean;
  day2: boolean;
  day3: boolean;
}

export default function StudentWorkshopTab() {
  const token = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Broadcast state
  const [broadcastMethod, setBroadcastMethod] = useState<'qr' | 'meta'>('qr');
  const [broadcastDay, setBroadcastDay] = useState('day1');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{success: boolean, message: string} | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/crm/recording-management/workshop/students', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.data?.students) {
        setStudents(data.data.students);
      }
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [token]);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.phone.includes(searchQuery)
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBroadcast = async () => {
    if (selectedIds.size === 0 || !token) return;
    setBroadcasting(true);
    setBroadcastResult(null);

    try {
      const res = await fetch('/api/admin/crm/recording-management/workshop/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentIds: Array.from(selectedIds),
          day: broadcastDay,
          method: broadcastMethod
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBroadcastResult({ success: true, message: data.data.message });
        setTimeout(() => setBroadcastResult(null), 5000);
      } else {
        throw new Error(data.error || 'Broadcast failed');
      }
    } catch (err: any) {
      setBroadcastResult({ success: false, message: err.message });
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-6 overflow-y-auto">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Student Workshop
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage attendees, track presence, and broadcast recordings</p>
        </div>
        
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400"
            />
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-xl">
              <span className="text-xs font-bold text-indigo-700">{selectedIds.size} selected</span>
              
              <div className="h-4 w-px bg-indigo-200" />
              
              <select 
                value={broadcastDay}
                onChange={(e) => setBroadcastDay(e.target.value)}
                className="text-xs border-gray-300 rounded-lg py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="day1">Day 1 Recording</option>
                <option value="day2">Day 2 Recording</option>
                <option value="day3">Day 3 Recording</option>
              </select>

              <select
                value={broadcastMethod}
                onChange={(e) => setBroadcastMethod(e.target.value as any)}
                className="text-xs border-gray-300 rounded-lg py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="qr">Send via QR (Baileys)</option>
                <option value="meta">Send via Meta API</option>
              </select>

              <button
                onClick={handleBroadcast}
                disabled={broadcasting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {broadcasting ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Broadcast
              </button>
            </div>
          )}
        </div>

        {/* Broadcast Result */}
        {broadcastResult && (
          <div className={`mx-4 mt-4 p-3 text-sm font-medium rounded-xl flex items-center gap-2 ${broadcastResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {broadcastResult.success ? <CheckCircle className="h-4 w-4" /> : null}
            {broadcastResult.message}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Aggregating student data...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-20">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-500 mb-2">No students found</h3>
              <p className="text-sm text-gray-400">Try adjusting your search.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left py-3 px-3 w-10">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-indigo-600">
                      {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student Details</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Day 1</th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Day 2</th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Day 3</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id} className={`border-b border-gray-100 hover:bg-indigo-50/30 transition-colors ${selectedIds.has(student.id) ? 'bg-indigo-50/50' : ''}`}>
                    <td className="py-3 px-3">
                      <button onClick={() => toggleSelection(student.id)} className={`transition-colors ${selectedIds.has(student.id) ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-400'}`}>
                        {selectedIds.has(student.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900 text-sm">{student.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" /> {student.phone}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                        {student.source}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {student.day1 ? <span className="inline-flex w-6 h-6 items-center justify-center bg-green-100 text-green-700 rounded-full text-xs font-bold">P</span> : <span className="inline-flex w-6 h-6 items-center justify-center bg-red-50 text-red-400 rounded-full text-xs font-bold">A</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {student.day2 ? <span className="inline-flex w-6 h-6 items-center justify-center bg-green-100 text-green-700 rounded-full text-xs font-bold">P</span> : <span className="inline-flex w-6 h-6 items-center justify-center bg-red-50 text-red-400 rounded-full text-xs font-bold">A</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {student.day3 ? <span className="inline-flex w-6 h-6 items-center justify-center bg-green-100 text-green-700 rounded-full text-xs font-bold">P</span> : <span className="inline-flex w-6 h-6 items-center justify-center bg-red-50 text-red-400 rounded-full text-xs font-bold">A</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
