import express from 'express';
import Goal from '../models/Goal.js';
const router = express.Router();
/**
 * Helper function to extract user ID from headers
 */
function getUserId(req) {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        console.warn('⚠️ Missing X-User-ID header in goals route');
    }
    return userId || 'anonymous';
}
/**
 * GET /api/goals
 * Fetch all goals for the current user
 */
router.get('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🎯 Fetching goals for user: ${userId}`);
        const goals = await Goal.find({ userId }).lean().sort({ createdAt: -1 });
        console.log(`✅ Found ${goals.length} goals`);
        res.json({
            success: true,
            data: goals,
            count: goals.length,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching goals:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * GET /api/goals/:id
 * Fetch a single goal by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🎯 Fetching goal ${req.params.id} for user: ${userId}`);
        const goal = await Goal.findOne({ _id: req.params.id, userId });
        if (!goal) {
            res.status(404).json({
                success: false,
                message: 'Goal not found',
                id: req.params.id,
            });
            return;
        }
        res.json({
            success: true,
            data: goal,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching goal:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * POST /api/goals
 * Create a new goal
 */
router.post('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`✏️ Creating new goal for user: ${userId}`);
        if (!req.body.title) {
            res.status(400).json({
                success: false,
                message: 'Title is required',
            });
            return;
        }
        const goal = new Goal({
            userId,
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await goal.save();
        console.log(`✅ Goal created: ${goal._id}`);
        res.status(201).json({
            success: true,
            data: goal,
            message: 'Goal created successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating goal:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * PUT /api/goals/:id
 * Update an existing goal
 */
router.put('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🔄 Updating goal ${req.params.id} for user: ${userId}`);
        const goal = await Goal.findOneAndUpdate({ _id: req.params.id, userId }, {
            ...req.body,
            updatedAt: new Date(),
        }, { new: true, runValidators: true });
        if (!goal) {
            res.status(404).json({
                success: false,
                message: 'Goal not found',
            });
            return;
        }
        console.log(`✅ Goal updated: ${goal._id}`);
        res.json({
            success: true,
            data: goal,
            message: 'Goal updated successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating goal:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * DELETE /api/goals/:id
 * Delete a goal
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🗑️ Deleting goal ${req.params.id} for user: ${userId}`);
        const goal = await Goal.findOneAndDelete({
            _id: req.params.id,
            userId,
        });
        if (!goal) {
            res.status(404).json({
                success: false,
                message: 'Goal not found',
            });
            return;
        }
        console.log(`✅ Goal deleted: ${req.params.id}`);
        res.json({
            success: true,
            message: 'Goal deleted successfully',
            deletedId: req.params.id,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deleting goal:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
export default router;
//# sourceMappingURL=goals.js.map