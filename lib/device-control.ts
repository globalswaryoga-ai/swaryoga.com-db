// Device Control System - For preventing credential sharing
// Handles device fingerprinting, location detection, and violation checking

import { connectDB, UserDevice, DeviceViolation, DeviceSettings, ActiveStream } from './db';

// =====================================================
// Types
// =====================================================

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
}

export interface LocationInfo {
  city: string;
  state: string;
  country: string;
  lat?: number;
  lon?: number;
}

export interface ViolationCheckResult {
  hasViolation: boolean;
  violationType?: 'location_mismatch' | 'device_limit_exceeded' | 'concurrent_stream' | 'rapid_device_switch';
  severity?: 'warning' | 'moderate' | 'severe';
  message?: string;
  device1?: {
    deviceName: string;
    location: string;
    timestamp: Date;
  };
  device2?: {
    deviceName: string;
    location: string;
    timestamp: Date;
  };
}

// =====================================================
// IP Geolocation using free ip-api.com
// =====================================================

export async function getLocationFromIP(ip: string): Promise<LocationInfo | null> {
  try {
    // Skip for localhost/private IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return {
        city: 'Local',
        state: 'Local',
        country: 'Local',
      };
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country,lat,lon`);
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      city: data.city || 'Unknown',
      state: data.regionName || 'Unknown',
      country: data.country || 'Unknown',
      lat: data.lat,
      lon: data.lon,
    };
  } catch (error) {
    console.error('Failed to get location from IP:', error);
    return null;
  }
}

// =====================================================
// Device Settings Management
// =====================================================

export async function getDeviceSettings() {
  await connectDB();
  
  let settings = await DeviceSettings.findOne({ settingKey: 'default' });
  
  if (!settings) {
    // Create default settings
    settings = await DeviceSettings.create({
      settingKey: 'default',
      maxDevicesPerUser: 3,
      maxConcurrentStreams: 1,
      locationMismatchWindowMinutes: 60,
      enableLocationCheck: true,
      enableDeviceLimit: true,
      enableConcurrentStreamCheck: true,
      autoBlockOnViolations: 0,
      warningMessage: 'We detected suspicious activity on your account. Someone may be using your credentials. If this wasn\'t you, please change your password.',
    });
  }
  
  return settings;
}

export async function updateDeviceSettings(updates: Partial<{
  maxDevicesPerUser: number;
  maxConcurrentStreams: number;
  locationMismatchWindowMinutes: number;
  enableLocationCheck: boolean;
  enableDeviceLimit: boolean;
  enableConcurrentStreamCheck: boolean;
  autoBlockOnViolations: number;
  warningMessage: string;
}>, adminId: string) {
  await connectDB();
  
  const settings = await DeviceSettings.findOneAndUpdate(
    { settingKey: 'default' },
    { 
      ...updates, 
      updatedAt: new Date(),
      updatedBy: adminId,
    },
    { upsert: true, new: true }
  );
  
  return settings;
}

// =====================================================
// Device Registration & Management
// =====================================================

export async function registerDevice(
  userId: string,
  deviceInfo: DeviceInfo,
  ipAddress: string,
  location: LocationInfo | null
) {
  await connectDB();
  const settings = await getDeviceSettings();
  
  // Check if device already exists for this user
  const existingDevice = await UserDevice.findOne({
    userId,
    deviceId: deviceInfo.deviceId,
  });
  
  if (existingDevice) {
    // Update last active and location
    existingDevice.lastActive = new Date();
    existingDevice.ipAddress = ipAddress;
    if (location) {
      existingDevice.location = location;
    }
    await existingDevice.save();
    return { device: existingDevice, isNew: false, limitExceeded: false };
  }
  
  // Check device limit
  const deviceCount = await UserDevice.countDocuments({ userId, isBlocked: false });
  
  if (settings.enableDeviceLimit && deviceCount >= settings.maxDevicesPerUser) {
    // Log violation
    await DeviceViolation.create({
      userId,
      violationType: 'device_limit_exceeded',
      severity: 'warning',
      device1: {
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        location: location ? `${location.city}, ${location.state}` : 'Unknown',
        ipAddress,
        timestamp: new Date(),
      },
      message: `User attempted to register device #${deviceCount + 1}. Limit is ${settings.maxDevicesPerUser}.`,
    });
    
    return { device: null, isNew: false, limitExceeded: true };
  }
  
  // Register new device
  const newDevice = await UserDevice.create({
    userId,
    deviceId: deviceInfo.deviceId,
    deviceName: deviceInfo.deviceName,
    deviceType: deviceInfo.deviceType,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    ipAddress,
    location,
    lastActive: new Date(),
    registeredAt: new Date(),
  });
  
  return { device: newDevice, isNew: true, limitExceeded: false };
}

