/**
 * Sadhana Analytics Service - Professional Analytics & Reporting
 * Tracks: Attendance, Engagement, Session Performance
 */

import mongoose from 'mongoose';

// Analytics Schema
const sadhanaAnalyticsSchema = new mongoose.Schema(
  {
    sessionId: String,
    programId: String,
    date: String,
    timeSlot: String,

    // Session Info
    startTime: Date,
    endTime: Date,
    duration: Number, // minutes

    // Participants
    totalParticipants: { type: Number, default: 0 },
    participantsJoined: { type: Number, default: 0 },
    participantsLeft: { type: Number, default: 0 },
    peakParticipants: { type: Number, default: 0 },
    averageDuration: { type: Number, default: 0 },

    // Video Performance
    videoStartTime: Date,
    videoEndTime: Date,
    videoDuration: Number,
    videoQuality: String, // HD, SD, Auto
    buffering: Number, // count

    // Engagement
    messagesCount: { type: Number, default: 0 },
    reactionsCount: { type: Number, default: 0 },
    chatActive: Boolean,

    // Recording
    recorded: Boolean,
    recordingUrl: String,
    recordingSize: Number,
    recordingDuration: Number,

    // Issues
    issues: [String],
    errors: [String],

    // Ratings
    averageRating: { type: Number, default: 0 },
    ratingsCount: { type: Number, default: 0 },
    feedback: [String],

    // Custom Branding
    brandColor: String,
    brandLogo: String,
    displayName: String,

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'sadhana_analytics' }
);

// Participant Analytics Schema
const participantAnalyticsSchema = new mongoose.Schema(
  {
    sessionId: String,
    participantId: String,
    participantName: String,
    participantEmail: String,

    joinTime: Date,
    leaveTime: Date,
    duration: Number, // minutes

    // Engagement
    messagesCount: Number,
    reactionsCount: Number,
    participated: Boolean,

    // Video Experience
    videoWatched: Boolean,
    videoQuality: String,
    bufferingIssues: Number,

    // Feedback
    rating: Number, // 1-5
    feedback: String,

    // Location (optional)
    timezone: String,
    country: String,

    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'participant_analytics' }
);

let SessionAnalytics: any;
let ParticipantAnalytics: any;

async function getModels() {
  if (!SessionAnalytics) {
    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    SessionAnalytics = db.models.SessionAnalytics || db.model('SessionAnalytics', sadhanaAnalyticsSchema);
    ParticipantAnalytics = db.models.ParticipantAnalytics || db.model('ParticipantAnalytics', participantAnalyticsSchema);
  }
  return { SessionAnalytics, ParticipantAnalytics };
}

/**
 * Create session analytics record
 */
export async function createSessionAnalytics(data: any): Promise<any> {
  try {
    const { SessionAnalytics } = await getModels();
    const analytics = new SessionAnalytics(data);
    return await analytics.save();
  } catch (err) {
    console.error('[Analytics] Error creating session analytics:', err);
    throw err;
  }
}

/**
 * Update session analytics
 */
export async function updateSessionAnalytics(sessionId: string, data: any): Promise<any> {
  try {
    const { SessionAnalytics } = await getModels();
    return await SessionAnalytics.findOneAndUpdate(
      { sessionId },
      { ...data, updatedAt: new Date() },
      { new: true }
    );
  } catch (err) {
    console.error('[Analytics] Error updating session analytics:', err);
    throw err;
  }
}

/**
 * Record participant attendance
 */
export async function recordParticipantAttendance(sessionId: string, participantData: any): Promise<any> {
  try {
    const { ParticipantAnalytics } = await getModels();
    const analytics = new ParticipantAnalytics({
      sessionId,
      ...participantData,
    });
    return await analytics.save();
  } catch (err) {
    console.error('[Analytics] Error recording attendance:', err);
    throw err;
  }
}

/**
 * Get session analytics
 */
