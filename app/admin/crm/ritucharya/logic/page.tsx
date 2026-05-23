'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Save, X, Trash2, Loader, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RituLogic {
  _id?: string;
  ritu: string;
  phase: string;
  tempMin: number;
  tempMax: number;
  humidMin: number;
  humidMax: number;
  windMin: number;
  windMax: number;
  skyConditions?: string[];
  ayana?: string;
  characterEn?: string;
  characterHi?: string;
}

const RITUS = ['shishir', 'vasant', 'grishma', 'varsha', 'sharad', 'hemant'];
const PHASES = ['begin', 'peak', 'last'];
const RITU_LABELS: Record<string, string> = {
  shishir: '❄️ Shishir (Winter)',
  vasant: '🌸 Vasant (Spring)',
  grishma: '☀️ Grishma (Summer)',
  varsha: '🌧️ Varsha (Monsoon)',
  sharad: '🍂 Sharad (Autumn)',
  hemant: '🥶 Hemant (Early Winter)',
};

const AYANAS = ['uttarayan', 'dakshinayan'];
const SKY_OPTIONS = ['Clear', 'Partly cloudy', 'Cloudy', 'Overcast', 'Foggy', 'Rainy', 'Snowy', 'Thunderstorm'];

export default function RitucharyaLogicPage() {
  const router = useRouter();
  const [logics, setLogics] = useState<RituLogic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<RituLogic>({
    ritu: 'grishma',
    phase: 'peak',
    tempMin: 25,
    tempMax: 40,
    humidMin: 20,
    humidMax: 60,
    windMin: 0,
    windMax: 20,
    skyConditions: [],
    ayana: 'uttarayan',
    characterEn: '',
    characterHi: '',
  });

  useEffect(() => {
    fetchLogics();
  }, []);

  const fetchLogics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/crm/ritucharya-logic', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogics(data.rows || []);
      }
    } catch (err) {
      console.error('Failed to fetch logic:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.characterEn.trim()) {
      alert('Please enter character description (English)');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/crm/ritucharya-logic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Saved successfully!');
        setShowForm(false);
        fetchLogics();
      } else {
        alert('❌ Failed to save: ' + data.error);
      }
    } catch (err) {
      alert('Error saving: ' + String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLoadExisting = (ritu: string, phase: string) => {
    const existing = logics.find(l => l.ritu === ritu && l.phase === phase);
    if (existing) {
      setFormData(existing);
      setShowForm(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🌡️ Ritucharya Logic</h1>
              <p className="text-gray-600 text-sm mt-1">Set weather ranges and map to Ritu seasons</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setFormData({
                  ritu: 'grishma',
                  phase: 'peak',
                  tempMin: 25,
                  tempMax: 40,
                  humidMin: 20,
                  humidMax: 60,
                  windMin: 0,
                  windMax: 20,
                  skyConditions: [],
                  ayana: 'uttarayan',
                  characterEn: '',
                  characterHi: '',
                });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          )}
        </div>

        {/* Grid View */}
        {!showForm && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {RITUS.map(ritu =>
                PHASES.map(phase => {
                  const log = logics.find(l => l.ritu === ritu && l.phase === phase);
                  return (
                    <div
                      key={`${ritu}-${phase}`}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        log
                          ? 'bg-blue-50 border-blue-300 hover:border-blue-400'
                          : 'bg-gray-50 border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => handleLoadExisting(ritu, phase)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{RITU_LABELS[ritu]}</p>
                          <p className="text-xs text-gray-600 capitalize">Phase: {phase}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          log ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-800'
                        }`}>
                          {log ? '✓ Set' : 'Add'}
                        </span>
                      </div>
                      {log && (
                        <div className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-300 space-y-1">
                          <p>🌡️ Temp: {log.tempMin}°-{log.tempMax}°C</p>
                          <p>💧 Humid: {log.humidMin}%-{log.humidMax}%</p>
                          <p>💨 Wind: {log.windMin}-{log.windMax} km/h</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-8 max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Set Weather Ranges</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Ritu & Phase Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ritu</label>
                  <select
                    value={formData.ritu}
                    onChange={(e) => setFormData({ ...formData, ritu: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {RITUS.map(r => (
                      <option key={r} value={r}>{RITU_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phase</label>
                  <select
                    value={formData.phase}
                    onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PHASES.map(p => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Temperature Range */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-300">
                <h3 className="font-bold text-orange-900 mb-3">🌡️ Temperature Range (°C)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-700">Min</label>
                    <input
                      type="number"
                      value={formData.tempMin}
                      onChange={(e) => setFormData({ ...formData, tempMin: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-orange-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Max</label>
                    <input
                      type="number"
                      value={formData.tempMax}
                      onChange={(e) => setFormData({ ...formData, tempMax: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-orange-300 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Humidity Range */}
              <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-300">
                <h3 className="font-bold text-cyan-900 mb-3">💧 Humidity Range (%)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-700">Min</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.humidMin}
                      onChange={(e) => setFormData({ ...formData, humidMin: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-cyan-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Max</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.humidMax}
                      onChange={(e) => setFormData({ ...formData, humidMax: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-cyan-300 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Wind Range */}
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-300">
                <h3 className="font-bold text-yellow-900 mb-3">💨 Wind Speed Range (km/h)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-700">Min</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.windMin}
                      onChange={(e) => setFormData({ ...formData, windMin: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-yellow-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Max</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.windMax}
                      onChange={(e) => setFormData({ ...formData, windMax: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-yellow-300 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Sky Conditions */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-300">
                <h3 className="font-bold text-purple-900 mb-3">☁️ Sky Conditions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {SKY_OPTIONS.map(option => (
                    <label key={option} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.skyConditions?.includes(option) || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              skyConditions: [...(formData.skyConditions || []), option]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              skyConditions: (formData.skyConditions || []).filter(s => s !== option)
                            });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ayana */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Ayana (Sun's Path)</label>
                <select
                  value={formData.ayana}
                  onChange={(e) => setFormData({ ...formData, ayana: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {AYANAS.map(a => (
                    <option key={a} value={a}>
                      {a === 'uttarayan' ? '☀️ Uttarayan (Jan-Jun)' : '🌌 Dakshinayan (Jul-Dec)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Character Description */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Character (English)</label>
                <textarea
                  value={formData.characterEn}
                  onChange={(e) => setFormData({ ...formData, characterEn: e.target.value })}
                  placeholder="e.g., Hot, dry season with intense sun..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Character (Hindi)</label>
                <textarea
                  value={formData.characterHi}
                  onChange={(e) => setFormData({ ...formData, characterHi: e.target.value })}
                  placeholder="e.g., गर्म, सूखा मौसम..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
              </div>

              {/* Save Button */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
