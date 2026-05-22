'use client';

import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, ChevronDown, ChevronUp, Plus, Trash2, Image, Video, FileText, Type } from 'lucide-react';
import { seasonalDatabase } from '@/lib/ritucharya/seasonalAnalysis';
import LifePlannerImageUpload from '@/components/LifePlannerImageUpload';

interface TimeSlotRecommendation {
  time: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  pdfUrl?: string;
}

interface RituData {
  id: string;
  nameHi: string;
  nameEn: string;
  months: string;
  tempRange: string;
  humidity: string;
  dosha: { primary: string; secondary: string };
  nature: {
    climate: string;
    foliage: string;
    skinEffect: string;
    naturalPhenomena: string[];
  };
  rasas: { use: string[]; avoid: string[] };
  recommendedPercentages: {
    sweet: number;
    sour: number;
    salty: number;
    pungent: number;
    bitter: number;
    astringent: number;
  };
  doshaImbalance: {
    vata: number;
    pitta: number;
    kapha: number;
  };
  timeSlotRecommendations?: TimeSlotRecommendation[];
}

export default function RitusAdminPage() {
  const [ritus, setRitus] = useState<RituData[]>(Object.values(seasonalDatabase).map(r => ({
    ...r,
    timeSlotRecommendations: r.timeSlotRecommendations || [
      { time: '4 AM', description: '' },
      { time: '8 AM', description: '' },
      { time: '12 PM', description: '' },
      { time: '4 PM', description: '' },
      { time: '8 PM', description: '' },
      { time: '12 AM', description: '' },
    ]
  })));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<RituData | null>(null);
  const [expandedTimeSlots, setExpandedTimeSlots] = useState<{ [key: string]: boolean }>({});
  const [quickAddOpen, setQuickAddOpen] = useState<string | null>(null);

  useEffect(() => {
    // Load time slot recommendations from API for each ritu
    const loadRecommendations = async () => {
      const updatedRitus = await Promise.all(
        ritus.map(async (ritu) => {
          try {
            const response = await fetch(`/api/ritucharya/time-recommendations?rituId=${ritu.id}`);
            if (response.ok) {
              const data = await response.json();
              return {
                ...ritu,
                timeSlotRecommendations: data?.timeSlots || ritu.timeSlotRecommendations,
              };
            }
          } catch (error) {
            console.error(`Failed to load recommendations for ${ritu.id}:`, error);
          }
          return ritu;
        })
      );
      setRitus(updatedRitus);
    };

    loadRecommendations();
  }, []);

  const handleEdit = (ritu: RituData) => {
    setEditingId(ritu.id);
    setEditData({ ...ritu });
  };

  const handleSave = async () => {
    if (editData) {
      setRitus(ritus.map(r => r.id === editData.id ? editData : r));

      // Save time slot recommendations to API
      if (editData.timeSlotRecommendations) {
        try {
          await fetch('/api/ritucharya/time-recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rituId: editData.id,
              timeSlots: editData.timeSlotRecommendations,
            }),
          });
        } catch (error) {
          console.error('Failed to save time recommendations:', error);
        }
      }

      setEditingId(null);
      setEditData(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData(null);
  };

  const toggleTimeSlots = (rituId: string) => {
    setExpandedTimeSlots(prev => ({
      ...prev,
      [rituId]: !prev[rituId]
    }));
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlotRecommendation, value: string) => {
    if (editData?.timeSlotRecommendations) {
      const updated = [...editData.timeSlotRecommendations];
      updated[index] = { ...updated[index], [field]: value };
      setEditData({ ...editData, timeSlotRecommendations: updated });
    }
  };

  const deleteTimeSlot = (index: number) => {
    if (editData?.timeSlotRecommendations) {
      const updated = editData.timeSlotRecommendations.filter((_, i) => i !== index);
      setEditData({ ...editData, timeSlotRecommendations: updated });
    }
  };

  const rituEmojis: { [key: string]: string } = {
    grisham: '☀️',
    varsha: '🌧️',
    sharad: '🍂',
    hemant: '🌡️',
    shishir: '❄️',
    vasant: '🌸',
  };

  return (
    <main className="min-h-screen pt-24 pb-16" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#00FF00', fontFamily: "'Noto Sans Devanagari', serif" }}>
            🎯 Ritus (Seasons) Management
          </h1>
          <p style={{ color: '#AAAAAA' }}>Edit and manage all 6 Ayurvedic seasons</p>
        </div>

        {/* Ritus Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ritus.map((ritu) => (
            <div
              key={ritu.id}
              className="p-6 rounded-lg transition-all"
              style={{
                border: '2px solid #FFFF00',
                backgroundColor: 'rgba(26, 26, 26, 0.8)',
                backdropFilter: 'blur(5px)',
              }}
            >
              {editingId === ritu.id && editData ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold" style={{ color: '#00FF00' }}>
                      {rituEmojis[ritu.id]} Editing {editData.nameEn}
                    </h3>
                    <button onClick={handleCancel} style={{ color: '#FF6B6B' }}>
                      <X size={24} />
                    </button>
                  </div>

                  {/* Temperature Range */}
                  <div>
                    <label style={{ color: '#FFFF00' }} className="text-sm font-semibold block mb-2">
                      Temperature Range
                    </label>
                    <input
                      type="text"
                      value={editData.tempRange}
                      onChange={(e) => setEditData({ ...editData, tempRange: e.target.value })}
                      className="w-full px-3 py-2 rounded text-sm"
                      style={{ backgroundColor: '#333', color: '#FFFFFF', border: '1px solid #FFFF00' }}
                    />
                  </div>

                  {/* Humidity */}
                  <div>
                    <label style={{ color: '#FFFF00' }} className="text-sm font-semibold block mb-2">
                      Humidity
                    </label>
                    <input
                      type="text"
                      value={editData.humidity}
                      onChange={(e) => setEditData({ ...editData, humidity: e.target.value })}
                      className="w-full px-3 py-2 rounded text-sm"
                      style={{ backgroundColor: '#333', color: '#FFFFFF', border: '1px solid #FFFF00' }}
                    />
                  </div>

                  {/* Dosha Imbalance */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label style={{ color: '#FFFF00' }} className="text-xs font-semibold block mb-1">
                        Vata %
                      </label>
                      <input
                        type="number"
                        value={editData.doshaImbalance.vata}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            doshaImbalance: { ...editData.doshaImbalance, vata: parseInt(e.target.value) },
                          })
                        }
                        className="w-full px-2 py-1 rounded text-sm"
                        style={{ backgroundColor: '#333', color: '#FFFFFF', border: '1px solid #FF6B6B' }}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#FFFF00' }} className="text-xs font-semibold block mb-1">
                        Pitta %
                      </label>
                      <input
                        type="number"
                        value={editData.doshaImbalance.pitta}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            doshaImbalance: { ...editData.doshaImbalance, pitta: parseInt(e.target.value) },
                          })
                        }
                        className="w-full px-2 py-1 rounded text-sm"
                        style={{ backgroundColor: '#333', color: '#FFFFFF', border: '1px solid #FF4500' }}
                      />
                    </div>
                    <div>
                      <label style={{ color: '#FFFF00' }} className="text-xs font-semibold block mb-1">
                        Kapha %
                      </label>
                      <input
                        type="number"
                        value={editData.doshaImbalance.kapha}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            doshaImbalance: { ...editData.doshaImbalance, kapha: parseInt(e.target.value) },
                          })
                        }
                        className="w-full px-2 py-1 rounded text-sm"
                        style={{ backgroundColor: '#333', color: '#FFFFFF', border: '1px solid #0096FF' }}
                      />
                    </div>
                  </div>

                  {/* Recommended Percentages */}
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(editData.recommendedPercentages).map(([taste, value]) => (
                      <div key={taste}>
                        <label style={{ color: '#FFFF00' }} className="text-xs font-semibold block mb-1 capitalize">
                          {taste}
                        </label>
                        <input
                          type="number"
                          value={value}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              recommendedPercentages: {
                                ...editData.recommendedPercentages,
                                [taste]: parseInt(e.target.value),
                              },
                            })
                          }
                          className="w-full px-2 py-1 rounded text-sm"
                          style={{ backgroundColor: '#333', color: '#FFFFFF', border: '1px solid #00FF00' }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Time Slot Recommendations */}
                  <div className="mt-6 border-t pt-4" style={{ borderColor: '#FFFF00' }}>
                    <button
                      onClick={() => toggleTimeSlots(ritu.id)}
                      className="w-full flex items-center justify-between p-3 rounded mb-4"
                      style={{ backgroundColor: 'rgba(255, 255, 0, 0.1)', color: '#FFFF00' }}
                    >
                      <span className="font-bold">⏰ Time Slot Recommendations (4 AM - 4 AM)</span>
                      {expandedTimeSlots[ritu.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {expandedTimeSlots[ritu.id] && editData?.timeSlotRecommendations && (
                      <div className="space-y-4">
                        {editData.timeSlotRecommendations.map((slot, idx) => (
                          <div key={idx} className="p-4 rounded" style={{ backgroundColor: 'rgba(255, 255, 0, 0.05)', border: '1px solid #333' }}>
                            <div className="flex items-center justify-between mb-3">
                              <span style={{ color: '#FFFF00' }} className="font-semibold">{slot.time}</span>
                              <button
                                onClick={() => deleteTimeSlot(idx)}
                                style={{ color: '#FF6B6B' }}
                                className="p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <label style={{ color: '#FFFF00' }} className="text-xs font-semibold block mb-1">
                                  Meal Description
                                </label>
                                <textarea
                                  value={slot.description}
                                  onChange={(e) => updateTimeSlot(idx, 'description', e.target.value)}
                                  className="w-full px-2 py-1 rounded text-sm"
                                  rows={2}
                                  style={{ backgroundColor: '#333', color: '#FFFFFF', border: '1px solid #FFFF00' }}
                                  placeholder="Describe the recommended meal..."
                                />
                              </div>

                              <div>
                                <LifePlannerImageUpload
                                  label="Image"
                                  currentImageUrl={slot.imageUrl}
                                  onImageUrlChange={(url) => updateTimeSlot(idx, 'imageUrl', url)}
                                />
                              </div>

                              <div>
                                <label style={{ color: '#FFFF00' }} className="text-xs font-semibold block mb-1">
                                  Video URL
                                </label>
                                <input
                                  type="text"
                                  value={slot.videoUrl || ''}
                                  onChange={(e) => updateTimeSlot(idx, 'videoUrl', e.target.value)}
                                  className="w-full px-2 py-1 rounded text-sm"
                                  style={{ backgroundColor: '#333', color: '#FFFFFF', border: '1px solid #FFFF00' }}
                                  placeholder="https://..."
                                />
                              </div>

                              <div>
                                <label style={{ color: '#FFFF00' }} className="text-xs font-semibold block mb-1">
                                  PDF URL
                                </label>
                                <input
                                  type="text"
                                  value={slot.pdfUrl || ''}
                                  onChange={(e) => updateTimeSlot(idx, 'pdfUrl', e.target.value)}
                                  className="w-full px-2 py-1 rounded text-sm"
                                  style={{ backgroundColor: '#333', color: '#FFFFFF', border: '1px solid #FFFF00' }}
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    className="w-full px-4 py-2 rounded font-bold flex items-center justify-center gap-2 mt-4"
                    style={{ backgroundColor: '#00FF00', color: '#1a1a1a' }}
                  >
                    <Save size={20} /> Save Changes
                  </button>
                </div>
              ) : (
                // View Mode
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold" style={{ color: '#00FF00', fontFamily: "'Noto Sans Devanagari', serif" }}>
                        {rituEmojis[ritu.id]} {ritu.nameEn}
                      </h3>
                      <p style={{ color: '#AAAAAA' }} className="text-sm">
                        {ritu.nameHi}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center relative">
                      <button
                        onClick={() => setQuickAddOpen(quickAddOpen === ritu.id ? null : ritu.id)}
                        className="p-2 rounded"
                        style={{ backgroundColor: 'rgba(0, 255, 0, 0.2)', color: '#00FF00' }}
                        title="Quick add media"
                      >
                        <Plus size={20} />
                      </button>

                      {quickAddOpen === ritu.id && (
                        <div
                          className="absolute right-0 top-12 rounded-lg shadow-lg z-50"
                          style={{ backgroundColor: '#2a2a2a', border: '2px solid #00FF00', minWidth: '200px' }}
                        >
                          <button
                            onClick={() => {
                              handleEdit(ritu);
                              setQuickAddOpen(null);
                              setTimeout(() => document.querySelector(`[data-ritu="${ritu.id}"]`)?.scrollIntoView({ behavior: 'smooth' }), 100);
                            }}
                            className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-700 text-left"
                            style={{ color: '#FFFFFF', borderBottom: '1px solid #333' }}
                          >
                            <Type size={16} /> Add Text
                          </button>
                          <button
                            onClick={() => {
                              handleEdit(ritu);
                              setQuickAddOpen(null);
                            }}
                            className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-700 text-left"
                            style={{ color: '#FFFFFF', borderBottom: '1px solid #333' }}
                          >
                            <Image size={16} /> Add Image
                          </button>
                          <button
                            onClick={() => {
                              handleEdit(ritu);
                              setQuickAddOpen(null);
                            }}
                            className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-700 text-left"
                            style={{ color: '#FFFFFF', borderBottom: '1px solid #333' }}
                          >
                            <Video size={16} /> Add Video
                          </button>
                          <button
                            onClick={() => {
                              handleEdit(ritu);
                              setQuickAddOpen(null);
                            }}
                            className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-700 text-left"
                            style={{ color: '#FFFFFF' }}
                          >
                            <FileText size={16} /> Add PDF
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => handleEdit(ritu)}
                        className="p-2 rounded"
                        style={{ backgroundColor: 'rgba(255, 255, 0, 0.2)', color: '#FFFF00' }}
                      >
                        <Edit2 size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm" style={{ color: '#FFFFFF' }}>
                    <div>
                      <p style={{ color: '#FFFFFF' }} className="font-semibold">
                        🌡️ Temperature: {ritu.tempRange}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#FFFFFF' }} className="font-semibold">
                        💧 Humidity: {ritu.humidity}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: '#FFFFFF' }} className="font-semibold mb-2">
                        ⚡ Dosha Imbalance:
                      </p>
                      <div className="grid grid-cols-3 gap-2 ml-4">
                        <p style={{ color: '#FFFFFF' }}>Vata: {ritu.doshaImbalance.vata}%</p>
                        <p style={{ color: '#FFFFFF' }}>Pitta: {ritu.doshaImbalance.pitta}%</p>
                        <p style={{ color: '#FFFFFF' }}>Kapha: {ritu.doshaImbalance.kapha}%</p>
                      </div>
                    </div>
                    <div>
                      <p style={{ color: '#FFFFFF' }} className="font-semibold mb-2">
                        🎯 Recommended Rasas:
                      </p>
                      <div className="grid grid-cols-3 gap-2 ml-4 text-xs">
                        {Object.entries(ritu.recommendedPercentages).map(([taste, value]) => (
                          <p key={taste} style={{ color: '#FFFFFF' }}>
                            {taste}: <span style={{ color: '#FFFFFF' }}>{value}%</span>
                          </p>
                        ))}
                      </div>
                    </div>
                    {ritu.timeSlotRecommendations && ritu.timeSlotRecommendations.some(slot => slot.description) && (
                      <div>
                        <p style={{ color: '#FFFFFF' }} className="font-semibold mb-2">
                          ⏰ Time-based Meals:
                        </p>
                        <div className="ml-4 text-xs space-y-2">
                          {ritu.timeSlotRecommendations.map((slot, idx) =>
                            slot.description ? (
                              <div key={idx} style={{ color: '#FFFFFF' }}>
                                <span style={{ color: '#FFFF00' }}>{slot.time}</span>: {slot.description.substring(0, 60)}...
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div
          className="mt-8 p-6 rounded-lg"
          style={{
            border: '2px solid #00FF00',
            backgroundColor: 'rgba(0, 255, 0, 0.1)',
          }}
        >
          <p style={{ color: '#00FF00', fontFamily: "'Noto Sans Devanagari', serif" }} className="font-semibold mb-2">
            💡 Tips for Editing Ritus:
          </p>
          <ul style={{ color: '#AAAAAA' }} className="text-sm space-y-1 ml-4">
            <li>• Temperature Range: Use format like "32-45°C" for the expected temperature</li>
            <li>• Humidity: Use format like "10-20%" for the expected humidity range</li>
            <li>• Dosha Imbalance: Should add up to 100% total</li>
            <li>• Recommended Rasas: Should add up to 100% total for proper nutrition balance</li>
            <li>• Changes will help the system detect the correct season based on your location's weather</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
