import express from 'express';
import DailyPlan from '../models/DailyPlan.js';
const router = express.Router();
/**
 * Helper function to extract user ID from headers
 */
function getUserId(req) {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        console.warn('⚠️ Missing X-User-ID header in daily plans route');
    }
    return userId || 'anonymous';
}
/**
 * GET /api/dailyplans
 * Fetch all daily plans for the current user
 */
router.get('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`📅 Fetching daily plans for user: ${userId}`);
        const plans = await DailyPlan.find({ userId }).lean().sort({ createdAt: -1 });
        console.log(`✅ Found ${plans.length} daily plans`);
        res.json({
            success: true,
            data: plans,
            count: plans.length,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching daily plans:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * GET /api/dailyplans/:id
 * Fetch a single daily plan by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        const plan = await DailyPlan.findOne({ _id: req.params.id, userId });
        if (!plan) {
            res.status(404).json({
                success: false,
                message: 'Daily plan not found',
                id: req.params.id,
            });
            return;
        }
        res.json({
            success: true,
            data: plan,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching daily plan:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * POST /api/dailyplans
 * Create a new daily plan
 */
router.post('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`✏️ Creating new daily plan for user: ${userId}`);
        if (!req.body.date && !req.body.title) {
            res.status(400).json({
                success: false,
                message: 'Date or title is required',
            });
            return;
        }
        const plan = new DailyPlan({
            userId,
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await plan.save();
        console.log(`✅ Daily plan created: ${plan._id}`);
        res.status(201).json({
            success: true,
            data: plan,
            message: 'Daily plan created successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating daily plan:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * PUT /api/dailyplans/:id
 * Update an existing daily plan
 */
router.put('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🔄 Updating daily plan ${req.params.id} for user: ${userId}`);
        const plan = await DailyPlan.findOneAndUpdate({ _id: req.params.id, userId }, {
            ...req.body,
            updatedAt: new Date(),
        }, { new: true, runValidators: true });
        if (!plan) {
            res.status(404).json({
                success: false,
                message: 'Daily plan not found',
            });
            return;
        }
        console.log(`✅ Daily plan updated: ${plan._id}`);
        res.json({
            success: true,
            data: plan,
            message: 'Daily plan updated successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating daily plan:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * DELETE /api/dailyplans/:id
 * Delete a daily plan
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🗑️ Deleting daily plan ${req.params.id} for user: ${userId}`);
        const plan = await DailyPlan.findOneAndDelete({
            _id: req.params.id,
            userId,
        });
        if (!plan) {
            res.status(404).json({
                success: false,
                message: 'Daily plan not found',
            });
            return;
        }
        console.log(`✅ Daily plan deleted: ${req.params.id}`);
        res.json({
            success: true,
            message: 'Daily plan deleted successfully',
            deletedId: req.params.id,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deleting daily plan:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
export default router;
//# sourceMappingURL=dailyplans.js.map