export async function getSessionAnalytics(sessionId: string): Promise<any> {
  try {
    const { SessionAnalytics } = await getModels();
    return await SessionAnalytics.findOne({ sessionId });
  } catch (err) {
    console.error('[Analytics] Error getting session analytics:', err);
    return null;
  }
}

/**
 * Get participant analytics for session
 */
export async function getParticipantAnalytics(sessionId: string): Promise<any[]> {
  try {
    const { ParticipantAnalytics } = await getModels();
    return await ParticipantAnalytics.find({ sessionId }).sort({ joinTime: -1 });
  } catch (err) {
    console.error('[Analytics] Error getting participant analytics:', err);
    return [];
  }
}

/**
 * Generate attendance report
 */
export async function generateAttendanceReport(programId: string, dateRange: { start: Date; end: Date }): Promise<any> {
  try {
    const { SessionAnalytics, ParticipantAnalytics } = await getModels();

    const sessions = await SessionAnalytics.find({
      programId,
      date: { $gte: dateRange.start, $lte: dateRange.end },
    });

    const report = {
      programId,
      dateRange,
      totalSessions: sessions.length,
      totalParticipants: 0,
      averageAttendance: 0,
      averageEngagement: 0,
      sessions: [],
    };

    for (const session of sessions) {
      const participants = await ParticipantAnalytics.find({ sessionId: session._id });

      report.sessions.push({
        date: session.date,
        timeSlot: session.timeSlot,
        participants: participants.length,
        averageDuration: session.averageDuration,
        rating: session.averageRating,
        videoQuality: session.videoQuality,
        recorded: session.recorded,
      });

      report.totalParticipants += participants.length;
    }

    if (sessions.length > 0) {
      report.averageAttendance = Math.round(report.totalParticipants / sessions.length);
    }

    return report;
  } catch (err) {
    console.error('[Analytics] Error generating report:', err);
    throw err;
  }
}

/**
 * Get engagement metrics
 */
export async function getEngagementMetrics(sessionId: string): Promise<any> {
  try {
    const { ParticipantAnalytics } = await getModels();
    const participants = await ParticipantAnalytics.find({ sessionId });

    const metrics = {
      totalParticipants: participants.length,
      averageRating: 0,
      messageCount: 0,
      participationRate: 0,
      averageDuration: 0,
    };

    if (participants.length > 0) {
      const ratings = participants.filter(p => p.rating).map(p => p.rating);
      if (ratings.length > 0) {
        metrics.averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      }

      metrics.messageCount = participants.reduce((sum, p) => sum + (p.messagesCount || 0), 0);
      metrics.participationRate = Math.round((participants.filter(p => p.participated).length / participants.length) * 100);
      metrics.averageDuration = Math.round(
        participants.reduce((sum, p) => sum + (p.duration || 0), 0) / participants.length
      );
    }

    return metrics;
  } catch (err) {
    console.error('[Analytics] Error getting engagement metrics:', err);
    return {};
  }
}

/**
 * Get leaderboard (most engaged participants)
 */
export async function getLeaderboard(programId: string, limit: number = 10): Promise<any[]> {
  try {
    const { ParticipantAnalytics } = await getModels();

    return await ParticipantAnalytics.aggregate([
      { $match: { participantEmail: { $exists: true } } },
      {
        $group: {
          _id: '$participantEmail',
          name: { $first: '$participantName' },
          sessionsAttended: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          averageRating: { $avg: '$rating' },
          totalMessages: { $sum: '$messagesCount' },
        },
      },
      { $sort: { totalDuration: -1 } },
      { $limit: limit },
    ]);
  } catch (err) {
    console.error('[Analytics] Error getting leaderboard:', err);
    return [];
  }
}

export default {
  createSessionAnalytics,
  updateSessionAnalytics,
  recordParticipantAttendance,
  getSessionAnalytics,
  getParticipantAnalytics,
  generateAttendanceReport,
  getEngagementMetrics,
  getLeaderboard,
};
