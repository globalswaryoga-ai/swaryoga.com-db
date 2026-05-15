'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, Save, Trash2, Loader, AlertCircle } from 'lucide-react';
import { seasonalDatabase } from '@/lib/ritucharya/seasonalAnalysis';

interface Variation {
  _id?: string;
  foodName: string;
  foodNameHi: string;
  ritu: string;
  dosha: 'vata' | 'pitta' | 'kapha';
  adjustment: string;
  adjustmentHi: string;
  benefits: string[];
  benefitsHi: string[];
  avoidWith?: string;
  avoidWithHi?: string;
  seasonalNote: string;
  seasonalNoteHi: string;
}

const DOSHAS = [
  { id: 'vata', name: 'Vata', color: 'border-red-500 bg-red-50' },
  { id: 'pitta', name: 'Pitta', color: 'border-orange-500 bg-orange-50' },
  { id: 'kapha', name: 'Kapha', color: 'border-blue-500 bg-blue-50' },
];

export default function VariationsAdminPage() {
  const [variations, setVariations] = useState<Variation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<Variation>({
    foodName: '',
    foodNameHi: '',
    ritu: 'grisham',
    dosha: 'vata',
    adjustment: '',
    adjustmentHi: '',
    benefits: [],
    benefitsHi: [],
    avoidWith: '',
    avoidWithHi: '',
    seasonalNote: '',
    seasonalNoteHi: '',
  });

  const [benefitInput, setBenefitInput] = useState('');
  const [benefitInputHi, setBenefitInputHi] = useState('');

  useEffect(() => {
    fetchVariations();
  }, []);

  const fetchVariations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ritucharya/variations');
      const data = await response.json();
      if (data.success) {
        setVariations(data.variations);
      }
    } catch (error) {
      console.error('Error fetching variations:', error);
      setMessage({ type: 'error', text: 'Failed to load variations' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBenefit = () => {
    if (benefitInput.trim()) {
      setFormData(prev => ({
        ...prev,
        benefits: [...prev.benefits, benefitInput.trim()],
      }));
      setBenefitInput('');
    }
  };

  const handleAddBenefitHi = () => {
    if (benefitInputHi.trim()) {
      setFormData(prev => ({
        ...prev,
        benefitsHi: [...prev.benefitsHi, benefitInputHi.trim()],
      }));
      setBenefitInputHi('');
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
  };

  const handleRemoveBenefitHi = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefitsHi: prev.benefitsHi.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!formData.foodName || !formData.adjustment) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/ritucharya/variations', {
        method: formData._id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: formData._id ? 'Updated successfully' : 'Created successfully' });
        setFormData({
          foodName: '',
          foodNameHi: '',
          ritu: 'grisham',
          dosha: 'vata',
          adjustment: '',
          adjustmentHi: '',
          benefits: [],
          benefitsHi: [],
          avoidWith: '',
          avoidWithHi: '',
          seasonalNote: '',
          seasonalNoteHi: '',
        });
        fetchVariations();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch (error) {
      console.error('Error saving:', error);
      setMessage({ type: 'error', text: 'Error saving variation' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this variation?')) return;

    try {
      const response = await fetch(`/api/ritucharya/variations/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Deleted successfully' });
        fetchVariations();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error deleting variation' });
    }
  };

  const handleEdit = (variation: Variation) => {
    setFormData(variation);
    window.scrollTo(0, 0);
  };

  const handleClear = () => {
    setFormData({
      foodName: '',
      foodNameHi: '',
      ritu: 'grisham',
      dosha: 'vata',
      adjustment: '',
      adjustmentHi: '',
      benefits: [],
      benefitsHi: [],
      avoidWith: '',
      avoidWithHi: '',
      seasonalNote: '',
      seasonalNoteHi: '',
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen pt-24 pb-16 bg-white flex items-center justify-center">
        <Loader className="animate-spin text-blue-600" size={40} />
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">
            Ritu × Dosha Variations Admin
          </h1>
          <p className="text-gray-600">Manage food/recipe variations based on season and dosha</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 border-l-4 border-green-500'
                : 'bg-red-50 border-l-4 border-red-500'
            }`}
          >
            <AlertCircle className={message.type === 'success' ? 'text-green-600' : 'text-red-600'} size={20} />
            <div className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-white p-8 rounded-lg border-2 border-blue-300 shadow-sm">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {formData._id ? '✏️ Edit Variation' : '➕ Add New Variation'}
            </h2>

            <div className="space-y-4">
              {/* Food Name - English */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Food Name (English) *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Milk, Ghee, Rice"
                  value={formData.foodName}
                  onChange={(e) => setFormData({ ...formData, foodName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:outline-none focus:border-blue-500 text-gray-900"
                />
              </div>

              {/* Food Name - Hindi */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Food Name (Hindi) *
                </label>
                <input
                  type="text"
                  placeholder="e.g., दूध, घी, चावल"
                  value={formData.foodNameHi}
                  onChange={(e) => setFormData({ ...formData, foodNameHi: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:outline-none focus:border-blue-500 text-gray-900"
                />
              </div>

              {/* Ritu Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ritu (Season) *</label>
                <select
                  value={formData.ritu}
                  onChange={(e) => setFormData({ ...formData, ritu: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:outline-none focus:border-blue-500 text-gray-900"
                >
                  {Object.values(seasonalDatabase).map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.nameHi} ({season.nameEn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dosha Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Dosha Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {DOSHAS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setFormData({ ...formData, dosha: d.id as any })}
                      className={`p-3 rounded-lg font-semibold border-2 transition-all ${
                        formData.dosha === d.id
                          ? `${d.color} border-current`
                          : 'border-gray-300 bg-gray-100 text-gray-700'
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Adjustment - English */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Adjustment/Variation (English) *
                </label>
                <textarea
                  placeholder="e.g., Add warming spices like ginger and cinnamon. Use with warm ghee instead of cold water."
                  value={formData.adjustment}
                  onChange={(e) => setFormData({ ...formData, adjustment: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:outline-none focus:border-blue-500 text-gray-900"
                  rows={3}
                />
              </div>

              {/* Adjustment - Hindi */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Adjustment/Variation (Hindi)
                </label>
                <textarea
                  placeholder="उदा: गर्म मसाले जैसे अदरक और दालचीनी मिलाएं।"
                  value={formData.adjustmentHi}
                  onChange={(e) => setFormData({ ...formData, adjustmentHi: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:outline-none focus:border-blue-500 text-gray-900"
                  rows={3}
                />
              </div>

              {/* Benefits - English */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Benefits (English)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add a benefit..."
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddBenefit()}
                    className="flex-1 px-4 py-2 rounded-lg border-2 border-blue-300 focus:outline-none focus:border-blue-500 text-gray-900"
                  />
                  <button
                    onClick={handleAddBenefit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-100 border border-blue-500">
                      <span className="text-gray-900 text-sm">{benefit}</span>
                      <button onClick={() => handleRemoveBenefit(idx)} className="text-red-600 hover:opacity-70">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Benefits - Hindi */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Benefits (Hindi)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="लाभ जोड़ें..."
                    value={benefitInputHi}
                    onChange={(e) => setBenefitInputHi(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddBenefitHi()}
                    className="flex-1 px-4 py-2 rounded-lg border-2 border-blue-300 focus:outline-none focus:border-blue-500 text-gray-900"
                  />
                  <button
                    onClick={handleAddBenefitHi}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.benefitsHi.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-100 border border-blue-500">
                      <span className="text-gray-900 text-sm">{benefit}</span>
                      <button onClick={() => handleRemoveBenefitHi(idx)} className="text-red-600 hover:opacity-70">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Avoid With - English */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Avoid With (English)</label>
                <input
                  type="text"
                  placeholder="e.g., Avoid with cold water, raw vegetables"
                  value={formData.avoidWith}
                  onChange={(e) => setFormData({ ...formData, avoidWith: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:outline-none focus:border-blue-500 text-gray-900"
                />
              </div>

              {/* Avoid With - Hindi */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Avoid With (Hindi)</label>
                <input
                  type="text"
                  placeholder="उदा: ठंडे पानी के साथ न लें"
                  value={formData.avoidWithHi}
                  onChange={(e) => setFormData({ ...formData, avoidWithHi: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:outline-none focus:border-blue-500 text-gray-900"
                />
              </div>

              {/* Seasonal Note - English */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Seasonal Note (English)</label>
                <textarea
                  placeholder="Why this variation is important for this season..."
                  value={formData.seasonalNote}
                  onChange={(e) => setFormData({ ...formData, seasonalNote: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:outline-none focus:border-blue-500 text-gray-900"
                  rows={2}
                />
              </div>

              {/* Seasonal Note - Hindi */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Seasonal Note (Hindi)</label>
                <textarea
                  placeholder="इस मौसम के लिए यह भिन्नता क्यों महत्वपूर्ण है..."
                  value={formData.seasonalNoteHi}
                  onChange={(e) => setFormData({ ...formData, seasonalNoteHi: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:outline-none focus:border-blue-500 text-gray-900"
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
                >
                  <Save size={20} />
                  {saving ? 'Saving...' : 'Save Variation'}
                </button>
                {formData._id && (
                  <button
                    onClick={handleClear}
                    className="px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-semibold"
                  >
                    Clear Form
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Variations List */}
          <div className="bg-white p-8 rounded-lg border-2 border-green-300 shadow-sm">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Existing Variations ({variations.length})
            </h2>

            <div className="space-y-4 max-h-[800px] overflow-y-auto">
              {variations.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No variations yet. Create your first one!</p>
              ) : (
                variations.map((variation) => (
                  <div key={variation._id} className="p-4 rounded-lg border-2 border-gray-300 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {variation.foodName} ({variation.foodNameHi})
                        </h3>
                        <p className="text-sm text-gray-600">
                          {seasonalDatabase[variation.ritu]?.nameHi} • {variation.dosha.toUpperCase()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(variation)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => variation._id && handleDelete(variation._id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded font-semibold"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{variation.adjustment}</p>
                    {variation.benefits.length > 0 && (
                      <div className="text-xs text-gray-600">
                        Benefits: {variation.benefits.join(', ')}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
