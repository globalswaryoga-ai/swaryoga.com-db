import express from 'express';
import MyWord from '../models/MyWord.js';
const router = express.Router();
/**
 * Helper function to extract user ID from headers
 */
function getUserId(req) {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        console.warn('⚠️ Missing X-User-ID header in mywords route');
    }
    return userId || 'anonymous';
}
/**
 * GET /api/mywords
 * Fetch all words for the current user
 */
router.get('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`💬 Fetching words for user: ${userId}`);
        const words = await MyWord.find({ userId }).lean().sort({ createdAt: -1 });
        console.log(`✅ Found ${words.length} words`);
        res.json({
            success: true,
            data: words,
            count: words.length,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching words:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * GET /api/mywords/:id
 * Fetch a single word by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        const word = await MyWord.findOne({ _id: req.params.id, userId });
        if (!word) {
            res.status(404).json({
                success: false,
                message: 'Word not found',
                id: req.params.id,
            });
            return;
        }
        res.json({
            success: true,
            data: word,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching word:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * POST /api/mywords
 * Create a new word
 */
router.post('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`✏️ Creating new word for user: ${userId}`);
        if (!req.body.commitment) {
            res.status(400).json({
                success: false,
                message: 'Commitment is required',
            });
            return;
        }
        const word = new MyWord({
            userId,
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await word.save();
        console.log(`✅ Word created: ${word._id}`);
        res.status(201).json({
            success: true,
            data: word,
            message: 'Word created successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating word:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * PUT /api/mywords/:id
 * Update an existing word
 */
router.put('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🔄 Updating word ${req.params.id} for user: ${userId}`);
        const word = await MyWord.findOneAndUpdate({ _id: req.params.id, userId }, {
            ...req.body,
            updatedAt: new Date(),
        }, { new: true, runValidators: true });
        if (!word) {
            res.status(404).json({
                success: false,
                message: 'Word not found',
            });
            return;
        }
        console.log(`✅ Word updated: ${word._id}`);
        res.json({
            success: true,
            data: word,
            message: 'Word updated successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating word:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * DELETE /api/mywords/:id
 * Delete a word
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🗑️ Deleting word ${req.params.id} for user: ${userId}`);
        const word = await MyWord.findOneAndDelete({
            _id: req.params.id,
            userId,
        });
        if (!word) {
            res.status(404).json({
                success: false,
                message: 'Word not found',
            });
            return;
        }
        console.log(`✅ Word deleted: ${req.params.id}`);
        res.json({
            success: true,
            message: 'Word deleted successfully',
            deletedId: req.params.id,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deleting word:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
export default router;
//# sourceMappingURL=mywords.js.map