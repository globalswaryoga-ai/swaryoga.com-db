import express from 'express';
import Reminder from '../models/Reminder.js.js';
const router = express.Router();
/**
 * Helper function to extract user ID from headers
 */
function getUserId(req) {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        console.warn('⚠️ Missing X-User-ID header in reminders route');
    }
    return userId || 'anonymous';
}
/**
 * GET /api/reminders
 * Fetch all reminders for the current user
 */
router.get('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🔔 Fetching reminders for user: ${userId}`);
        const reminders = await Reminder.find({ userId }).lean().sort({ createdAt: -1 });
        console.log(`✅ Found ${reminders.length} reminders`);
        res.json({
            success: true,
            data: reminders,
            count: reminders.length,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching reminders:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * GET /api/reminders/:id
 * Fetch a single reminder by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        const reminder = await Reminder.findOne({ _id: req.params.id, userId });
        if (!reminder) {
            res.status(404).json({
                success: false,
                message: 'Reminder not found',
                id: req.params.id,
            });
            return;
        }
        res.json({
            success: true,
            data: reminder,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching reminder:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * POST /api/reminders
 * Create a new reminder
 */
router.post('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`✏️ Creating new reminder for user: ${userId}`);
        if (!req.body.title && !req.body.text) {
            res.status(400).json({
                success: false,
                message: 'Title or text is required',
            });
            return;
        }
        const reminder = new Reminder({
            userId,
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await reminder.save();
        console.log(`✅ Reminder created: ${reminder._id}`);
        res.status(201).json({
            success: true,
            data: reminder,
            message: 'Reminder created successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating reminder:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * PUT /api/reminders/:id
 * Update an existing reminder
 */
router.put('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🔄 Updating reminder ${req.params.id} for user: ${userId}`);
        const reminder = await Reminder.findOneAndUpdate({ _id: req.params.id, userId }, {
            ...req.body,
            updatedAt: new Date(),
        }, { new: true, runValidators: true });
        if (!reminder) {
            res.status(404).json({
                success: false,
                message: 'Reminder not found',
            });
            return;
        }
        console.log(`✅ Reminder updated: ${reminder._id}`);
        res.json({
            success: true,
            data: reminder,
            message: 'Reminder updated successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating reminder:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * DELETE /api/reminders/:id
 * Delete a reminder
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🗑️ Deleting reminder ${req.params.id} for user: ${userId}`);
        const reminder = await Reminder.findOneAndDelete({
            _id: req.params.id,
            userId,
        });
        if (!reminder) {
            res.status(404).json({
                success: false,
                message: 'Reminder not found',
            });
            return;
        }
        console.log(`✅ Reminder deleted: ${req.params.id}`);
        res.json({
            success: true,
            message: 'Reminder deleted successfully',
            deletedId: req.params.id,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deleting reminder:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
export default router;
//# sourceMappingURL=reminders.js.map