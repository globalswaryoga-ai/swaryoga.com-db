import express from 'express';
import Todo from '../models/Todo.js';
const router = express.Router();
/**
 * Helper function to extract user ID from headers
 */
function getUserId(req) {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        console.warn('⚠️ Missing X-User-ID header in todos route');
    }
    return userId || 'anonymous';
}
/**
 * GET /api/todos
 * Fetch all todos for the current user
 */
router.get('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`☐ Fetching todos for user: ${userId}`);
        const todos = await Todo.find({ userId }).lean().sort({ createdAt: -1 });
        console.log(`✅ Found ${todos.length} todos`);
        res.json({
            success: true,
            data: todos,
            count: todos.length,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching todos:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * GET /api/todos/:id
 * Fetch a single todo by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        const todo = await Todo.findOne({ _id: req.params.id, userId });
        if (!todo) {
            res.status(404).json({
                success: false,
                message: 'Todo not found',
                id: req.params.id,
            });
            return;
        }
        res.json({
            success: true,
            data: todo,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching todo:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * POST /api/todos
 * Create a new todo
 */
router.post('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`✏️ Creating new todo for user: ${userId}`);
        if (!req.body.title) {
            res.status(400).json({
                success: false,
                message: 'Title is required',
            });
            return;
        }
        const todo = new Todo({
            userId,
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await todo.save();
        console.log(`✅ Todo created: ${todo._id}`);
        res.status(201).json({
            success: true,
            data: todo,
            message: 'Todo created successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating todo:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * PUT /api/todos/:id
 * Update an existing todo
 */
router.put('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🔄 Updating todo ${req.params.id} for user: ${userId}`);
        const todo = await Todo.findOneAndUpdate({ _id: req.params.id, userId }, {
            ...req.body,
            updatedAt: new Date(),
        }, { new: true, runValidators: true });
        if (!todo) {
            res.status(404).json({
                success: false,
                message: 'Todo not found',
            });
            return;
        }
        console.log(`✅ Todo updated: ${todo._id}`);
        res.json({
            success: true,
            data: todo,
            message: 'Todo updated successfully',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating todo:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
/**
 * DELETE /api/todos/:id
 * Delete a todo
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        console.log(`🗑️ Deleting todo ${req.params.id} for user: ${userId}`);
        const todo = await Todo.findOneAndDelete({
            _id: req.params.id,
            userId,
        });
        if (!todo) {
            res.status(404).json({
                success: false,
                message: 'Todo not found',
            });
            return;
        }
        console.log(`✅ Todo deleted: ${req.params.id}`);
        res.json({
            success: true,
            message: 'Todo deleted successfully',
            deletedId: req.params.id,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deleting todo:', message);
        res.status(500).json({
            success: false,
            error: message,
        });
    }
});
export default router;
//# sourceMappingURL=todos.js.map