'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Save, X, Trash2, Loader, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TasteRecommendation {
  name: string;
  percentage: number;
  emoji: string;
  description: string;
}

interface AvoidRecommendation {
  name: string;
  emoji: string;
  description: string;
}

interface DietaryRecommendation {
  _id?: string;
  ritu: string;
  phase: string;
  title: string;
  tasteRecommendations: TasteRecommendation[];
  avoidRecommendations: AvoidRecommendation[];
  additionalNotes?: string;
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

export default function DietaryRecommendationsPage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<DietaryRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedRitu, setSelectedRitu] = useState('grishma');
  const [selectedPhase, setSelectedPhase] = useState('peak');
  const [formData, setFormData] = useState<DietaryRecommendation>({
    ritu: 'grishma',
    phase: 'peak',
    title: '',
    tasteRecommendations: [{ name: '', percentage: 0, emoji: '', description: '' }],
    avoidRecommendations: [{ name: '', emoji: '', description: '' }],
    additionalNotes: '',
  });

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/crm/ritucharya-dietary-recommendations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (formData.tasteRecommendations.some(t => !t.name.trim())) {
      alert('Please fill all taste recommendation names');
      return;
    }
    if (formData.avoidRecommendations.some(a => !a.name.trim())) {
      alert('Please fill all avoid recommendation names');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/ritucharya/dietary-recommendations', {
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
        fetchRecommendations();
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
    const existing = recommendations.find(r => r.ritu === ritu && r.phase === phase);
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
              <h1 className="text-3xl font-bold text-gray-900">🍽️ Dietary Recommendations</h1>
              <p className="text-gray-600 text-sm mt-1">Add tastes & avoid recommendations for each Ritu+Phase</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setFormData({
                  ritu: 'grishma',
                  phase: 'peak',
                  title: '',
                  tasteRecommendations: [{ name: '', percentage: 0, emoji: '', description: '' }],
                  avoidRecommendations: [{ name: '', emoji: '', description: '' }],
                  additionalNotes: '',
                });
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
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
                  const rec = recommendations.find(r => r.ritu === ritu && r.phase === phase);
                  return (
                    <div
                      key={`${ritu}-${phase}`}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        rec
                          ? 'bg-green-50 border-green-300 hover:border-green-400'
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
                          rec ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'
                        }`}>
                          {rec ? '✓ Done' : 'Add'}
                        </span>
                      </div>
                      {rec && (
                        <div className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-300">
                          <p>🍶 {rec.tasteRecommendations?.length || 0} tastes</p>
                          <p>🚫 {rec.avoidRecommendations?.length || 0} avoids</p>
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
              <h2 className="text-2xl font-bold text-gray-900">Add Dietary Recommendations</h2>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    {PHASES.map(p => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Grishma (Summer) Peak Dietary Plan"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* What to Eat - Taste Recommendations */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-300">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-green-900">✅ What to Eat (Taste Recommendations)</h3>
                  <button
                    onClick={() => setFormData({
                      ...formData,
                      tasteRecommendations: [
                        ...formData.tasteRecommendations,
                        { name: '', percentage: 0, emoji: '', description: '' }
                      ]
                    })}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    + Add
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.tasteRecommendations.map((taste, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={taste.name}
                          onChange={(e) => {
                            const updated = [...formData.tasteRecommendations];
                            updated[idx].name = e.target.value;
                            setFormData({ ...formData, tasteRecommendations: updated });
                          }}
                          placeholder="e.g., Mita (Sweet)"
                          className="w-full px-3 py-2 border border-green-300 rounded text-sm"
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={taste.percentage}
                          onChange={(e) => {
                            const updated = [...formData.tasteRecommendations];
                            updated[idx].percentage = Number(e.target.value);
                            setFormData({ ...formData, tasteRecommendations: updated });
                          }}
                          placeholder="%"
                          className="w-full px-3 py-2 border border-green-300 rounded text-sm"
                        />
                      </div>
                      <div className="w-16">
                        <input
                          type="text"
                          value={taste.emoji}
                          onChange={(e) => {
                            const updated = [...formData.tasteRecommendations];
                            updated[idx].emoji = e.target.value;
                            setFormData({ ...formData, tasteRecommendations: updated });
                          }}
                          placeholder="🍶"
                          maxLength="2"
                          className="w-full px-3 py-2 border border-green-300 rounded text-sm text-center"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={taste.description}
                          onChange={(e) => {
                            const updated = [...formData.tasteRecommendations];
                            updated[idx].description = e.target.value;
                            setFormData({ ...formData, tasteRecommendations: updated });
                          }}
                          placeholder="Description"
                          className="w-full px-3 py-2 border border-green-300 rounded text-sm"
                        />
                      </div>
                      {formData.tasteRecommendations.length > 1 && (
                        <button
                          onClick={() => setFormData({
                            ...formData,
                            tasteRecommendations: formData.tasteRecommendations.filter((_, i) => i !== idx)
                          })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* What to Avoid - Avoid Recommendations */}
              <div className="bg-red-50 p-4 rounded-lg border border-red-300">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-red-900">⛔ What to Avoid</h3>
                  <button
                    onClick={() => setFormData({
                      ...formData,
                      avoidRecommendations: [
                        ...formData.avoidRecommendations,
                        { name: '', emoji: '', description: '' }
                      ]
                    })}
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  >
                    + Add
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.avoidRecommendations.map((avoid, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={avoid.name}
                          onChange={(e) => {
                            const updated = [...formData.avoidRecommendations];
                            updated[idx].name = e.target.value;
                            setFormData({ ...formData, avoidRecommendations: updated });
                          }}
                          placeholder="e.g., Salty"
                          className="w-full px-3 py-2 border border-red-300 rounded text-sm"
                        />
                      </div>
                      <div className="w-16">
                        <input
                          type="text"
                          value={avoid.emoji}
                          onChange={(e) => {
                            const updated = [...formData.avoidRecommendations];
                            updated[idx].emoji = e.target.value;
                            setFormData({ ...formData, avoidRecommendations: updated });
                          }}
                          placeholder="🧂"
                          maxLength="2"
                          className="w-full px-3 py-2 border border-red-300 rounded text-sm text-center"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={avoid.description}
                          onChange={(e) => {
                            const updated = [...formData.avoidRecommendations];
                            updated[idx].description = e.target.value;
                            setFormData({ ...formData, avoidRecommendations: updated });
                          }}
                          placeholder="Description"
                          className="w-full px-3 py-2 border border-red-300 rounded text-sm"
                        />
                      </div>
                      {formData.avoidRecommendations.length > 1 && (
                        <button
                          onClick={() => setFormData({
                            ...formData,
                            avoidRecommendations: formData.avoidRecommendations.filter((_, i) => i !== idx)
                          })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                  placeholder="Any special notes or tips..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={3}
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
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
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
