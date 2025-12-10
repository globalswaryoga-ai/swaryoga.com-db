import express from 'express';
import { Transaction, Category } from '../models/Accounting.js';
const router = express.Router();
// ===== TRANSACTIONS =====
// Get all transactions for admin
router.get('/transactions', async (req, res) => {
    try {
        const { adminId } = req.query;
        const query = {};
        if (adminId)
            query.adminId = adminId;
        const transactions = await Transaction.find(query).sort({ date: -1 });
        res.json({
            success: true,
            data: transactions,
            total: transactions.length
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching transactions:', errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// Create transaction
router.post('/transactions', async (req, res) => {
    try {
        const { adminId, date, description, amount, type, category, paymentMethod, status, notes, invoiceNumber } = req.body;
        if (!adminId || !description || !amount || !type || !category) {
            res.status(400).json({ success: false, error: 'Missing required fields' });
            return;
        }
        const transaction = new Transaction({
            adminId,
            date: new Date(date),
            description,
            amount,
            type,
            category,
            paymentMethod,
            status: status || 'completed',
            notes,
            invoiceNumber
        });
        await transaction.save();
        console.log(`✅ Transaction created: ${description} - ${amount}`);
        res.status(201).json({
            success: true,
            message: 'Transaction created',
            data: transaction
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating transaction:', errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// Update transaction
router.put('/transactions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { date, description, amount, type, category, paymentMethod, status, notes, invoiceNumber } = req.body;
        const transaction = await Transaction.findByIdAndUpdate(id, {
            date: date ? new Date(date) : undefined,
            description,
            amount,
            type,
            category,
            paymentMethod,
            status,
            notes,
            invoiceNumber
        }, { new: true });
        if (!transaction) {
            res.status(404).json({ success: false, error: 'Transaction not found' });
            return;
        }
        console.log(`✅ Transaction updated: ${id}`);
        res.json({
            success: true,
            message: 'Transaction updated',
            data: transaction
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating transaction:', errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// Delete transaction
router.delete('/transactions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await Transaction.findByIdAndDelete(id);
        if (!transaction) {
            res.status(404).json({ success: false, error: 'Transaction not found' });
            return;
        }
        console.log(`✅ Transaction deleted: ${id}`);
        res.json({
            success: true,
            message: 'Transaction deleted'
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deleting transaction:', errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// ===== CATEGORIES =====
// Get all categories for admin
router.get('/categories', async (req, res) => {
    try {
        const { adminId } = req.query;
        const query = {};
        if (adminId)
            query.adminId = adminId;
        const categories = await Category.find(query);
        res.json({
            success: true,
            data: categories,
            total: categories.length
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching categories:', errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// Create category
router.post('/categories', async (req, res) => {
    try {
        const { adminId, name, type, budget, description, color } = req.body;
        if (!adminId || !name || !type) {
            res.status(400).json({ success: false, error: 'Missing required fields' });
            return;
        }
        const category = new Category({
            adminId,
            name,
            type,
            budget,
            description,
            color: color || '#3B82F6'
        });
        await category.save();
        console.log(`✅ Category created: ${name}`);
        res.status(201).json({
            success: true,
            message: 'Category created',
            data: category
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating category:', errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// Update category
router.put('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, budget, description, color } = req.body;
        const category = await Category.findByIdAndUpdate(id, {
            name,
            type,
            budget,
            description,
            color
        }, { new: true });
        if (!category) {
            res.status(404).json({ success: false, error: 'Category not found' });
            return;
        }
        console.log(`✅ Category updated: ${id}`);
        res.json({
            success: true,
            message: 'Category updated',
            data: category
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating category:', errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// Delete category
router.delete('/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findByIdAndDelete(id);
        if (!category) {
            res.status(404).json({ success: false, error: 'Category not found' });
            return;
        }
        console.log(`✅ Category deleted: ${id}`);
        res.json({
            success: true,
            message: 'Category deleted'
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deleting category:', errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// ===== ANALYTICS =====
// Get accounting summary/stats
router.get('/stats', async (req, res) => {
    try {
        const { adminId, startDate, endDate } = req.query;
        const query = {};
        if (adminId)
            query.adminId = adminId;
        if (startDate || endDate) {
            query.date = {};
            if (startDate)
                query.date.$gte = new Date(startDate);
            if (endDate)
                query.date.$lte = new Date(endDate);
        }
        const transactions = await Transaction.find(query);
        const totalIncome = transactions
            .filter(t => t.type === 'income' && t.status === 'completed')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = transactions
            .filter(t => t.type === 'expense' && t.status === 'completed')
            .reduce((sum, t) => sum + t.amount, 0);
        const net = totalIncome - totalExpense;
        // Group by category
        const byCategory = {};
        transactions.forEach(t => {
            if (!byCategory[t.category]) {
                byCategory[t.category] = { income: 0, expense: 0 };
            }
            if (t.type === 'income' && t.status === 'completed') {
                byCategory[t.category].income += t.amount;
            }
            else if (t.type === 'expense' && t.status === 'completed') {
                byCategory[t.category].expense += t.amount;
            }
        });
        res.json({
            success: true,
            data: {
                totalIncome,
                totalExpense,
                net,
                transactionCount: transactions.length,
                byCategory,
                summary: {
                    completed: transactions.filter(t => t.status === 'completed').length,
                    pending: transactions.filter(t => t.status === 'pending').length,
                    failed: transactions.filter(t => t.status === 'failed').length
                }
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching stats:', errorMessage);
        res.status(500).json({ success: false, error: errorMessage });
    }
});
export default router;
//# sourceMappingURL=accounting.js.map