export async function getUserDevices(userId: string) {
  await connectDB();
  return UserDevice.find({ userId }).sort({ lastActive: -1 });
}

export async function removeDevice(userId: string, deviceId: string) {
  await connectDB();
  return UserDevice.findOneAndDelete({ userId, deviceId });
}

export async function blockDevice(deviceId: string, reason: string, adminId: string) {
  await connectDB();
  return UserDevice.findOneAndUpdate(
    { deviceId },
    {
      isBlocked: true,
      blockedAt: new Date(),
      blockedReason: reason,
    },
    { new: true }
  );
}

export async function unblockDevice(deviceId: string) {
  await connectDB();
  return UserDevice.findOneAndUpdate(
    { deviceId },
    {
      isBlocked: false,
      blockedAt: null,
      blockedReason: null,
    },
    { new: true }
  );
}

// =====================================================
// Violation Detection
// =====================================================

export async function checkForViolations(
  userId: string,
  currentDeviceId: string,
  currentDeviceName: string,
  currentLocation: LocationInfo | null,
  ipAddress: string
): Promise<ViolationCheckResult> {
  await connectDB();
  const settings = await getDeviceSettings();
  
  // Check if device is blocked
  const device = await UserDevice.findOne({ userId, deviceId: currentDeviceId });
  if (device?.isBlocked) {
    return {
      hasViolation: true,
      violationType: 'device_limit_exceeded',
      severity: 'severe',
      message: 'This device has been blocked. Please contact support.',
    };
  }
  
  // Location mismatch check
  if (settings.enableLocationCheck && currentLocation) {
    const windowMs = settings.locationMismatchWindowMinutes * 60 * 1000;
    const windowStart = new Date(Date.now() - windowMs);
    
    // Get other devices that were active in the time window
    const otherActiveDevices = await UserDevice.find({
      userId,
      deviceId: { $ne: currentDeviceId },
      lastActive: { $gte: windowStart },
      isBlocked: false,
    });
    
    for (const otherDevice of otherActiveDevices) {
      const otherLocation = otherDevice.location;
      
      // Check if states are different (different states within 1 hour = suspicious)
      if (otherLocation?.state && currentLocation.state && 
          otherLocation.state !== currentLocation.state &&
          otherLocation.state !== 'Local' && currentLocation.state !== 'Local') {
        
        // Create violation record
        const violation = await DeviceViolation.create({
          userId,
          violationType: 'location_mismatch',
          severity: 'warning',
          device1: {
            deviceId: otherDevice.deviceId,
            deviceName: otherDevice.deviceName,
            location: `${otherLocation.city}, ${otherLocation.state}`,
            ipAddress: otherDevice.ipAddress,
            timestamp: otherDevice.lastActive,
          },
          device2: {
            deviceId: currentDeviceId,
            deviceName: currentDeviceName,
            location: `${currentLocation.city}, ${currentLocation.state}`,
            ipAddress,
            timestamp: new Date(),
          },
          message: settings.warningMessage,
        });
        
        return {
          hasViolation: true,
          violationType: 'location_mismatch',
          severity: 'warning',
          message: settings.warningMessage,
          device1: {
            deviceName: otherDevice.deviceName,
            location: `${otherLocation.city}, ${otherLocation.state}`,
            timestamp: otherDevice.lastActive,
          },
          device2: {
            deviceName: currentDeviceName,
            location: `${currentLocation.city}, ${currentLocation.state}`,
            timestamp: new Date(),
          },
        };
      }
    }
  }
  
  return { hasViolation: false };
}

// =====================================================
// Stream Management (1 stream at a time)
// =====================================================

