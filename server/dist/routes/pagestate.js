import express from 'express';
import PageState from '../models/PageState.js.js';
const router = express.Router();
// Get page state for current user
router.get('/', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            res.status(400).json({ success: false, message: 'Missing X-User-ID header' });
            return;
        }
        const pageState = await PageState.findOne({ userId }).sort({ lastVisited: -1 });
        if (!pageState) {
            res.json({ success: true, data: null });
            return;
        }
        res.json({ success: true, data: pageState });
    }
    catch (error) {
        const err = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, message: err });
    }
});
// Save page state
router.post('/', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            res.status(400).json({ success: false, message: 'Missing X-User-ID header' });
            return;
        }
        const { pageName, pageData, timestamp, lastVisited } = req.body;
        if (!pageName) {
            res.status(400).json({ success: false, message: 'Missing pageName' });
            return;
        }
        // Create or update page state
        const pageState = await PageState.findOneAndUpdate({ userId, pageName }, {
            userId,
            pageName,
            pageData: pageData || {},
            timestamp: timestamp || new Date(),
            lastVisited: lastVisited || new Date(),
        }, { upsert: true, new: true });
        res.status(201).json({ success: true, data: pageState });
    }
    catch (error) {
        const err = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, message: err });
    }
});
// Delete page state
router.delete('/', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            res.status(400).json({ success: false, message: 'Missing X-User-ID header' });
            return;
        }
        await PageState.deleteMany({ userId });
        res.json({ success: true, message: 'Page state cleared' });
    }
    catch (error) {
        const err = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, message: err });
    }
});
export default router;
//# sourceMappingURL=pagestate.js.map