'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, Print, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface Vision {
  id: string;
  title: string;
  description?: string;
  date?: string;
}

interface Milestone {
  id: string;
  title: string;
  visionId: string;
}

interface Goal {
  id: string;
  title: string;
  visionId?: string;
}

interface Task {
  id: string;
  title: string;
  completed?: boolean;
}

interface Todo {
  id: string;
  title: string;
  completed?: boolean;
}

interface Reminder {
  id: string;
  title: string;
  dueDate?: string;
}

interface Word {
  id: string;
  title: string;
}

interface DiamondPeople {
  id: string;
  name: string;
}

export default function VisionDownloadPage() {
  const [visions, setVisions] = useState<Vision[]>([]);
  const [selectedVisionId, setSelectedVisionId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    milestones: true,
    goals: true,
    tasks: true,
    todos: true,
    reminders: true,
    words: true,
    diamond: true,
  });
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load visions from localStorage
    const storedVisions = JSON.parse(localStorage.getItem('lifePlannerVision') || '[]');
    setVisions(storedVisions);
    
    if (storedVisions.length > 0 && !selectedVisionId) {
      setSelectedVisionId(storedVisions[0].id);
    }
  }, []);

  const selectedVision = visions.find(v => v.id === selectedVisionId);

  // Load related data
  const milestones = selectedVision
    ? (JSON.parse(localStorage.getItem('lifePlannerMilestones') || '[]') as Milestone[]).filter(
        m => m.visionId === selectedVision.id
      )
    : [];

  const goals = JSON.parse(localStorage.getItem('lifePlannerGoals') || '[]') as Goal[];
  const tasks = JSON.parse(localStorage.getItem('lifePlannerTasks') || '[]') as Task[];
  const todos = JSON.parse(localStorage.getItem('lifePlannerTodos') || '[]') as Todo[];
  const reminders = JSON.parse(localStorage.getItem('lifePlannerReminders') || '[]') as Reminder[];
  const words = JSON.parse(localStorage.getItem('lifePlannerWords') || '[]') as Word[];
  const diamondPeople = JSON.parse(localStorage.getItem('lifePlannerDiamondPeople') || '[]') as DiamondPeople[];

  const completionStats = {
    tasksCompleted: tasks.filter(t => t.completed).length,
    tasksTotal: tasks.length,
    todosCompleted: todos.filter(t => t.completed).length,
    todosTotal: todos.length,
    completionPercentage: tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0,
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const downloadPDF = () => {
    if (!pdfRef.current) return;

    const element = pdfRef.current;
    const opt = {
      margin: 10,
      filename: `${selectedVision?.title || 'Vision'}-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
    };

    html2pdf().set(opt).from(element).save();
  };

  const printPage = () => {
    window.print();
  };

  if (!selectedVision) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-swar-text-secondary">No visions found. Create one to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-swar-primary">Vision Details & Download</h1>
          <p className="text-sm text-swar-text-secondary mt-1">View and download complete vision hierarchy</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-swar-primary text-white rounded-lg hover:bg-swar-primary-dark transition font-semibold"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
          <button
            onClick={printPage}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-semibold"
          >
            <Print size={18} />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Vision Selector */}
      <div className="bg-white rounded-2xl p-4 border border-swar-border">
        <label className="block text-sm font-semibold text-swar-text mb-2">Select Vision:</label>
        <select
          value={selectedVisionId || ''}
          onChange={(e) => setSelectedVisionId(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-swar-border focus:outline-none focus:ring-2 focus:ring-swar-primary"
        >
          {visions.map(v => (
            <option key={v.id} value={v.id}>
              {v.title}
            </option>
          ))}
        </select>
      </div>

      {/* PDF Content */}
      <div ref={pdfRef} className="bg-white rounded-2xl p-6 border border-swar-border space-y-8 print:border-0 print:rounded-0 print:p-0">
        {/* Vision Header */}
        <div className="border-b-4 border-swar-primary pb-6">
          <h1 className="text-4xl font-bold text-swar-primary mb-3">{selectedVision.title}</h1>
          {selectedVision.description && (
            <p className="text-lg text-swar-text-secondary mb-3">{selectedVision.description}</p>
          )}
          {selectedVision.date && (
            <p className="text-sm text-swar-text-secondary">Created: {new Date(selectedVision.date).toLocaleDateString()}</p>
          )}
        </div>

        {/* Progress Section */}
        <div className="bg-gradient-to-r from-swar-primary-light to-blue-50 rounded-xl p-6 border border-swar-primary">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-6 w-6 text-swar-primary" />
            <h2 className="text-2xl font-bold text-swar-primary">Progress</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs font-semibold text-swar-text-secondary uppercase">Tasks Completed</p>
              <p className="text-3xl font-bold text-swar-primary mt-2">
                {completionStats.tasksCompleted}/{completionStats.tasksTotal}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs font-semibold text-swar-text-secondary uppercase">Overall Progress</p>
              <p className="text-3xl font-bold text-swar-primary mt-2">{completionStats.completionPercentage}%</p>
            </div>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-swar-primary to-blue-500 h-4 rounded-full transition-all"
              style={{ width: `${completionStats.completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Development/Improvement Section */}
        <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
          <h2 className="text-2xl font-bold text-orange-700 mb-4">📈 Development & Areas to Improve</h2>
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
              <h3 className="font-semibold text-swar-text">1. Current Strengths</h3>
              <p className="text-sm text-swar-text-secondary mt-1">
                {tasks.length > 0 ? `${completionStats.completionPercentage}% of tasks completed - Good momentum!` : 'No tasks tracked yet.'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
              <h3 className="font-semibold text-swar-text">2. Areas for Improvement</h3>
              <p className="text-sm text-swar-text-secondary mt-1">
                Focus on completing pending tasks and increasing accountability through reminders and milestones.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
              <h3 className="font-semibold text-swar-text">3. Next Steps</h3>
              <p className="text-sm text-swar-text-secondary mt-1">
                Set milestones, break down goals into actionable tasks, and review progress weekly.
              </p>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div>
          <h2 className="text-2xl font-bold text-swar-primary mb-4">⭐ Milestones ({milestones.length})</h2>
          {milestones.length > 0 ? (
            <div className="space-y-2">
              {milestones.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg border border-pink-200">
                  <div className="w-2 h-2 bg-pink-500 rounded-full flex-shrink-0" />
                  <p className="text-sm text-swar-text">{m.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-swar-text-secondary italic">No milestones added yet.</p>
          )}
        </div>

        {/* Goals */}
        <div>
          <h2 className="text-2xl font-bold text-swar-primary mb-4">🏆 Goals ({goals.length})</h2>
          {goals.length > 0 ? (
            <div className="space-y-2">
              {goals.map(g => (
                <div key={g.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  <p className="text-sm text-swar-text">{g.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-swar-text-secondary italic">No goals added yet.</p>
          )}
        </div>

        {/* Tasks */}
        <div>
          <h2 className="text-2xl font-bold text-swar-primary mb-4">✅ Tasks ({tasks.length})</h2>
          {tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <input type="checkbox" checked={t.completed} disabled className="w-4 h-4" />
                  <p className={`text-sm ${t.completed ? 'line-through text-gray-400' : 'text-swar-text'}`}>
                    {t.title}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-swar-text-secondary italic">No tasks added yet.</p>
          )}
        </div>

        {/* Todos */}
        <div>
          <h2 className="text-2xl font-bold text-swar-primary mb-4">📋 Todos ({todos.length})</h2>
          {todos.length > 0 ? (
            <div className="space-y-2">
              {todos.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <input type="checkbox" checked={t.completed} disabled className="w-4 h-4" />
                  <p className={`text-sm ${t.completed ? 'line-through text-gray-400' : 'text-swar-text'}`}>
                    {t.title}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-swar-text-secondary italic">No todos added yet.</p>
          )}
        </div>

        {/* Reminders */}
        <div>
          <h2 className="text-2xl font-bold text-swar-primary mb-4">🔔 Reminders ({reminders.length})</h2>
          {reminders.length > 0 ? (
            <div className="space-y-2">
              {reminders.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                  <p className="text-sm text-swar-text">{r.title}</p>
                  {r.dueDate && <span className="text-xs text-swar-text-secondary ml-auto">{new Date(r.dueDate).toLocaleDateString()}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-swar-text-secondary italic">No reminders added yet.</p>
          )}
        </div>

        {/* Words */}
        <div>
          <h2 className="text-2xl font-bold text-swar-primary mb-4">📝 Words ({words.length})</h2>
          {words.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {words.map(w => (
                <div key={w.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-semibold text-swar-text">{w.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-swar-text-secondary italic">No words added yet.</p>
          )}
        </div>

        {/* Diamond People */}
        <div>
          <h2 className="text-2xl font-bold text-swar-primary mb-4">👥 Diamond People ({diamondPeople.length})</h2>
          {diamondPeople.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {diamondPeople.map(d => (
                <div key={d.id} className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-sm font-semibold text-swar-text text-center">{d.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-swar-text-secondary italic">No diamond people added yet.</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-4 border-swar-primary pt-6 mt-8 text-center text-xs text-swar-text-secondary">
          <p>Generated on {new Date().toLocaleDateString()} • Vision Planner</p>
        </div>
      </div>
    </div>
  );
}
