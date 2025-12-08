import React, { useState } from 'react';
import { 
  Calendar, 
  Target, 
  CheckSquare, 
  TrendingUp, 
  Heart, 
  Activity,
  Plus,
  Eye,
  Clock,
  Edit,
  Trash2,
  X,
  Bell,
  AlertCircle,
  Home,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  
  const [newVision, setNewVision] = useState({
    title: '',
    description: '',
    category: 'Health',
    imageUrl: '',
    estimatedTime: '',
    estimatedMoney: '',
    priority: 'Medium'
  });

  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    visionTitle: 'Health',
    startDate: '',
    endDate: '',
    priority: 'Medium',
    amountNeeded: ''
  });

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Stats Data
  const stats = {
    visions: { total: 10, working: 7, pending: 3 },
    goals: { total: 15, working: 9, pending: 6 },
    tasks: { total: 24, working: 16, pending: 8 },
    todos: { total: 12, working: 8, pending: 4 },
    myWord: { total: 5, working: 3, pending: 2 }
  };

  const monthHighlights = [
    { id: 1, text: 'Completed 3 major project milestones', type: 'achievement', icon: Target, color: 'text-green-600' },
    { id: 2, text: 'Maintained 85% workout consistency', type: 'health', icon: Activity, color: 'text-blue-600' },
    { id: 3, text: 'Increased savings by 15%', type: 'finance', icon: TrendingUp, color: 'text-emerald-600' },
    { id: 4, text: 'Read 2 personal development books', type: 'learning', icon: CheckSquare, color: 'text-purple-600' },
    { id: 5, text: 'Built stronger professional network', type: 'career', icon: Heart, color: 'text-pink-600' }
  ];

  const todoItems = [
    { 
      id: 1, 
      text: 'Review monthly budget and expenses', 
      completed: false, 
      priority: 'High', 
      category: 'Finance',
      reminder: true,
      reminderTime: '09:00',
      dueDate: '2024-01-20'
    },
    { 
      id: 2, 
      text: 'Schedule annual health checkup', 
      completed: true, 
      priority: 'Medium', 
      category: 'Health',
      reminder: false,
      dueDate: '2024-01-15'
    },
    { 
      id: 3, 
      text: 'Plan weekend family activities', 
      completed: false, 
      priority: 'Low', 
      category: 'Personal',
      reminder: true,
      reminderTime: '18:00',
      dueDate: '2024-01-18'
    },
    { 
      id: 4, 
      text: 'Update LinkedIn profile', 
      completed: false, 
      priority: 'Medium', 
      category: 'Career',
      reminder: true,
      reminderTime: '14:00',
      dueDate: '2024-01-22'
    },
    { 
      id: 5, 
      text: 'Organize digital photo collection', 
      completed: true, 
      priority: 'Low', 
      category: 'Personal',
      reminder: false,
      dueDate: '2024-01-10'
    },
    { 
      id: 6, 
      text: 'Research investment opportunities', 
      completed: false, 
      priority: 'High', 
      category: 'Finance',
      reminder: true,
      reminderTime: '11:00',
      dueDate: '2024-01-25'
    }
  ];

  const visionCategories = ['Health', 'Wealth', 'Success', 'Respect', 'Pleasure', 'Prosperity', 'Luxurious', 'Habit', 'Spirituality', 'About Life'];

  const handleAddVision = () => {
    if (newVision.title.trim() && newVision.description.trim()) {
      console.log('New vision created:', newVision);
      // Here you would typically save to your state management or API
      setNewVision({
        title: '',
        description: '',
        category: 'Health',
        imageUrl: '',
        estimatedTime: '',
        estimatedMoney: '',
        priority: 'Medium'
      });
      setShowVisionModal(false);
      // Show success message or update UI
      alert('Vision created successfully!');
    }
  };

  const handleAddGoal = () => {
    if (newGoal.title.trim() && newGoal.description.trim()) {
      console.log('New goal created:', newGoal);
      // Here you would typically save to your state management or API
      setNewGoal({
        title: '',
        description: '',
        visionTitle: 'Health',
        startDate: '',
        endDate: '',
        priority: 'Medium',
        amountNeeded: ''
      });
      setShowGoalModal(false);
      // Show success message or update UI
      alert('Goal created successfully!');
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && dueDate !== '';
  };

  const isDueToday = (dueDate: string) => {
    const today = new Date().toDateString();
    return new Date(dueDate).toDateString() === today;
  };

  const StatCard = ({ title, stats, icon: Icon, gradient, bg }: any) => (
    <div className={`${bg} rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 transform hover:scale-102`}>
      <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
        <div className={`p-1.5 sm:p-2 bg-gradient-to-r ${gradient} rounded-md sm:rounded-lg shadow-md`}>
          <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-gray-800">{title}</h3>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Total</span>
          <span className="text-sm sm:text-base font-bold text-gray-800">{stats.total}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Working</span>
          <span className="text-xs sm:text-sm font-semibold text-blue-600">{stats.working}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Pending</span>
          <span className="text-xs sm:text-sm font-semibold text-orange-600">{stats.pending}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 pb-20 sm:pb-6">
      {/* Mobile Safe Area Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6">
        
        {/* Header - Enhanced for Mobile */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white shadow-xl sm:shadow-2xl relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 opacity-10">
              <div className="w-40 h-40 bg-white rounded-full"></div>
            </div>
            <div className="absolute bottom-0 left-0 opacity-10">
              <div className="w-32 h-32 bg-white rounded-full"></div>
            </div>
            
            <div className="relative z-10">
              <h1 className="text-2xl sm:text-4xl font-black mb-2 sm:mb-3 leading-tight">
                🌅 Namaste, Sadhak!
              </h1>
              <p className="text-sm sm:text-lg text-indigo-100 font-medium">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-xs sm:text-sm text-indigo-200 mt-1 sm:mt-2">
                🕉️ "The journey of a thousand miles begins with a single breath"
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Navigation - Optimized for Mobile */}
        <div className="mb-4 sm:mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Link 
              to="/"
              className="flex flex-col items-center justify-center bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              <Home className="h-5 w-5 sm:h-6 sm:w-6 mb-1" />
              <span className="text-xs sm:text-sm font-semibold text-center">Home</span>
            </Link>
            
            <Link 
              to="/swar-calendar"
              className="flex flex-col items-center justify-center bg-gradient-to-br from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 mb-1" />
              <span className="text-xs sm:text-sm font-semibold text-center">Calendar</span>
            </Link>
            
            <button 
              onClick={() => setShowVisionModal(true)}
              className="flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              <Eye className="h-5 w-5 sm:h-6 sm:w-6 mb-1" />
              <span className="text-xs sm:text-sm font-semibold text-center">Vision</span>
            </button>
            
            <button 
              onClick={() => setShowGoalModal(true)}
              className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              <Target className="h-5 w-5 sm:h-6 sm:w-6 mb-1" />
              <span className="text-xs sm:text-sm font-semibold text-center">Goal</span>
            </button>
          </div>
        </div>

        {/* Stats Overview - Mobile Optimized */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
          <StatCard 
            title="Visions" 
            stats={stats.visions} 
            icon={Eye} 
            gradient="from-purple-500 to-indigo-600" 
            bg="bg-purple-50" 
          />
          <StatCard 
            title="Goals" 
            stats={stats.goals} 
            icon={Target} 
            gradient="from-blue-500 to-cyan-600" 
            bg="bg-blue-50" 
          />
          <StatCard 
            title="Tasks" 
            stats={stats.tasks} 
            icon={CheckSquare} 
            gradient="from-green-500 to-emerald-600" 
            bg="bg-green-50" 
          />
          <StatCard 
            title="To-Do's" 
            stats={stats.todos} 
            icon={CheckSquare} 
            gradient="from-orange-500 to-red-600" 
            bg="bg-orange-50" 
          />
          <StatCard 
            title="My Word" 
            stats={stats.myWord} 
            icon={Heart} 
            gradient="from-red-500 to-pink-600" 
            bg="bg-red-50" 
          />
        </div>

        {/* Running Month Highlights */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-black text-gray-800 mb-3 sm:mb-4">{currentMonth} Highlights ✨</h2>
          <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              {monthHighlights.map((highlight) => (
                <div key={highlight.id} className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-300 transform hover:scale-102">
                  <div className="p-2 sm:p-2.5 bg-white rounded-lg sm:rounded-xl shadow-sm flex-shrink-0">
                    <highlight.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${highlight.color}`} />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700 leading-snug">{highlight.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* To-Do Section with Reminders - Mobile Optimized */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-2xl font-black text-gray-800">Quick To-Do's 📋</h2>
            <button className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-xs sm:text-sm font-semibold">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Add To-Do</span>
            </button>
          </div>
          
          <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-lg border border-gray-100">
            <div className="space-y-2 sm:space-y-3 max-h-96 sm:max-h-none overflow-y-auto sm:overflow-visible">
              {todoItems.map((todo) => (
                <div key={todo.id} className={`group flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300 transform hover:scale-102 ${
                  isOverdue(todo.dueDate) && !todo.completed
                    ? 'bg-red-50 border-red-200 hover:shadow-md'
                    : isDueToday(todo.dueDate) && !todo.completed
                    ? 'bg-yellow-50 border-yellow-200 hover:shadow-md'
                    : 'bg-gray-50 border-gray-200 hover:shadow-md'
                }`}>
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 bg-white border-gray-300 rounded-lg focus:ring-purple-500 flex-shrink-0 mt-0.5 cursor-pointer"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start space-x-2 mb-1.5 sm:mb-2">
                      <p className={`text-xs sm:text-sm font-semibold break-words ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                        {todo.text}
                      </p>
                      {isOverdue(todo.dueDate) && !todo.completed && (
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      {isDueToday(todo.dueDate) && !todo.completed && (
                        <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="inline-block px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-blue-700 bg-blue-100 rounded-full">{todo.category}</span>
                      <span className={`inline-block px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full ${
                        todo.priority === 'High' ? 'bg-red-100 text-red-700' :
                        todo.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {todo.priority}
                      </span>
                      
                      {todo.dueDate && (
                        <span className={`inline-block text-[10px] sm:text-xs font-medium ${
                          isOverdue(todo.dueDate) && !todo.completed ? 'text-red-600 font-bold' :
                          isDueToday(todo.dueDate) && !todo.completed ? 'text-yellow-600 font-bold' :
                          'text-gray-600'
                        }`}>
                          📅 {new Date(todo.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      
                      {todo.reminder && (
                        <div className="flex items-center space-x-0.5 text-[10px] sm:text-xs text-indigo-600 font-semibold">
                          <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span>{todo.reminderTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="opacity-0 group-hover:opacity-100 flex space-x-1 transition-opacity flex-shrink-0">
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-300 transform hover:scale-110">
                      <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all duration-300 transform hover:scale-110">
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add Vision Modal */}
        {showVisionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 safe-area">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white">
                <h2 className="text-base sm:text-xl font-black text-gray-800">✨ Add New Vision</h2>
                <button
                  onClick={() => setShowVisionModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors transform hover:scale-110 active:scale-95"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">
                    Vision Title *
                  </label>
                  <input
                    type="text"
                    value={newVision.title}
                    onChange={(e) => setNewVision(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-xs sm:text-sm transition-all duration-300"
                    placeholder="Enter vision title..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={newVision.description}
                    onChange={(e) => setNewVision(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 resize-none text-xs sm:text-sm transition-all duration-300"
                    placeholder="Describe your vision..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">
                    Category
                  </label>
                  <select
                    value={newVision.category}
                    onChange={(e) => setNewVision(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-xs sm:text-sm transition-all duration-300"
                  >
                    {visionCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={newVision.imageUrl}
                    onChange={(e) => setNewVision(prev => ({ ...prev, imageUrl: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-xs sm:text-sm transition-all duration-300"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">
                      Estimated Time
                    </label>
                    <input
                      type="text"
                      value={newVision.estimatedTime}
                      onChange={(e) => setNewVision(prev => ({ ...prev, estimatedTime: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-xs sm:text-sm transition-all duration-300"
                      placeholder="e.g., 6 months"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">
                      Estimated Budget
                    </label>
                    <input
                      type="text"
                      value={newVision.estimatedMoney}
                      onChange={(e) => setNewVision(prev => ({ ...prev, estimatedMoney: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-xs sm:text-sm transition-all duration-300"
                      placeholder="e.g., $5,000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">
                    Priority Level
                  </label>
                  <select
                    value={newVision.priority}
                    onChange={(e) => setNewVision(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-xs sm:text-sm transition-all duration-300"
                  >
                    <option value="Low">🔵 Low Priority</option>
                    <option value="Medium">🟡 Medium Priority</option>
                    <option value="High">🔴 High Priority</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4 sm:pt-6">
                  <button
                    onClick={() => setShowVisionModal(false)}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-300 transform hover:scale-102 active:scale-95 text-xs sm:text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddVision}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg transform hover:scale-105 active:scale-95 text-xs sm:text-sm font-bold"
                  >
                    ✨ Add Vision
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Goal Modal */}
        {showGoalModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 safe-area">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white">
                <h2 className="text-base sm:text-xl font-black text-gray-800">🎯 Add New Goal</h2>
                <button
                  onClick={() => setShowGoalModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors transform hover:scale-110 active:scale-95"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">
                    Goal Title *
                  </label>
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-xs sm:text-sm transition-all duration-300"
                    placeholder="Enter goal title..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 resize-none text-xs sm:text-sm transition-all duration-300"
                    placeholder="Describe your goal..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">
                    Related Vision
                  </label>
                  <select
                    value={newGoal.visionTitle}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, visionTitle: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-xs sm:text-sm transition-all duration-300"
                  >
                    {visionCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newGoal.startDate}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-xs sm:text-sm transition-all duration-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={newGoal.endDate}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-xs sm:text-sm transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">
                      Budget Required
                    </label>
                    <input
                      type="text"
                      value={newGoal.amountNeeded}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, amountNeeded: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-xs sm:text-sm transition-all duration-300"
                      placeholder="e.g., $1,000"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-2">
                      Priority Level
                    </label>
                    <select
                      value={newGoal.priority}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-xs sm:text-sm transition-all duration-300"
                    >
                      <option value="Low">🔵 Low Priority</option>
                      <option value="Medium">🟡 Medium Priority</option>
                      <option value="High">🔴 High Priority</option>
                    </select>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 sm:pt-6">
                  <button
                    onClick={() => setShowGoalModal(false)}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-300 transform hover:scale-102 active:scale-95 text-xs sm:text-sm font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddGoal}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-white bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg transform hover:scale-105 active:scale-95 text-xs sm:text-sm font-bold"
                  >
                    🎯 Add Goal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;