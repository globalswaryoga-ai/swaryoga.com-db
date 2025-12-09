import { useState, useEffect } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { testConnection } from '../utils/database';

const DatabaseStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    checkConnection();
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      // Check MongoDB backend connection
      const response = await fetch('http://localhost:4000/api/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => null);

      setIsConnected(response?.ok ?? false);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!isChecking) {
      await checkConnection();
    }
  };

  // Determine colors based on status
  const getStatusColor = () => {
    if (isConnected === null) {
      return 'bg-gray-100 text-gray-700';
    }
    if (isConnected) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    if (isConnected) {
      return <Database className="h-4 w-4 text-green-600" />;
    }
    return <Database className="h-4 w-4 text-yellow-600" />;
  };

  const getStatusText = () => {
    if (isChecking) {
      return 'Checking...';
    }
    if (isConnected) {
      return '🟢 MongoDB Connected';
    }
    return '🟡 Offline';
  };

  const getTooltip = () => {
    if (isConnected) {
      return 'Database is connected and online. Data is saving to MongoDB.';
    }
    return 'Database is offline. Data is saving to browser storage (localStorage).';
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
      <div
        className={`flex items-center space-x-2 px-3 py-1.5 sm:py-2 rounded-full text-xs font-medium transition-all cursor-help ${getStatusColor()}`}
        title={getTooltip()}
      >
        {getStatusIcon()}
        <span className="hidden sm:inline">{getStatusText()}</span>
        <span className="sm:hidden">{isConnected ? '🟢' : '🟡'}</span>
        
        <button
          onClick={handleManualRefresh}
          disabled={isChecking}
          className="ml-2 p-1 hover:opacity-70 rounded transition-opacity"
          title="Refresh status"
          aria-label="Refresh database status"
        >
          <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {lastChecked && (
        <div className="text-xs text-gray-500 hidden md:block">
          Last check: {lastChecked.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default DatabaseStatus;
