import express from 'express';
import ChatMessage from '../models/ChatMessage';
const router = express.Router();
// Get all messages for a workshop enrollment
router.get('/enrollment/:enrollmentId', async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const { limit = 50, skip = 0 } = req.query;
        const messages = await ChatMessage.find({ enrollmentId })
            .populate('senderId', 'name email photo')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));
        const total = await ChatMessage.countDocuments({ enrollmentId });
        res.json({
            success: true,
            data: messages.reverse(),
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip)
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching messages',
            error
        });
    }
});
// Get all messages for a workshop
router.get('/workshop/:workshopId', async (req, res) => {
    try {
        const { workshopId } = req.params;
        const { limit = 100 } = req.query;
        const messages = await ChatMessage.find({ workshopId })
            .populate('senderId', 'name email photo')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        res.json({
            success: true,
            data: messages.reverse()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching messages',
            error
        });
    }
});
// Send message
router.post('/', async (req, res) => {
    try {
        const { workshopId, enrollmentId, senderId, senderRole, message, attachments } = req.body;
        if (!workshopId || !enrollmentId || !senderId || !message) {
            return res.status(400).json({
                success: false,
                message: 'workshopId, enrollmentId, senderId, and message are required'
            });
        }
        const chatMessage = new ChatMessage({
            workshopId,
            enrollmentId,
            senderId,
            senderRole: senderRole || 'student',
            message,
            attachments: attachments || [],
            messageType: 'text',
            isRead: false
        });
        await chatMessage.save();
        await chatMessage.populate('senderId', 'name email photo');
        res.status(201).json({
            success: true,
            data: chatMessage
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error sending message',
            error: error.message
        });
    }
});
// Edit message
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const chatMessage = await ChatMessage.findByIdAndUpdate(id, { message }, { new: true }).populate('senderId', 'name email photo');
        if (!chatMessage) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }
        res.json({
            success: true,
            data: chatMessage
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error editing message',
            error: error.message
        });
    }
});
// Delete message
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const chatMessage = await ChatMessage.findByIdAndDelete(id);
        if (!chatMessage) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }
        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting message',
            error
        });
    }
});
// Mark message as read
router.patch('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const chatMessage = await ChatMessage.findByIdAndUpdate(id, {
            isRead: true,
            readAt: new Date()
        }, { new: true });
        if (!chatMessage) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }
        res.json({
            success: true,
            data: chatMessage
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error marking message as read',
            error: error.message
        });
    }
});
// Mark all messages as read for an enrollment
router.patch('/enrollment/:enrollmentId/read-all', async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const result = await ChatMessage.updateMany({ enrollmentId, isRead: false }, { isRead: true, readAt: new Date() });
        res.json({
            success: true,
            data: {
                modifiedCount: result.modifiedCount
            }
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error marking messages as read',
            error: error.message
        });
    }
});
// Add emoji reaction
router.post('/:id/reaction', async (req, res) => {
    try {
        const { id } = req.params;
        const { emoji, userId } = req.body;
        const chatMessage = await ChatMessage.findByIdAndUpdate(id, {
            $push: {
                reactions: {
                    emoji,
                    userId
                }
            }
        }, { new: true });
        if (!chatMessage) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }
        res.json({
            success: true,
            data: chatMessage
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error adding reaction',
            error: error.message
        });
    }
});
// Remove emoji reaction
router.delete('/:id/reaction/:userId/:emoji', async (req, res) => {
    try {
        const { id, userId, emoji } = req.params;
        const chatMessage = await ChatMessage.findByIdAndUpdate(id, {
            $pull: {
                reactions: {
                    emoji,
                    userId
                }
            }
        }, { new: true });
        if (!chatMessage) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }
        res.json({
            success: true,
            data: chatMessage
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error removing reaction',
            error: error.message
        });
    }
});
// Pin/unpin message
router.patch('/:id/pin', async (req, res) => {
    try {
        const { id } = req.params;
        const { isPinned } = req.body;
        const chatMessage = await ChatMessage.findByIdAndUpdate(id, { isPinned }, { new: true });
        if (!chatMessage) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }
        res.json({
            success: true,
            data: chatMessage
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error pinning message',
            error: error.message
        });
    }
});
// Get unread count for enrollment
router.get('/unread/:enrollmentId', async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const unreadCount = await ChatMessage.countDocuments({
            enrollmentId,
            isRead: false
        });
        res.json({
            success: true,
            data: {
                unreadCount
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching unread count',
            error
        });
    }
});
export default router;
//# sourceMappingURL=chat.js.map