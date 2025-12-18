'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Heart, X, Activity } from 'lucide-react';

interface HealthData {
  height: number; // in cm
  weight: number; // in kg
  age: number;
  systolicBP: number; // Systolic blood pressure
  diastolicBP: number; // Diastolic blood pressure
  otherNotes: string;
}

export default function HealthTracker() {
  const [showModal, setShowModal] = useState(false);
  const [healthData, setHealthData] = useState<HealthData>({
    height: 170,
    weight: 70,
    age: 30,
    systolicBP: 120,
    diastolicBP: 80,
    otherNotes: '',
  });

  // Calculate BMR (Basal Metabolic Rate) using Harris-Benedict Formula
  const bmr = useMemo(() => {
    // Assuming male (can be extended to include gender option)
    // BMR = 88.362 + (13.397 × weight in kg) + (4.799 × height in cm) - (5.677 × age in years)
    if (!healthData.height || !healthData.weight || !healthData.age) return 0;
    const calculatedBMR =
      88.362 +
      13.397 * healthData.weight +
      4.799 * healthData.height -
      5.677 * healthData.age;
    return Math.round(calculatedBMR);
  }, [healthData.height, healthData.weight, healthData.age]);

  // Calculate BMI
  const bmi = useMemo(() => {
    if (!healthData.height || !healthData.weight) return 0;
    const heightInMeters = healthData.height / 100;
    const calculatedBMI = healthData.weight / (heightInMeters * heightInMeters);
    return (typeof calculatedBMI === 'number' && isFinite(calculatedBMI)) ? calculatedBMI.toFixed(1) : '0.0';
  }, [healthData.height, healthData.weight]);

  const getBMICategory = useCallback((bmiValue: number | string) => {
    const value = typeof bmiValue === 'string' ? parseFloat(bmiValue) : bmiValue;
    if (value < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
    if (value < 25) return { category: 'Normal', color: 'text-swar-primary' };
    if (value < 30) return { category: 'Overweight', color: 'text-orange-600' };
    return { category: 'Obese', color: 'text-red-600' };
  }, []);

  const bmiInfo = getBMICategory(bmi);

  const handleSave = useCallback(() => {
    // Save to localStorage
    localStorage.setItem('healthTracker', JSON.stringify(healthData));
    setShowModal(false);
  }, [healthData]);

  const handleLoad = useCallback(() => {
    const saved = localStorage.getItem('healthTracker');
    if (saved) {
      setHealthData(JSON.parse(saved));
    }
  }, []);

  // Load on mount
  useEffect(() => {
    handleLoad();
  }, [handleLoad]);

  return (
    <>
      {/* Health Tracker Button in Header */}
      <button
        onClick={() => setShowModal(true)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-swar-primary-light transition group"
        title="Health Tracker"
      >
        <Heart className="h-5 w-5 text-red-500" fill="currentColor" />
        <span className="text-sm font-medium text-swar-text">Health</span>
      </button>

      {/* Health Tracker Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-swar-accent to-swar-accent px-6 py-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <Activity className="h-6 w-6" />
                <h2 className="text-2xl font-bold">Health Tracker</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Health Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-lg bg-blue-50 p-4 text-center">
                  <p className="text-xs text-swar-text-secondary font-medium">Height</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{healthData.height}</p>
                  <p className="text-xs text-swar-text-secondary">cm</p>
                </div>
                <div className="rounded-lg bg-swar-primary-light p-4 text-center">
                  <p className="text-xs text-swar-text-secondary font-medium">Weight</p>
                  <p className="text-2xl font-bold text-swar-primary mt-2">{healthData.weight}</p>
                  <p className="text-xs text-swar-text-secondary">kg</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-4 text-center">
                  <p className="text-xs text-swar-text-secondary font-medium">Age</p>
                  <p className="text-2xl font-bold text-purple-600 mt-2">{healthData.age}</p>
                  <p className="text-xs text-swar-text-secondary">years</p>
                </div>
                <div className={`rounded-lg bg-orange-50 p-4 text-center`}>
                  <p className="text-xs text-swar-text-secondary font-medium">BMI</p>
                  <p className={`text-2xl font-bold mt-2 ${bmiInfo.color}`}>{bmi}</p>
                  <p className={`text-xs font-medium ${bmiInfo.color}`}>{bmiInfo.category}</p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border-2 border-swar-border bg-swar-primary-light p-4">
                  <p className="text-sm font-medium text-swar-text">BMR (Basal Metabolic Rate)</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{bmr}</p>
                  <p className="text-xs text-swar-text-secondary mt-1">kcal/day</p>
                </div>
                <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-swar-text">Blood Pressure</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {healthData.systolicBP}/{healthData.diastolicBP}
                  </p>
                  <p className="text-xs text-swar-text-secondary mt-1">mmHg</p>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-4 pt-4 border-t border-swar-border">
                <h3 className="font-semibold text-swar-text">Update Your Health Data</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      value={healthData.height}
                      onChange={(e) =>
                        setHealthData({
                          ...healthData,
                          height: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-swar-border px-4 py-2 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={healthData.weight}
                      onChange={(e) =>
                        setHealthData({
                          ...healthData,
                          weight: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-swar-border px-4 py-2 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">
                      Age (years)
                    </label>
                    <input
                      type="number"
                      value={healthData.age}
                      onChange={(e) =>
                        setHealthData({
                          ...healthData,
                          age: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-swar-border px-4 py-2 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                    />
                  </div>
                </div>

                {/* Blood Pressure */}
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-2">
                    Blood Pressure
                  </label>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={healthData.systolicBP}
                        onChange={(e) =>
                          setHealthData({
                            ...healthData,
                            systolicBP: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="Systolic"
                        className="w-full rounded-lg border border-swar-border px-4 py-2 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                    <span className="text-2xl font-bold text-swar-text-secondary">/</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={healthData.diastolicBP}
                        onChange={(e) =>
                          setHealthData({
                            ...healthData,
                            diastolicBP: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="Diastolic"
                        className="w-full rounded-lg border border-swar-border px-4 py-2 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-swar-text-secondary mt-1">e.g., 120/80 mmHg</p>
                </div>

                {/* Other Medical Notes */}
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-2">
                    Other Medical Notes
                  </label>
                  <textarea
                    value={healthData.otherNotes}
                    onChange={(e) =>
                      setHealthData({
                        ...healthData,
                        otherNotes: e.target.value,
                      })
                    }
                    placeholder="Any allergies, medications, or other health notes..."
                    className="w-full rounded-lg border border-swar-border px-4 py-3 text-swar-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-swar-border">
                <button
                  onClick={handleSave}
                  className="flex-1 rounded-lg bg-gradient-to-r from-swar-accent to-swar-accent px-4 py-3 text-white font-semibold hover:from-red-600 hover:to-pink-600 transition"
                >
                  Save Health Data
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-swar-border px-4 py-3 text-swar-text font-semibold hover:bg-swar-bg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
