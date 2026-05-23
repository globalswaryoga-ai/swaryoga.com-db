'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Save, X, Trash2, Loader, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MealSlot {
  slotKey: string;
  time: string;
  label: string;
  emoji: string;
  foods: string[];
  tip: string;
}

interface DietPlan {
  _id?: string;
  ritu: string;
  phase: string;
  meals: MealSlot[];
  herbs: string[];
  lifestyleTips: string[];
  avoidFoods: string[];
  specialNotes: string;
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

const MEAL_SLOTS = [
  { key: 'gond_pani', time: '4:00 AM', label: 'Gond Pani', emoji: '🌙' },
  { key: 'herbal_drink', time: '6:00 AM', label: 'Herbal Drink', emoji: '🌿' },
  { key: 'breakfast', time: '8:30 AM', label: 'Breakfast', emoji: '🥣' },
  { key: 'lunch', time: '11:30 AM', label: 'Lunch (Bhojan)', emoji: '🍱' },
  { key: 'snacks', time: '5:00 PM', label: 'Snacks (Nashta)', emoji: '🍎' },
  { key: 'dinner', time: '7:30 PM', label: 'Dinner (Ratri Bhojan)', emoji: '🍽️' },
  { key: 'sleep_drink', time: '9:30 PM', label: 'Sleep Drink', emoji: '🥛' },
];

export default function DietPlanPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<DietPlan>({
    ritu: 'grishma',
    phase: 'peak',
    meals: MEAL_SLOTS.map(slot => ({ ...slot, foods: [], tip: '' })),
    herbs: [],
    lifestyleTips: [],
    avoidFoods: [],
    specialNotes: '',
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/crm/ritucharya-diet', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.meals.some(m => m.foods.length > 0)) {
      alert('Please add at least some foods to meal slots');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/crm/ritucharya-diet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success || data.plan) {
        alert('✅ Saved successfully!');
        setShowForm(false);
        fetchPlans();
      } else {
        alert('❌ Failed to save: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error saving: ' + String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLoadExisting = (ritu: string, phase: string) => {
    const existing = plans.find(p => p.ritu === ritu && p.phase === phase);
    if (existing) {
      setFormData(existing);
      setShowForm(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
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
              <h1 className="text-3xl font-bold text-gray-900">🍱 Diet Plan & Meals</h1>
              <p className="text-gray-600 text-sm mt-1">Create meal plans and daily routines for each Ritu+Phase</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setFormData({
                  ritu: 'grishma',
                  phase: 'peak',
                  meals: MEAL_SLOTS.map(slot => ({ ...slot, foods: [], tip: '' })),
                  herbs: [],
                  lifestyleTips: [],
                  avoidFoods: [],
                  specialNotes: '',
                });
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
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
                  const plan = plans.find(p => p.ritu === ritu && p.phase === phase);
                  return (
                    <div
                      key={`${ritu}-${phase}`}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        plan
                          ? 'bg-orange-50 border-orange-300 hover:border-orange-400'
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
                          plan ? 'bg-orange-200 text-orange-800' : 'bg-gray-200 text-gray-800'
                        }`}>
                          {plan ? '✓ Done' : 'Add'}
                        </span>
                      </div>
                      {plan && (
                        <div className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-300 space-y-1">
                          <p>🍽️ {plan.meals?.length || 0} meal slots</p>
                          <p>🌱 {plan.herbs?.length || 0} herbs</p>
                          <p>🧘 {plan.lifestyleTips?.length || 0} tips</p>
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
          <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add Diet Plan</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Ritu & Phase */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ritu</label>
                  <select
                    value={formData.ritu}
                    onChange={(e) => setFormData({ ...formData, ritu: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    {PHASES.map(p => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Meal Slots */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-300">
                <h3 className="font-bold text-orange-900 mb-4">🍽️ Daily Meal Schedule (7 Slots)</h3>
                <div className="space-y-4">
                  {formData.meals.map((meal, idx) => (
                    <div key={meal.slotKey} className="bg-white p-4 rounded border border-orange-200">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{meal.emoji}</span>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{meal.label}</p>
                          <p className="text-xs text-gray-500">🕐 {meal.time}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-semibold text-gray-700">Foods (one per line)</label>
                          <textarea
                            value={meal.foods.join('\n')}
                            onChange={(e) => {
                              const updated = [...formData.meals];
                              updated[idx].foods = e.target.value.split('\n').filter(f => f.trim());
                              setFormData({ ...formData, meals: updated });
                            }}
                            placeholder="Rice with ghee&#10;Dal preparation&#10;Seasonal vegetables"
                            className="w-full px-3 py-2 border border-orange-200 rounded text-xs resize-none"
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700">Tip</label>
                          <input
                            type="text"
                            value={meal.tip}
                            onChange={(e) => {
                              const updated = [...formData.meals];
                              updated[idx].tip = e.target.value;
                              setFormData({ ...formData, meals: updated });
                            }}
                            placeholder="e.g., Eat warm, avoid cold water"
                            className="w-full px-3 py-2 border border-orange-200 rounded text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Herbs & Supplements */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-300">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-green-900">🌱 Daily Herbs & Supplements</h3>
                  <button
                    onClick={() => setFormData({
                      ...formData,
                      herbs: [...formData.herbs, '']
                    })}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.herbs.map((herb, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={herb}
                        onChange={(e) => {
                          const updated = [...formData.herbs];
                          updated[idx] = e.target.value;
                          setFormData({ ...formData, herbs: updated });
                        }}
                        placeholder="e.g., Turmeric powder, Ashwagandha"
                        className="flex-1 px-3 py-2 border border-green-300 rounded text-sm"
                      />
                      {formData.herbs.length > 0 && (
                        <button
                          onClick={() => setFormData({
                            ...formData,
                            herbs: formData.herbs.filter((_, i) => i !== idx)
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

              {/* Lifestyle Tips */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-300">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-blue-900">🧘 Lifestyle Tips</h3>
                  <button
                    onClick={() => setFormData({
                      ...formData,
                      lifestyleTips: [...formData.lifestyleTips, '']
                    })}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.lifestyleTips.map((tip, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={tip}
                        onChange={(e) => {
                          const updated = [...formData.lifestyleTips];
                          updated[idx] = e.target.value;
                          setFormData({ ...formData, lifestyleTips: updated });
                        }}
                        placeholder="e.g., Wake up early, take cold water bath"
                        className="flex-1 px-3 py-2 border border-blue-300 rounded text-sm"
                      />
                      {formData.lifestyleTips.length > 0 && (
                        <button
                          onClick={() => setFormData({
                            ...formData,
                            lifestyleTips: formData.lifestyleTips.filter((_, i) => i !== idx)
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

              {/* Avoid Foods */}
              <div className="bg-red-50 p-4 rounded-lg border border-red-300">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-red-900">🚫 Foods to Avoid This Season</h3>
                  <button
                    onClick={() => setFormData({
                      ...formData,
                      avoidFoods: [...formData.avoidFoods, '']
                    })}
                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.avoidFoods.map((food, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={food}
                        onChange={(e) => {
                          const updated = [...formData.avoidFoods];
                          updated[idx] = e.target.value;
                          setFormData({ ...formData, avoidFoods: updated });
                        }}
                        placeholder="e.g., Ice cream, cold drinks"
                        className="flex-1 px-3 py-2 border border-red-300 rounded text-sm"
                      />
                      {formData.avoidFoods.length > 0 && (
                        <button
                          onClick={() => setFormData({
                            ...formData,
                            avoidFoods: formData.avoidFoods.filter((_, i) => i !== idx)
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

              {/* Special Notes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">📝 Special Notes</label>
                <textarea
                  value={formData.specialNotes}
                  onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                  placeholder="Additional notes, contraindications, or special considerations..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 resize-none"
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
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
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
