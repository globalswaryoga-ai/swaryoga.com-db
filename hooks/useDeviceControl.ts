'use client';

import { useState, useEffect, useCallback } from 'react';

interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
}

interface ViolationData {
  violationId?: string;
  violationType: string;
  message: string;
  device1?: {
    deviceName: string;
    location: string;
    timestamp: Date | string;
  };
  device2?: {
    deviceName: string;
    location: string;
    timestamp: Date | string;
  };
}

// Generate a simple device fingerprint using browser properties
function generateFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    // @ts-expect-error - deviceMemory may not exist
    navigator.deviceMemory || 0,
  ];
  
  const fingerprint = components.join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36) + Date.now().toString(36).slice(-4);
}

// Detect browser name
function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Unknown Browser';
}

// Detect OS
function detectOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown OS';
}

// Detect device type
function detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  const ua = navigator.userAgent;
  if (/Tablet|iPad/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}

// Generate device name
function generateDeviceName(): string {
  return `${detectBrowser()} on ${detectOS()}`;
}

export function useDeviceControl() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [violation, setViolation] = useState<ViolationData | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize device info
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check for stored device ID or generate new one
    let storedId = localStorage.getItem('deviceId');
    if (!storedId) {
      storedId = generateFingerprint();
      localStorage.setItem('deviceId', storedId);
    }
    
    setDeviceInfo({
      deviceId: storedId,
      deviceName: generateDeviceName(),
      deviceType: detectDeviceType(),
      browser: detectBrowser(),
      os: detectOS(),
    });
    
    setLoading(false);
  }, []);

  // Register device with server
  const registerDevice = useCallback(async () => {
    if (!deviceInfo) return null;
    
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const response = await fetch('/api/devices/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deviceInfo),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          // Device limit exceeded
          return { error: 'device_limit', message: data.error };
        }
        return { error: 'failed', message: data.error };
      }
      
      setIsRegistered(true);
      
      // Check for violations
      if (data.data?.violation) {
        setViolation(data.data.violation);
      }
      
      return data.data;
      
    } catch (error) {
      console.error('Device registration failed:', error);
      return { error: 'network', message: 'Failed to register device' };
    }
  }, [deviceInfo]);

  // Start streaming a video
  const startStream = useCallback(async (videoId: string, communityId?: string) => {
    if (!deviceInfo) return { allowed: false, error: 'No device info' };
    
    const token = localStorage.getItem('token');
    if (!token) return { allowed: false, error: 'Not logged in' };
    
    try {
      const response = await fetch('/api/devices/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'start',
          deviceId: deviceInfo.deviceId,
          videoId,
          communityId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { allowed: false, error: data.error };
      }
      
      return { allowed: true };
      
    } catch (error) {
      console.error('Start stream failed:', error);
      return { allowed: false, error: 'Network error' };
    }
  }, [deviceInfo]);

  // Send heartbeat (call every 30s while video is playing)
  const sendHeartbeat = useCallback(async () => {
    if (!deviceInfo) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      await fetch('/api/devices/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'heartbeat',
          deviceId: deviceInfo.deviceId,
        }),
      });
    } catch (error) {
      console.error('Heartbeat failed:', error);
    }
  }, [deviceInfo]);

  // End streaming
  const endStream = useCallback(async () => {
    if (!deviceInfo) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      await fetch('/api/devices/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'end',
          deviceId: deviceInfo.deviceId,
        }),
      });
    } catch (error) {
      console.error('End stream failed:', error);
    }
  }, [deviceInfo]);

  // Get user's devices
  const getDevices = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return [];
    
    try {
      const response = await fetch('/api/devices', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      return data.data?.devices || [];
      
    } catch (error) {
      console.error('Get devices failed:', error);
      return [];
    }
  }, []);

  // Remove a device
  const removeDevice = useCallback(async (deviceId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      const response = await fetch(`/api/devices?deviceId=${deviceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.ok;
      
    } catch (error) {
      console.error('Remove device failed:', error);
      return false;
    }
  }, []);

  // Clear violation
  const clearViolation = useCallback(() => {
    setViolation(null);
  }, []);

  return {
    deviceInfo,
    violation,
    isRegistered,
    loading,
    registerDevice,
    startStream,
    sendHeartbeat,
    endStream,
    getDevices,
    removeDevice,
    clearViolation,
  };
}
