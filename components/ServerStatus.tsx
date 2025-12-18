'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface ServerStatusProps {
  className?: string;
}

const ServerStatus: React.FC<ServerStatusProps> = ({ className = '' }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Check server connection on mount and periodically
  useEffect(() => {
    checkServerHealth();
    const interval = setInterval(checkServerHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkServerHealth = async () => {
    try {
      // Try a simple API call to check if server is running
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
      });
      setIsConnected(response.ok);
    } catch (error) {
      // If no health endpoint, try a common endpoint as fallback
      try {
        const fallbackResponse = await fetch('/api/workshops/list', {
          method: 'GET',
          cache: 'no-store',
        });
        setIsConnected(fallbackResponse.ok);
      } catch {
        setIsConnected(false);
      }
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await checkServerHealth();
    setIsLoading(false);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status Indicator */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-swar-primary-light border border-swar-border">
        {/* Color dot */}
        <div
          className={`w-3 h-3 rounded-full transition-all ${
            isConnected ? 'bg-swar-primary-light0 animate-pulse' : 'bg-red-500'
          }`}
        />

        {/* Status text */}
        <span className={`text-sm font-medium ${isConnected ? 'text-swar-primary' : 'text-red-700'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          title="Refresh server connection"
          className="ml-2 p-1 text-swar-text-secondary hover:text-swar-text hover:bg-swar-primary-light rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            size={16}
            className={`transition-transform ${isLoading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>
    </div>
  );
};

export default ServerStatus;
