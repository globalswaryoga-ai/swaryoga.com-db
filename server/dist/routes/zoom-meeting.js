import express from 'express';
import ZoomMeeting from '../models/ZoomMeeting';
const router = express.Router();
// Get all zoom meetings for a workshop
router.get('/workshop/:workshopId', async (req, res) => {
    try {
        const { workshopId } = req.params;
        const { status } = req.query;
        let filter = { workshopId };
        if (status)
            filter.status = status;
        const meetings = await ZoomMeeting.find(filter)
            .sort({ scheduledDate: 1 });
        res.json({
            success: true,
            data: meetings
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching zoom meetings',
            error
        });
    }
});
// Get meeting by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const meeting = await ZoomMeeting.findById(id)
            .populate('instructorId', 'name email');
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }
        res.json({
            success: true,
            data: meeting
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching meeting',
            error
        });
    }
});
// Create zoom meeting
router.post('/', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User ID required'
            });
        }
        const { workshopId, batchId, title, scheduledDate, duration, zoomMeetingId, zoomJoinUrl, sessionNumber, instructorId } = req.body;
        if (!workshopId || !zoomMeetingId || !zoomJoinUrl) {
            return res.status(400).json({
                success: false,
                message: 'workshopId, zoomMeetingId, and zoomJoinUrl are required'
            });
        }
        const meeting = new ZoomMeeting({
            workshopId,
            batchId,
            title,
            scheduledDate,
            duration: duration || 60,
            zoomMeetingId,
            zoomJoinUrl,
            sessionNumber,
            instructorId: instructorId || userId,
            createdBy: userId,
            isRecordingEnabled: true,
            isAutoRecordingEnabled: true,
            status: 'scheduled'
        });
        await meeting.save();
        res.status(201).json({
            success: true,
            data: meeting
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error creating zoom meeting',
            error: error.message
        });
    }
});
// Update meeting
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const meeting = await ZoomMeeting.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }
        res.json({
            success: true,
            data: meeting
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating meeting',
            error: error.message
        });
    }
});
// Update meeting status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['scheduled', 'live', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }
        const updateData = { status };
        if (status === 'live') {
            updateData.actualStartTime = new Date();
        }
        else if (status === 'completed') {
            updateData.actualEndTime = new Date();
        }
        const meeting = await ZoomMeeting.findByIdAndUpdate(id, updateData, { new: true });
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }
        res.json({
            success: true,
            data: meeting
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating meeting status',
            error: error.message
        });
    }
});
// Add recording
router.post('/:id/recording', async (req, res) => {
    try {
        const { id } = req.params;
        const { recordingUrl, recordingDownloadUrl } = req.body;
        const meeting = await ZoomMeeting.findByIdAndUpdate(id, {
            recordingAvailable: true,
            recordingUrl,
            recordingDownloadUrl,
            recordingStartTime: new Date()
        }, { new: true });
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }
        res.json({
            success: true,
            data: meeting
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error updating recording',
            error: error.message
        });
    }
});
// Add attendee
router.post('/:id/attendee', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        const meeting = await ZoomMeeting.findByIdAndUpdate(id, {
            $addToSet: { actualAttendees: userId },
            $inc: { expectedAttendees: 1 }
        }, { new: true });
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }
        res.json({
            success: true,
            data: meeting
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error adding attendee',
            error: error.message
        });
    }
});
// Delete meeting
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const meeting = await ZoomMeeting.findByIdAndDelete(id);
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }
        res.json({
            success: true,
            message: 'Meeting deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting meeting',
            error
        });
    }
});
// Get upcoming meetings for a workshop
router.get('/upcoming/:workshopId', async (req, res) => {
    try {
        const { workshopId } = req.params;
        const meetings = await ZoomMeeting.find({
            workshopId,
            scheduledDate: { $gte: new Date() },
            status: { $in: ['scheduled', 'live'] }
        }).sort({ scheduledDate: 1 });
        res.json({
            success: true,
            data: meetings
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching upcoming meetings',
            error
        });
    }
});
export default router;
//# sourceMappingURL=zoom-meeting.js.map