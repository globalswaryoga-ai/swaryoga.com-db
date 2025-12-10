import express from 'express';
import Vision from '../models/Vision.js';
const router = express.Router();
/**
 * Helper function to extract user ID from headers
 * Falls back to 'anonymous' if not provided
 */
function getUserId(req) {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        console.warn('⚠️ Missing X-User-ID header');
    }
    return userId || 'anonymous';
}
/**
 * GET /api/visions
 * Fetch all visions for the current user
 */
router.get('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`📖 Fetching visions for user: ${userId}`);
        const visions = await Vision.find({ userId }).lean().sort({ createdAt: -1 });
        console.log(`✅ Found ${visions.length} visions`);
        res.json({
            success: true,
            data: visions,
            count: visions.length,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching visions:', message);
        res.status(500).json({
            success: false,
            error: message,
            path: req.path,
            method: req.method,
        });
    }
});
/**
 * GET /api/visions/:id
 * Fetch a single vision by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`📖 Fetching vision ${req.params.id} for user: ${userId}`);
        const vision = await Vision.findOne({ _id: req.params.id, userId });
        if (!vision) {
            console.warn(`⚠️ Vision not found: ${req.params.id}`);
            res.status(404).json({
                success: false,
                message: 'Vision not found',
                id: req.params.id,
            });
            return;
        }
        res.json({
            success: true,
            data: vision,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching vision:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * POST /api/visions
 * Create a new vision
 */
router.post('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`✏️ Creating new vision for user: ${userId}`);
        if (!req.body.title) {
            res.status(400).json({
                success: false,
                message: 'Title is required',
            });
            return;
        }
        const vision = new Vision({
            userId,
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await vision.save();
        console.log(`✅ Vision created: ${vision._id}`);
        res.status(201).json({
            success: true,
            data: vision,
            message: 'Vision created successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating vision:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * PUT /api/visions/:id
 * Update an existing vision
 */
router.put('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🔄 Updating vision ${req.params.id} for user: ${userId}`);
        const vision = await Vision.findOneAndUpdate({ _id: req.params.id, userId }, {
            ...req.body,
            updatedAt: new Date(),
        }, { new: true, runValidators: true });
        if (!vision) {
            console.warn(`⚠️ Vision not found for update: ${req.params.id}`);
            res.status(404).json({
                success: false,
                message: 'Vision not found',
            });
            return;
        }
        console.log(`✅ Vision updated: ${vision._id}`);
        res.json({
            success: true,
            data: vision,
            message: 'Vision updated successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating vision:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * DELETE /api/visions/:id
 * Delete a vision
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🗑️ Deleting vision ${req.params.id} for user: ${userId}`);
        const vision = await Vision.findOneAndDelete({
            _id: req.params.id,
            userId,
        });
        if (!vision) {
            console.warn(`⚠️ Vision not found for deletion: ${req.params.id}`);
            res.status(404).json({
                success: false,
                message: 'Vision not found',
            });
            return;
        }
        console.log(`✅ Vision deleted: ${req.params.id}`);
        res.json({
            success: true,
            message: 'Vision deleted successfully',
            deletedId: req.params.id,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deleting vision:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
export default router;
//# sourceMappingURL=visions.js.map