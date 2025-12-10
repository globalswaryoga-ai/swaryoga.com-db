import express from 'express';
import StudentProgress from '../models/StudentProgress.js';
import Enrollment from '../models/Enrollment.js';
import Workshop from '../models/Workshop.js';
const router = express.Router();
// Get progress by enrollment
router.get('/enrollment/:enrollmentId', async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const progress = await StudentProgress.findOne({ enrollmentId })
            .populate('enrollmentId')
            .populate('workshopId', 'totalSessions');
        if (!progress) {
            return res.status(404).json({
                success: false,
                message: 'Progress not found'
            });
        }
        res.json({
            success: true,
            data: progress
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching progress',
            error
        });
    }
});
// Create progress record
router.post('/', async (req, res) => {
    try {
        const { enrollmentId, userId, workshopId } = req.body;
        // Check if already exists
        const existing = await StudentProgress.findOne({ enrollmentId });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Progress record already exists'
            });
        }
        const workshop = await Workshop.findById(workshopId);
        if (!workshop) {
            return res.status(404).json({
                success: false,
                message: 'Workshop not found'
            });
        }
        const progress = new StudentProgress({
            enrollmentId,
            userId,
            workshopId,
            unlockedSessions: [1], // First session is always unlocked
            currentSessionNumber: 1,
            lastActivityDate: new Date()
        });
        await progress.save();
        res.status(201).json({
            success: true,
            data: progress
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error creating progress',
            error: error.message
        });
    }
});
// Record session watch
router.post('/:id/session-watch', async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionId, watchTime } = req.body;
        const progress = await StudentProgress.findById(id);
        if (!progress) {
            return res.status(404).json({
                success: false,
                message: 'Progress not found'
            });
        }
        // Check if session already recorded
        let sessionRecord = progress.sessionsCompleted.find((s) => s.sessionId === sessionId);
        if (!sessionRecord) {
            progress.sessionsCompleted.push({
                sessionId,
                watchTime: watchTime || 0,
                isWatched: true,
                completedDate: new Date()
            });
        }
        else {
            sessionRecord.watchTime = (sessionRecord.watchTime || 0) + (watchTime || 0);
            sessionRecord.isWatched = true;
        }
        // Update total engagement minutes
        progress.totalEngagementMinutes += watchTime ? Math.ceil(watchTime / 60) : 0;
        progress.lastActivityDate = new Date();
        // Update completion percentage
        progress.totalSessionsCompleted = progress.sessionsCompleted.filter((s) => s.isWatched).length;
        const enrollment = await Enrollment.findById(progress.enrollmentId);
        const workshop = await Workshop.findById(progress.workshopId);
        if (enrollment && workshop) {
            progress.completionPercentage = Math.floor((progress.totalSessionsCompleted / workshop.totalSessions) * 100);
        }
        await progress.save();
        res.json({
            success: true,
            data: progress
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error recording session watch',
            error: error.message
        });
    }
});
// Check if session can be unlocked
router.get('/:id/can-unlock/:sessionNumber', async (req, res) => {
    try {
        const { id, sessionNumber } = req.params;
        const progress = await StudentProgress.findById(id);
        if (!progress) {
            return res.status(404).json({
                success: false,
                message: 'Progress not found'
            });
        }
        const workshop = await Workshop.findById(progress.workshopId);
        if (!workshop) {
            return res.status(404).json({
                success: false,
                message: 'Workshop not found'
            });
        }
        const sessionNum = parseInt(sessionNumber);
        const session = workshop.sessions.find((s) => s.sessionId === sessionNum);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }
        let canUnlock = false;
        let reason = '';
        if (progress.unlockedSessions.includes(sessionNum)) {
            canUnlock = true;
        }
        else if (sessionNum === 1) {
            canUnlock = true;
        }
        else {
            const unlockRules = session.unlockRules;
            // Check previous session completion
            if (unlockRules.requiresPreviousCompletion) {
                const prevSession = progress.sessionsCompleted.find((s) => s.sessionId === sessionNum - 1 && s.isCompleted);
                if (!prevSession) {
                    reason = `Complete session ${sessionNum - 1} first`;
                }
                else if (unlockRules.timeGapHours) {
                    const timeDiff = new Date().getTime() - new Date(prevSession.completedDate).getTime();
                    const hoursDiff = timeDiff / (1000 * 60 * 60);
                    if (hoursDiff < unlockRules.timeGapHours) {
                        reason = `Wait ${Math.ceil(unlockRules.timeGapHours - hoursDiff)} more hours`;
                    }
                    else {
                        canUnlock = true;
                    }
                }
                else {
                    canUnlock = true;
                }
            }
        }
        res.json({
            success: true,
            data: {
                canUnlock,
                reason,
                sessionNumber: sessionNum
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking unlock status',
            error: error.message
        });
    }
});
// Submit rating
router.post('/:id/rating', async (req, res) => {
    try {
        const { id } = req.params;
        const { score, comment } = req.body;
        const progress = await StudentProgress.findByIdAndUpdate(id, {
            ratingSubmitted: true,
            ratingDate: new Date(),
            ratingScore: score,
            ratingComment: comment
        }, { new: true });
        if (!progress) {
            return res.status(404).json({
                success: false,
                message: 'Progress not found'
            });
        }
        res.json({
            success: true,
            data: progress
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error submitting rating',
            error: error.message
        });
    }
});
// Submit testimony
router.post('/:id/testimony', async (req, res) => {
    try {
        const { id } = req.params;
        const { text, videoUrl } = req.body;
        const progress = await StudentProgress.findByIdAndUpdate(id, {
            testimonySubmitted: true,
            testimonyDate: new Date(),
            testimonyText: text,
            testimonyVideoUrl: videoUrl
        }, { new: true });
        if (!progress) {
            return res.status(404).json({
                success: false,
                message: 'Progress not found'
            });
        }
        res.json({
            success: true,
            data: progress
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error submitting testimony',
            error: error.message
        });
    }
});
// Mark session as completed
router.post('/:id/complete-session/:sessionNumber', async (req, res) => {
    try {
        const { id, sessionNumber } = req.params;
        const progress = await StudentProgress.findById(id);
        if (!progress) {
            return res.status(404).json({
                success: false,
                message: 'Progress not found'
            });
        }
        const sessionNum = parseInt(sessionNumber);
        let sessionRecord = progress.sessionsCompleted.find((s) => s.sessionId === sessionNum);
        if (sessionRecord) {
            sessionRecord.isCompleted = true;
        }
        else {
            progress.sessionsCompleted.push({
                sessionId: sessionNum,
                completedDate: new Date(),
                isWatched: true,
                isCompleted: true,
                watchTime: 0
            });
        }
        progress.totalSessionsCompleted = progress.sessionsCompleted.filter((s) => s.isCompleted).length;
        const workshop = await Workshop.findById(progress.workshopId);
        if (workshop) {
            progress.completionPercentage = Math.floor((progress.totalSessionsCompleted / workshop.totalSessions) * 100);
            // Check if all sessions completed
            if (progress.totalSessionsCompleted === workshop.totalSessions) {
                progress.isCompleted = true;
                progress.completionDate = new Date();
            }
        }
        progress.lastActivityDate = new Date();
        await progress.save();
        res.json({
            success: true,
            data: progress
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error completing session',
            error: error.message
        });
    }
});
// Get progress for user's all courses
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const progress = await StudentProgress.find({ userId })
            .populate('workshopId', 'title thumbnail category')
            .sort({ updatedAt: -1 });
        res.json({
            success: true,
            data: progress
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching progress',
            error
        });
    }
});
export default router;
//# sourceMappingURL=student-progress.js.map