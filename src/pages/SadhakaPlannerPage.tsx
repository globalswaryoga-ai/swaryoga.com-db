import React, { useState, useEffect } from 'react';
import {
  Target, CheckSquare, Milestone as MilestoneIcon, ListTodo, Heart, Bell,
  Calendar, TrendingUp, Plus, Edit2, Trash2, AlertCircle, CheckCircle,
  Clock, AlertTriangle, Download, Share2, RefreshCw, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  visionAPI, goalAPI, milestoneAPI, taskAPI, myWordAPI,
  todoAPI, reminderAPI, dailyPlanAPI, healthTrackerAPI,
  isOverdue, daysUntilDue, formatDate,
  Vision, Goal, Milestone, Task, MyWord, Todo, Reminder, DailyPlan, HealthTracker
} from '../utils/sadhakaPlannerData';
import TasksComponent from '../components/TasksComponent';
import MyWordComponent from '../components/MyWordComponent';
import VisionComponent from '../components/VisionComponent';
import GoalsComponent from '../components/GoalsComponent';
import MilestonesComponent from '../components/MilestonesComponent';
import TodosComponent from '../components/TodosComponent';
import DailyPlanComponent from '../components/DailyPlanComponent';
import HealthTrackerComponent from '../components/HealthTrackerComponent';
import RemindersComponent from '../components/RemindersComponent';

const SadhakaPlannerPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline'>('offline');

  // Data states
  const [visions, setVisions] = useState<Vision[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myWords, setMyWords] = useState<MyWord[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [todaysPlan, setTodaysPlan] = useState<DailyPlan | null>(null);
  const [healthData, setHealthData] = useState<HealthTracker | null>(null);

  // Overdue items
  const [overdueItems, setOverdueItems] = useState<{ tasks: Task[]; commitments: MyWord[] }>({
    tasks: [],
    commitments: []
  });
  const [showOverdueAlert, setShowOverdueAlert] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
  }, [user, navigate]);

  // Load all data
  useEffect(() => {
    const userId = user?.id || (user as any)?._id;
    if (userId) {
      loadAllData();
      const interval = setInterval(loadAllData, 120000); // 2 minutes
      return () => clearInterval(interval);
    }
  }, [user?.id, (user as any)?._id]);

  // Health check for server and database
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const envUrl = (import.meta as any).env?.VITE_API_URL;
        const baseUrl = envUrl ? envUrl.replace('/api', '') : 'http://localhost:4000';
        const response = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          setServerStatus('online');
        } else {
          setServerStatus('offline');
        }
      } catch (error) {
        setServerStatus('offline');
      }
    };

    // Check health immediately and then every 30 seconds
    checkServerHealth();
    const healthInterval = setInterval(checkServerHealth, 30000);
    return () => clearInterval(healthInterval);
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      let userId = user?.id || (user as any)?._id || '';
      
      // If userId not found in context, try to get it from localStorage
      if (!userId) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const userObj = JSON.parse(userStr);
            userId = userObj.id || userObj._id || '';
            console.log(`✅ Got userId from localStorage: ${userId}`);
          } catch (e) {
            console.error('Error parsing user from localStorage:', e);
          }
        }
      }
      
      if (!userId) {
        console.warn('❌ No userId found in context or localStorage');
        setLoading(false);
        return;
      }
      
      console.log(`📥 Loading data for userId: ${userId}`);

      const [
        visionsData,
        goalsData,
        milestonesData,
        tasksData,
        myWordsData,
        todosData,
        remindersData,
        planData,
        healthData
      ] = await Promise.all([
        visionAPI.getAll(userId),
        goalAPI.getAll(userId),
        milestoneAPI.getAll(userId),
        taskAPI.getAll(userId),
        myWordAPI.getAll(userId),
        todoAPI.getAll(userId),
        reminderAPI.getAll(userId),
        dailyPlanAPI.getByDate(userId, new Date().toISOString().split('T')[0]),
        healthTrackerAPI.getByDate(userId, new Date().toISOString().split('T')[0])
      ]);

      setVisions(visionsData || []);
      setGoals(goalsData || []);
      setMilestones(milestonesData || []);
      setTasks(tasksData || []);
      setMyWords(myWordsData || []);
      setTodos(todosData || []);
      setReminders(remindersData || []);
      setTodaysPlan(planData || null);
      setHealthData(healthData || null);

      const tasksArray = Array.isArray(tasksData) ? tasksData : [];
      const myWordsArray = Array.isArray(myWordsData) ? myWordsData : [];
      
      const overdueT = tasksArray.filter((t: Task) => isOverdue(t.dueDate) && t.status !== 'Completed');
      const overdueC = myWordsArray.filter((m: MyWord) => isOverdue(m.completionDeadline) && m.status !== 'Completed');

      if (overdueT.length > 0 || overdueC.length > 0) {
        setOverdueItems({ tasks: overdueT, commitments: overdueC });
        setShowOverdueAlert(true);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load planner data');
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading your Life Planner...</p>
        </div>
      </div>
    );
  }

  const tabsList = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'vision', label: '🎯 Vision' },
    { id: 'goals', label: '✓ Goals' },
    { id: 'milestones', label: '🏁 Milestones' },
    { id: 'tasks', label: '📋 Tasks' },
    { id: 'myword', label: '💬 My Word' },
    { id: 'todos', label: '☑️ Todos' },
    { id: 'daily', label: '📅 Daily Plan' },
    { id: 'health', label: '❤️ Health' },
    { id: 'reminders', label: '🔔 Reminders' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">🧘 Life Planner</h1>
              <p className="text-sm sm:text-base text-gray-600">Achieve your transformation journey with mindful planning</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto items-center">
              {/* Server Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border-2" title={`Server Status: ${serverStatus === 'online' ? 'All systems operational' : 'Server offline'}`}>
                <div className={`h-3 w-3 rounded-full ${serverStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-xs font-semibold text-gray-700 hidden sm:inline">
                  {serverStatus === 'online' ? 'Live' : 'Offline'}
                </span>
              </div>
              
              <button
                onClick={loadAllData}
                className="flex items-center justify-center gap-2 bg-green-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-600 flex-1 sm:flex-none text-sm sm:text-base"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Overdue Alert */}
        {showOverdueAlert && (overdueItems.tasks.length > 0 || overdueItems.commitments.length > 0) && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 mb-2">⚠️ Pending - Overdue Items</h3>
              {overdueItems.tasks.length > 0 && (
                <p className="text-sm text-red-700 mb-1">
                  🔴 {overdueItems.tasks.length} task(s) overdue
                </p>
              )}
              {overdueItems.commitments.length > 0 && (
                <p className="text-sm text-red-700">
                  🔴 {overdueItems.commitments.length} commitment(s) overdue
                </p>
              )}
            </div>
            <button
              onClick={() => setShowOverdueAlert(false)}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Dashboard Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Visions</p>
                <p className="text-3xl font-bold text-blue-600">{visions.length}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Goals</p>
                <p className="text-3xl font-bold text-purple-600">{goals.length}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Tasks Today</p>
                <p className="text-3xl font-bold text-green-600">
                  {tasks.filter(t => new Date(t.dueDate).toDateString() === new Date().toDateString()).length}
                </p>
              </div>
              <ListTodo className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Todos</p>
                <p className="text-3xl font-bold text-orange-600">
                  {todos.filter(t => !t.completed).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Main Tabs Section */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-1 p-2 bg-gray-100 border-b overflow-x-auto sm:overflow-visible">
            {tabsList.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t whitespace-nowrap transition-all flex-1 sm:flex-none min-w-max ${
                  activeTab === tab.id
                    ? 'bg-green-500 text-white border-b-2 border-green-600 shadow-sm'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6 min-h-96">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Today's Focus */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">📌 Today's Focus</h3>
                    <div className="space-y-2">
                      {tasks.filter(t => new Date(t.dueDate).toDateString() === new Date().toDateString() && t.status !== 'Completed').slice(0, 3).map(task => (
                        <div key={task.id} className="bg-white p-3 rounded flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}></div>
                          <div>
                            <p className="font-medium text-gray-800">{task.title}</p>
                            <p className="text-xs text-gray-500">Due: {formatDate(task.dueDate)}</p>
                          </div>
                        </div>
                      ))}
                      {tasks.filter(t => new Date(t.dueDate).toDateString() === new Date().toDateString()).length === 0 && (
                        <p className="text-gray-500 text-sm">No tasks for today</p>
                      )}
                    </div>
                  </div>

                  {/* My Commitments */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-purple-900 mb-4">💜 My Commitments</h3>
                    <div className="space-y-2">
                      {myWords.filter(m => m.status !== 'Completed').slice(0, 3).map(word => (
                        <div key={word.id} className="bg-white p-3 rounded">
                          <p className="font-medium text-gray-800">{word.commitment}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-gray-500" />
                            <p className="text-xs text-gray-500">Due: {formatDate(word.completionDeadline)}</p>
                            {isOverdue(word.completionDeadline) && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Overdue</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Progress Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {tasks.filter(t => t.status === 'Completed').length}
                      </p>
                      <p className="text-sm text-gray-600">Tasks Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {Math.round((goals.reduce((sum, g) => sum + g.progress, 0) / Math.max(goals.length, 1)))}%
                      </p>
                      <p className="text-sm text-gray-600">Avg Goal Progress</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {todos.filter(t => t.completed).length}/{todos.length}
                      </p>
                      <p className="text-sm text-gray-600">Todos Complete</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {myWords.filter(m => m.status === 'Completed').length}
                      </p>
                      <p className="text-sm text-gray-600">Commitments Met</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'vision' && (
              <VisionComponent onVisionsUpdate={(updatedVisions) => setVisions(updatedVisions)} />
            )}

            {activeTab === 'goals' && (
              <GoalsComponent onGoalsUpdate={(updatedGoals) => setGoals(updatedGoals)} />
            )}

            {activeTab === 'milestones' && (
              <MilestonesComponent />
            )}

            {activeTab === 'tasks' && (
              <TasksComponent onTasksUpdate={(updatedTasks) => setTasks(updatedTasks)} />
            )}

            {activeTab === 'myword' && (
              <MyWordComponent onMyWordsUpdate={(updatedWords) => setMyWords(updatedWords)} />
            )}

            {activeTab === 'todos' && (
              <TodosComponent />
            )}

            {activeTab === 'daily' && (
              <DailyPlanComponent />
            )}

            {activeTab === 'health' && (
              <HealthTrackerComponent />
            )}

            {activeTab === 'reminders' && (
              <RemindersComponent />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SadhakaPlannerPage;
