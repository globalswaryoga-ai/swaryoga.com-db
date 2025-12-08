/**
 * Offline Status Indicator Component
 * Shows the user's network status and pending offline items
 */

import React from 'react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { WifiOff, Wifi, RefreshCw, AlertCircle } from 'lucide-react';

export const OfflineStatusIndicator: React.FC = () => {
  const { syncStatus, isOnline, pendingItems, failedItems } = useOfflineSync();

  // Don't show anything if online and no pending items
  if (isOnline && pendingItems === 0) {
    return null;
  }

  const lastSyncTime = syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleTimeString() : 'Never';

  return (
    <div className={`fixed bottom-4 right-4 rounded-lg shadow-lg p-4 max-w-xs ${
      isOnline ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'
    }`}>
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="flex-shrink-0 pt-1">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-blue-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-600" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Status Text */}
          <p className={`font-semibold text-sm ${isOnline ? 'text-blue-900' : 'text-red-900'}`}>
            {isOnline ? 'Connected' : 'Offline'}
          </p>

          {/* Pending Items */}
          {pendingItems > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              <RefreshCw className="inline w-3 h-3 mr-1" />
              {pendingItems} item{pendingItems !== 1 ? 's' : ''} pending sync
            </p>
          )}

          {/* Failed Items */}
          {failedItems > 0 && (
            <p className="text-xs text-red-600 mt-1">
              <AlertCircle className="inline w-3 h-3 mr-1" />
              {failedItems} item{failedItems !== 1 ? 's' : ''} failed
            </p>
          )}

          {/* Last Sync Time */}
          <p className="text-xs text-gray-500 mt-1">
            Last sync: {lastSyncTime}
          </p>
        </div>
      </div>

      {/* Help Text */}
      {!isOnline && (
        <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-200">
          Your data is being saved locally. It will automatically sync when you're back online.
        </p>
      )}
    </div>
  );
};

export default OfflineStatusIndicator;
