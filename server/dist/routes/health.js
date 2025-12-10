import express from 'express';
import HealthTracker from '../models/HealthTracker.js.js';
const router = express.Router();
/**
 * Helper function to extract user ID from headers
 */
function getUserId(req) {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        console.warn('⚠️ Missing X-User-ID header in health route');
    }
    return userId || 'anonymous';
}
/**
 * GET /api/health-data
 * Fetch all health records for the current user
 */
router.get('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`❤️ Fetching health records for user: ${userId}`);
        const records = await HealthTracker.find({ userId }).lean().sort({ createdAt: -1 });
        console.log(`✅ Found ${records.length} health records`);
        res.json({
            success: true,
            data: records,
            count: records.length,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching health records:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * GET /api/health-data/:id
 * Fetch a single health record by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        const record = await HealthTracker.findOne({ _id: req.params.id, userId });
        if (!record) {
            res.status(404).json({
                success: false,
                message: 'Health record not found',
                id: req.params.id,
            });
            return;
        }
        res.json({
            success: true,
            data: record,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching health record:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * POST /api/health-data
 * Create a new health record
 */
router.post('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`✏️ Creating new health record for user: ${userId}`);
        if (!req.body.date && !req.body.type) {
            res.status(400).json({
                success: false,
                message: 'Date or type is required',
            });
            return;
        }
        const record = new HealthTracker({
            userId,
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await record.save();
        console.log(`✅ Health record created: ${record._id}`);
        res.status(201).json({
            success: true,
            data: record,
            message: 'Health record created successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating health record:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * PUT /api/health-data/:id
 * Update an existing health record
 */
router.put('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🔄 Updating health record ${req.params.id} for user: ${userId}`);
        const record = await HealthTracker.findOneAndUpdate({ _id: req.params.id, userId }, {
            ...req.body,
            updatedAt: new Date(),
        }, { new: true, runValidators: true });
        if (!record) {
            res.status(404).json({
                success: false,
                message: 'Health record not found',
            });
            return;
        }
        console.log(`✅ Health record updated: ${record._id}`);
        res.json({
            success: true,
            data: record,
            message: 'Health record updated successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating health record:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * DELETE /api/health-data/:id
 * Delete a health record
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🗑️ Deleting health record ${req.params.id} for user: ${userId}`);
        const record = await HealthTracker.findOneAndDelete({
            _id: req.params.id,
            userId,
        });
        if (!record) {
            res.status(404).json({
                success: false,
                message: 'Health record not found',
            });
            return;
        }
        console.log(`✅ Health record deleted: ${req.params.id}`);
        res.json({
            success: true,
            message: 'Health record deleted successfully',
            deletedId: req.params.id,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deleting health record:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
export default router;
//# sourceMappingURL=health.js.map