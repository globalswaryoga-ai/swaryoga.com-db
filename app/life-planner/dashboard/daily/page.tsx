'use client';

import { useEffect, useState } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';

interface DailyTodo {
  id: string;
  category: 'self' | 'family' | 'business' | 'parents' | 'friends' | 'service';
  title: string;
  completed: boolean;
  date: string;
}

interface RoutineItem {
  id: string;
  name: string;
  target: string;
  completed: boolean;
}

interface SadhanaItem {
  id: string;
  name: string;
  frequency: string;
  duration: string;
  completed: boolean;
}

export default function DailyViewPage() {
  const [today] = useState(new Date().toISOString().split('T')[0]);
  const [businessType, setBusinessType] = useState<'business' | 'work' | 'study' | 'home'>('business');
  
  const [todos, setTodos] = useState<DailyTodo[]>([]);
  const [routine, setRoutine] = useState<RoutineItem[]>([
    { id: '1', name: 'Pranayama', target: '2 times 5 mins', completed: false },
    { id: '2', name: 'Meditation', target: '1 time 15 mins', completed: false },
    { id: '3', name: 'Water', target: '3 liter', completed: false },
  ]);
  
  const [sadhana, setSadhana] = useState<SadhanaItem[]>([
    { id: '1', name: 'Pranayama', frequency: '2 times', duration: '5 minutes', completed: false },
    { id: '2', name: 'Meditation', frequency: '1 time', duration: '15 minutes', completed: false },
    { id: '3', name: 'Water', frequency: 'Daily', duration: '3 liter', completed: false },
  ]);
  
  const [newTodo, setNewTodo] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DailyTodo['category']>('self');
  const [vision, setVision] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  const categories = [
    { id: 'self', label: 'My Self', color: 'bg-blue-100 text-blue-700' },
    { id: 'family', label: 'My Family', color: 'bg-pink-100 text-pink-700' },
    { id: 'business', label: `My ${businessType.charAt(0).toUpperCase() + businessType.slice(1)}`, color: 'bg-green-100 text-green-700' },
    { id: 'parents', label: 'My Parents', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'friends', label: 'My Friends', color: 'bg-purple-100 text-purple-700' },
    { id: 'service', label: 'Social Service', color: 'bg-orange-100 text-orange-700' },
  ];

  useEffect(() => {
    loadTodos();
    loadRoutine();
    loadSadhana();
    loadVisionGoalsTasks();
  }, []);

  const loadTodos = () => {
    const stored = localStorage.getItem('dailyTodos');
    if (stored) {
      setTodos(JSON.parse(stored));
    }
  };

  const loadRoutine = () => {
    const stored = localStorage.getItem('dailyRoutine');
    if (stored) {
      setRoutine(JSON.parse(stored));
    }
  };

  const loadSadhana = () => {
    const stored = localStorage.getItem('dailySadhana');
    if (stored) {
      setSadhana(JSON.parse(stored));
    }
  };

  const loadVisionGoalsTasks = () => {
    const storedVision = localStorage.getItem('lifePlannerVision');
    const storedGoals = localStorage.getItem('lifePlannerGoals');
    const storedTasks = localStorage.getItem('lifePlannerTasks');
    
    if (storedVision) setVision(JSON.parse(storedVision));
    if (storedGoals) setGoals(JSON.parse(storedGoals));
    if (storedTasks) setTasks(JSON.parse(storedTasks));
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    
    const todo: DailyTodo = {
      id: Date.now().toString(),
      category: selectedCategory,
      title: newTodo,
      completed: false,
      date: today,
    };
    
    const updated = [...todos, todo];
    setTodos(updated);
    localStorage.setItem('dailyTodos', JSON.stringify(updated));
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(updated);
    localStorage.setItem('dailyTodos', JSON.stringify(updated));
  };

  const deleteTodo = (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    localStorage.setItem('dailyTodos', JSON.stringify(updated));
  };

  const toggleRoutine = (id: string) => {
    const updated = routine.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
    setRoutine(updated);
    localStorage.setItem('dailyRoutine', JSON.stringify(updated));
  };

  const toggleSadhana = (id: string) => {
    const updated = sadhana.map(s => s.id === id ? { ...s, completed: !s.completed } : s);
    setSadhana(updated);
    localStorage.setItem('dailySadhana', JSON.stringify(updated));
  };

  const getTodayItems = (items: any[], type: string) => {
    return items.filter(item => {
      const itemDate = item.date || item.dueDate || item.targetDate;
      return itemDate === today;
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-swar-text">Daily Planner</h1>
          <p className="text-sm text-swar-text-secondary mt-1">
            {new Date(today).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Top 3 Cards */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Card 1: My Today */}
        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-swar-primary">📅 My Today</h2>
            <span className="text-xs bg-swar-primary-light text-swar-primary px-3 py-1 rounded-full font-medium">
              {today}
            </span>
          </div>
          
          {/* Business Type Selector */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-swar-text-secondary mb-2">Business/Work Category:</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-swar-border text-sm focus:outline-none focus:ring-2 focus:ring-swar-primary"
            >
              <option value="business">Business</option>
              <option value="work">Work</option>
              <option value="study">Study</option>
              <option value="home">Home</option>
            </select>
          </div>

          {/* Categories */}
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {categories.map(cat => {
              const catTodos = todos.filter(t => t.category === cat.id);
              return (
                <div key={cat.id} className="border-l-4 border-swar-primary pl-3">
                  <h3 className="text-sm font-semibold text-swar-text mb-2">{cat.label}</h3>
                  <div className="space-y-1.5">
                    {catTodos.map(todo => (
                      <div key={todo.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => toggleTodo(todo.id)}
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                            todo.completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 hover:border-swar-primary'
                          }`}
                        >
                          {todo.completed && <Check size={14} className="text-white" />}
                        </button>
                        <span className={`text-xs sm:text-sm flex-grow ${todo.completed ? 'line-through text-gray-400' : 'text-swar-text'}`}>
                          {todo.title}
                        </span>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-red-50 rounded text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Todo Input */}
          <div className="border-t border-swar-border pt-3">
            <div className="flex gap-2 mb-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="flex-1 px-2 py-2 text-xs rounded border border-swar-border focus:outline-none focus:ring-2 focus:ring-swar-primary"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                placeholder="Add a task..."
                className="flex-1 px-3 py-2 text-xs rounded border border-swar-border focus:outline-none focus:ring-2 focus:ring-swar-primary"
              />
              <button
                onClick={addTodo}
                className="bg-swar-primary text-white px-3 py-2 rounded hover:bg-swar-primary-dark transition text-sm font-semibold flex-shrink-0"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: My Routine */}
        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition">
          <h2 className="text-lg sm:text-xl font-bold text-swar-primary mb-4">🔄 My Routine</h2>
          <div className="space-y-3">
            {routine.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-swar-primary-light transition">
                <button
                  onClick={() => toggleRoutine(item.id)}
                  className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition ${
                    item.completed
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 hover:border-swar-primary'
                  }`}
                >
                  {item.completed && <Check size={14} className="text-white" />}
                </button>
                <div className="flex-grow">
                  <p className={`text-sm font-semibold ${item.completed ? 'line-through text-gray-400' : 'text-swar-text'}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-swar-text-secondary mt-0.5">{item.target}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: My Sadhana */}
        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition">
          <h2 className="text-lg sm:text-xl font-bold text-swar-primary mb-4">🧘 My Sadhana</h2>
          <div className="space-y-3">
            {sadhana.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-swar-primary-light transition">
                <button
                  onClick={() => toggleSadhana(item.id)}
                  className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition ${
                    item.completed
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 hover:border-swar-primary'
                  }`}
                >
                  {item.completed && <Check size={14} className="text-white" />}
                </button>
                <div className="flex-grow">
                  <p className={`text-sm font-semibold ${item.completed ? 'line-through text-gray-400' : 'text-swar-text'}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-swar-text-secondary mt-0.5">
                    {item.frequency} • {item.duration}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom 3 Cards */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Card 4: My Today's Vision */}
        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition">
          <h2 className="text-lg sm:text-xl font-bold text-swar-primary mb-4">🎯 My Today's Vision</h2>
          <div className="space-y-2">
            {getTodayItems(vision, 'vision').length > 0 ? (
              getTodayItems(vision, 'vision').map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded hover:bg-swar-primary-light transition">
                  <div className="w-2 h-2 bg-swar-primary rounded-full flex-shrink-0 mt-1.5" />
                  <p className="text-sm text-swar-text">{item.title || item.name}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-swar-text-secondary italic">No visions scheduled for today</p>
            )}
          </div>
        </div>

        {/* Card 5: My Today's Goals */}
        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition">
          <h2 className="text-lg sm:text-xl font-bold text-swar-primary mb-4">🏆 My Today's Goals</h2>
          <div className="space-y-2">
            {getTodayItems(goals, 'goals').length > 0 ? (
              getTodayItems(goals, 'goals').map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded hover:bg-swar-primary-light transition">
                  <div className="w-2 h-2 bg-swar-accent rounded-full flex-shrink-0 mt-1.5" />
                  <p className="text-sm text-swar-text">{item.title || item.name}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-swar-text-secondary italic">No goals scheduled for today</p>
            )}
          </div>
        </div>

        {/* Card 6: My Today's Tasks & Reminders */}
        <div className="rounded-2xl sm:rounded-3xl border border-swar-border bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition">
          <h2 className="text-lg sm:text-xl font-bold text-swar-primary mb-4">✅ My Today's Tasks & Reminders</h2>
          <div className="space-y-2">
            {getTodayItems(tasks, 'tasks').length > 0 ? (
              getTodayItems(tasks, 'tasks').map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded hover:bg-swar-primary-light transition">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
                    item.completed ? 'bg-green-500' : 'bg-orange-500'
                  }`} />
                  <p className={`text-sm ${
                    item.completed ? 'line-through text-gray-400' : 'text-swar-text'
                  }`}>
                    {item.title || item.name}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-swar-text-secondary italic">No tasks scheduled for today</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