export async function startStream(
  userId: string,
  deviceId: string,
  videoId: string,
  communityId: string,
  ipAddress: string,
  location: LocationInfo | null
): Promise<{ allowed: boolean; existingStream?: { deviceName: string; location: string } }> {
  await connectDB();
  const settings = await getDeviceSettings();
  
  if (!settings.enableConcurrentStreamCheck) {
    return { allowed: true };
  }
  
  // Check for existing active stream
  const existingStream = await ActiveStream.findOne({ userId });
  
  if (existingStream && existingStream.deviceId !== deviceId) {
    // Different device is already streaming
    const existingDevice = await UserDevice.findOne({ userId, deviceId: existingStream.deviceId });
    
    // Log violation
    await DeviceViolation.create({
      userId,
      violationType: 'concurrent_stream',
      severity: 'warning',
      device1: {
        deviceId: existingStream.deviceId,
        deviceName: existingDevice?.deviceName || 'Unknown Device',
        location: existingStream.location ? `${existingStream.location.city}, ${existingStream.location.state}` : 'Unknown',
        ipAddress: existingStream.ipAddress,
        timestamp: existingStream.startedAt,
      },
      device2: {
        deviceId,
        deviceName: 'Current Device',
        location: location ? `${location.city}, ${location.state}` : 'Unknown',
        ipAddress,
        timestamp: new Date(),
      },
      message: 'User attempted to stream on multiple devices simultaneously.',
    });
    
    return {
      allowed: false,
      existingStream: {
        deviceName: existingDevice?.deviceName || 'Another Device',
        location: existingStream.location ? `${existingStream.location.city}, ${existingStream.location.state}` : 'Unknown',
      },
    };
  }
  
  // Create or update stream record
  await ActiveStream.findOneAndUpdate(
    { userId },
    {
      userId,
      deviceId,
      videoId,
      communityId,
      startedAt: existingStream ? existingStream.startedAt : new Date(),
      lastHeartbeat: new Date(),
      ipAddress,
      location: location ? {
        city: location.city,
        state: location.state,
        country: location.country,
      } : undefined,
    },
    { upsert: true }
  );
  
  // Update device streaming status
  await UserDevice.findOneAndUpdate(
    { userId, deviceId },
    { isCurrentlyStreaming: true, streamStartedAt: new Date() }
  );
  
  return { allowed: true };
}

export async function sendStreamHeartbeat(userId: string, deviceId: string) {
  await connectDB();
  await ActiveStream.findOneAndUpdate(
    { userId, deviceId },
    { lastHeartbeat: new Date() }
  );
}

export async function endStream(userId: string, deviceId: string) {
  await connectDB();
  await ActiveStream.findOneAndDelete({ userId, deviceId });
  await UserDevice.findOneAndUpdate(
    { userId, deviceId },
    { isCurrentlyStreaming: false, streamStartedAt: null }
  );
}

// =====================================================
// Admin Functions
// =====================================================

export async function getAllUserDevices(page = 1, limit = 50) {
  await connectDB();
  const skip = (page - 1) * limit;
  
  const devices = await UserDevice.find()
    .sort({ lastActive: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await UserDevice.countDocuments();
  
  return { devices, total, page, limit };
}

export async function getDevicesByUser(userId: string) {
  await connectDB();
  return UserDevice.find({ userId }).sort({ lastActive: -1 });
}

export async function getViolations(page = 1, limit = 50, unreviewed = false) {
  await connectDB();
  const skip = (page - 1) * limit;
  
  const query = unreviewed ? { isReviewed: false } : {};
  
  const violations = await DeviceViolation.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await DeviceViolation.countDocuments(query);
  
  return { violations, total, page, limit };
}

export async function getViolationsByUser(userId: string) {
  await connectDB();
  return DeviceViolation.find({ userId }).sort({ createdAt: -1 });
}

export async function markViolationReviewed(violationId: string, adminId: string, notes?: string) {
  await connectDB();
  return DeviceViolation.findByIdAndUpdate(
    violationId,
    {
      isReviewed: true,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      adminNotes: notes,
    },
    { new: true }
  );
}

export async function acknowledgeViolation(violationId: string) {
  await connectDB();
  return DeviceViolation.findByIdAndUpdate(
    violationId,
    {
      isAcknowledged: true,
      acknowledgedAt: new Date(),
    },
    { new: true }
  );
}

export async function getDeviceStats() {
  await connectDB();
  
  const totalDevices = await UserDevice.countDocuments();
  const blockedDevices = await UserDevice.countDocuments({ isBlocked: true });
  const activeStreams = await ActiveStream.countDocuments();
  const totalViolations = await DeviceViolation.countDocuments();
  const unreviewedViolations = await DeviceViolation.countDocuments({ isReviewed: false });
  
  // Get users with most devices
  const usersWithMostDevices = await UserDevice.aggregate([
    { $match: { isBlocked: false } },
    { $group: { _id: '$userId', deviceCount: { $sum: 1 } } },
    { $sort: { deviceCount: -1 } },
    { $limit: 10 },
  ]);
  
  // Get recent violations by type
  const violationsByType = await DeviceViolation.aggregate([
    { $group: { _id: '$violationType', count: { $sum: 1 } } },
  ]);
  
  return {
    totalDevices,
    blockedDevices,
    activeStreams,
    totalViolations,
    unreviewedViolations,
    usersWithMostDevices,
    violationsByType,
  };
}

// Remove all devices for a user (admin action)
export async function removeAllUserDevices(userId: string) {
  await connectDB();
  await ActiveStream.deleteMany({ userId });
  return UserDevice.deleteMany({ userId });
}
