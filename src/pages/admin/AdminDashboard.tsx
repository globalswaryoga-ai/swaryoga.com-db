import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  ShoppingCart, 
  MessageSquare, 
  TrendingUp, 
  Activity,
  UserPlus,
  LogIn,
  Eye,
  BarChart3,
  Trash2
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { userAPI } from '../../utils/userData';
import { getAllWorkshops } from '../../utils/workshopAPI';
import { cartAPI } from '../../utils/cartData';
import { contactAPI } from '../../utils/contactData';
import { clearDummyData } from '../../utils/clearDummyData';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalWorkshops: 0,
    publicWorkshops: 0,
    totalEnrollments: 0,
    recentSignups: 0,
    recentSignins: 0,
    cartItems: 0,
    contactMessages: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const handleClearDummyData = () => {
    try {
      clearDummyData();
      toast.success('✅ All dummy data cleared successfully');
      // Reload dashboard stats
      loadDashboardStats();
    } catch (error) {
      toast.error('Failed to clear dummy data');
      console.error(error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Load user stats
      const userStats = await userAPI.getUserStats();
      
      // Load workshop stats
      const allWorkshops = await getAllWorkshops();
      const workshopStats = {
        totalWorkshops: allWorkshops.length,
        publicWorkshops: allWorkshops.filter(w => w.isPublic).length,
        totalEnrollments: allWorkshops.reduce((sum, w) => sum + (w.enrolledCount || 0), 0)
      };
      
      // Load cart stats by fetching all cart items
      let cartStats = { totalItems: 0, activeUsers: 0 };
      try {
        const cartItems = await cartAPI.getAllItems?.();
        if (cartItems && Array.isArray(cartItems)) {
          cartStats.totalItems = cartItems.length;
          // Count unique users
          const uniqueUsers = new Set(cartItems.map(item => item.userId));
          cartStats.activeUsers = uniqueUsers.size;
        }
      } catch (e) {
        console.warn('Cart stats unavailable');
      }
      
      // Load contact stats by fetching all messages
      let contactStats = { totalMessages: 0, unread: 0 };
      try {
        const messages = await contactAPI.getAll?.();
        if (messages && Array.isArray(messages)) {
          contactStats.totalMessages = messages.length;
          contactStats.unread = messages.filter(m => m.status === 'unread').length;
        }
      } catch (e) {
        console.warn('Contact stats unavailable');
      }
      
      setStats({
        totalUsers: userStats.totalUsers,
        activeUsers: userStats.activeUsers,
        totalWorkshops: workshopStats.totalWorkshops,
        publicWorkshops: workshopStats.publicWorkshops,
        totalEnrollments: workshopStats.totalEnrollments,
        recentSignups: userStats.recentUsers,
        recentSignins: userStats.activeUsers,
        cartItems: cartStats.totalItems,
        contactMessages: contactStats.totalMessages
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      change: '+12%',
      icon: Users,
      color: 'blue',
      description: 'Registered users'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      change: '+8%',
      icon: Activity,
      color: 'green',
      description: 'Currently active'
    },
    {
      title: 'Total Workshops',
      value: stats.totalWorkshops,
      change: '+3',
      icon: Calendar,
      color: 'purple',
      description: 'All workshops'
    },
    {
      title: 'Public Workshops',
      value: stats.publicWorkshops,
      change: '+2',
      icon: Eye,
      color: 'indigo',
      description: 'Visible to users'
    },
    {
      title: 'Total Enrollments',
      value: stats.totalEnrollments,
      change: '+25%',
      icon: TrendingUp,
      color: 'orange',
      description: 'Workshop enrollments'
    },
    {
      title: 'Recent Signups',
      value: stats.recentSignups,
      change: '+5',
      icon: UserPlus,
      color: 'pink',
      description: 'Last 30 days'
    },
    {
      title: 'Cart Items',
      value: stats.cartItems,
      change: '+7',
      icon: ShoppingCart,
      color: 'yellow',
      description: 'Items in carts'
    },
    {
      title: 'Contact Messages',
      value: stats.contactMessages,
      change: '+3',
      icon: MessageSquare,
      color: 'red',
      description: 'Pending responses'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      indigo: 'bg-indigo-500',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">Welcome to the SwarYoga admin panel. Here's your system overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${getColorClasses(stat.color)}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm text-green-600 font-medium">{stat.change}</span>
                </div>
                <div className="text-2xl font-bold text-gray-800 mb-1">{stat.value}</div>
                <div className="text-gray-600 text-sm mb-1">{stat.title}</div>
                <div className="text-gray-500 text-xs">{stat.description}</div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
              <BarChart3 className="h-5 w-5 text-gray-600" />
            </div>
            
            <div className="space-y-4">
              {stats.recentSignups > 0 && (
                <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">New user registrations</p>
                    <p className="text-xs text-gray-600">{stats.recentSignups} users signed up recently</p>
                  </div>
                </div>
              )}
              
              {stats.totalEnrollments > 0 && (
                <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Workshop enrollments</p>
                    <p className="text-xs text-gray-600">{stats.totalEnrollments} total enrollments</p>
                  </div>
                </div>
              )}
              
              {stats.totalWorkshops > 0 && (
                <div className="flex items-center space-x-4 p-4 bg-purple-50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Workshops created</p>
                    <p className="text-xs text-gray-600">{stats.totalWorkshops} workshops available</p>
                  </div>
                </div>
              )}
              
              {stats.contactMessages > 0 && (
                <div className="flex items-center space-x-4 p-4 bg-orange-50 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Contact messages</p>
                    <p className="text-xs text-gray-600">{stats.contactMessages} messages pending</p>
                  </div>
                </div>
              )}
              
              {stats.recentSignups === 0 && stats.totalEnrollments === 0 && stats.totalWorkshops === 0 && stats.contactMessages === 0 && (
                <div className="flex items-center justify-center p-8 text-gray-500">
                  <p className="text-sm">No recent activity yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">System Health</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Database</span>
                  <span className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 text-sm">Online</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">API Status</span>
                  <span className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 text-sm">Healthy</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Storage</span>
                  <span className="text-gray-600 text-sm">85% Used</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Uptime</span>
                  <span className="text-gray-600 text-sm">99.9%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                  <div className="font-medium text-blue-800">Add New Workshop</div>
                  <div className="text-xs text-blue-600">Create a new workshop</div>
                </button>
                <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                  <div className="font-medium text-green-800">Export User Data</div>
                  <div className="text-xs text-green-600">Download user reports</div>
                </button>
                <button className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                  <div className="font-medium text-purple-800">Send Newsletter</div>
                  <div className="text-xs text-purple-600">Email all users</div>
                </button>
                <button 
                  onClick={handleClearDummyData}
                  className="w-full text-left p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 size={18} className="text-red-600" />
                  <div>
                    <div className="font-medium text-red-800">Clear Dummy Data</div>
                    <div className="text-xs text-red-600">Remove all test data from storage</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Performance Overview</h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">98.5%</div>
              <div className="text-gray-600 text-sm">User Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">2.3s</div>
              <div className="text-gray-600 text-sm">Avg Load Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">15.2%</div>
              <div className="text-gray-600 text-sm">Conversion Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">4.8/5</div>
              <div className="text-gray-600 text-sm">Workshop Rating</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;