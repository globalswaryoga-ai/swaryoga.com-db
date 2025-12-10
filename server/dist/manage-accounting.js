import mongoose from 'mongoose';
import { Transaction, Category } from './models/Accounting';
const MONGODB_URI = 'mongodb://admin:MySecurePass123@157.173.221.234:27017/?authSource=admin';
async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB Connected Successfully');
        return true;
    }
    catch (error) {
        console.error('❌ MongoDB Connection Failed:', error);
        return false;
    }
}
async function clearOldData(adminId) {
    try {
        console.log('\n📋 Clearing Old Accounting Data...\n');
        // Get transaction count before deletion
        const transactionsBefore = await Transaction.countDocuments({ adminId });
        const categoriesBefore = await Category.countDocuments({ adminId });
        console.log(`📊 Records before deletion:`);
        console.log(`   • Transactions: ${transactionsBefore}`);
        console.log(`   • Categories: ${categoriesBefore}`);
        // Delete transactions
        const transactionsResult = await Transaction.deleteMany({ adminId });
        console.log(`\n✅ Deleted ${transactionsResult.deletedCount} old transactions`);
        // Delete categories
        const categoriesResult = await Category.deleteMany({ adminId });
        console.log(`✅ Deleted ${categoriesResult.deletedCount} old categories`);
        // Verify deletion
        const transactionsAfter = await Transaction.countDocuments({ adminId });
        const categoriesAfter = await Category.countDocuments({ adminId });
        console.log(`\n✅ Cleanup Complete!`);
        console.log(`📊 Records after deletion:`);
        console.log(`   • Transactions: ${transactionsAfter}`);
        console.log(`   • Categories: ${categoriesAfter}`);
        return { transactionsAfter, categoriesAfter };
    }
    catch (error) {
        console.error('❌ Error clearing data:', error);
        throw error;
    }
}
async function addSampleData(adminId) {
    try {
        console.log('\n📝 Adding Fresh Sample Data...\n');
        // Create categories first
        const incomeCategories = [
            { name: 'Salary', type: 'income', color: '#10B981' },
            { name: 'Freelance', type: 'income', color: '#3B82F6' },
            { name: 'Investment', type: 'income', color: '#8B5CF6' },
            { name: 'Gifts', type: 'income', color: '#F59E0B' }
        ];
        const expenseCategories = [
            { name: 'Food & Groceries', type: 'expense', color: '#EF4444' },
            { name: 'Transportation', type: 'expense', color: '#F97316' },
            { name: 'Utilities', type: 'expense', color: '#EC4899' },
            { name: 'Entertainment', type: 'expense', color: '#06B6D4' },
            { name: 'Health & Fitness', type: 'expense', color: '#6366F1' },
            { name: 'Yoga Classes', type: 'expense', color: '#D946EF' }
        ];
        const categories = [...incomeCategories, ...expenseCategories];
        const createdCategories = [];
        for (const cat of categories) {
            const category = new Category({
                adminId,
                name: cat.name,
                type: cat.type,
                color: cat.color,
                description: `${cat.type === 'income' ? 'Income from' : 'Expense for'} ${cat.name}`
            });
            await category.save();
            createdCategories.push(category);
            console.log(`   ✅ Created category: ${cat.name}`);
        }
        // Create transactions
        const transactionsData = [
            {
                adminId,
                date: new Date(2025, 11, 1),
                description: 'Monthly Salary',
                amount: 5000,
                type: 'income',
                category: 'Salary',
                paymentMethod: 'bank_transfer',
                status: 'completed',
                invoiceNumber: 'SAL-2025-12-001'
            },
            {
                adminId,
                date: new Date(2025, 11, 2),
                description: 'Grocery Shopping',
                amount: 250,
                type: 'expense',
                category: 'Food & Groceries',
                paymentMethod: 'credit_card',
                status: 'completed',
                notes: 'Weekly grocery shopping at supermarket'
            },
            {
                adminId,
                date: new Date(2025, 11, 3),
                description: 'Yoga Classes - Monthly Pack',
                amount: 150,
                type: 'expense',
                category: 'Yoga Classes',
                paymentMethod: 'cash',
                status: 'completed',
                notes: 'Monthly subscription for Swar Yoga classes'
            },
            {
                adminId,
                date: new Date(2025, 11, 5),
                description: 'Freelance Project Payment',
                amount: 1200,
                type: 'income',
                category: 'Freelance',
                paymentMethod: 'bank_transfer',
                status: 'completed',
                invoiceNumber: 'FREELANCE-2025-12-001'
            },
            {
                adminId,
                date: new Date(2025, 11, 7),
                description: 'Electric Bill Payment',
                amount: 120,
                type: 'expense',
                category: 'Utilities',
                paymentMethod: 'bank_transfer',
                status: 'completed',
                notes: 'Monthly electricity bill'
            },
            {
                adminId,
                date: new Date(2025, 11, 10),
                description: 'Investment - Stock Purchase',
                amount: 2000,
                type: 'income',
                category: 'Investment',
                paymentMethod: 'bank_transfer',
                status: 'completed',
                notes: 'Dividend received from portfolio'
            },
            {
                adminId,
                date: new Date(2025, 11, 12),
                description: 'Restaurant Dinner',
                amount: 85,
                type: 'expense',
                category: 'Food & Groceries',
                paymentMethod: 'credit_card',
                status: 'completed',
                notes: 'Dinner with family'
            },
            {
                adminId,
                date: new Date(2025, 11, 15),
                description: 'Gym Membership',
                amount: 50,
                type: 'expense',
                category: 'Health & Fitness',
                paymentMethod: 'credit_card',
                status: 'completed'
            },
            {
                adminId,
                date: new Date(2025, 11, 18),
                description: 'Movie Tickets',
                amount: 30,
                type: 'expense',
                category: 'Entertainment',
                paymentMethod: 'credit_card',
                status: 'completed'
            },
            {
                adminId,
                date: new Date(2025, 11, 20),
                description: 'Car Fuel',
                amount: 60,
                type: 'expense',
                category: 'Transportation',
                paymentMethod: 'credit_card',
                status: 'completed'
            }
        ];
        const createdTransactions = [];
        for (const txn of transactionsData) {
            const transaction = new Transaction(txn);
            await transaction.save();
            createdTransactions.push(transaction);
            console.log(`   ✅ Created transaction: ${txn.description} - $${txn.amount}`);
        }
        console.log(`\n✅ Data Added Successfully!`);
        console.log(`   • Categories: ${createdCategories.length}`);
        console.log(`   • Transactions: ${createdTransactions.length}`);
        return { categories: createdCategories, transactions: createdTransactions };
    }
    catch (error) {
        console.error('❌ Error adding sample data:', error);
        throw error;
    }
}
async function verifyData(adminId) {
    try {
        console.log('\n🔍 Verifying Data in MongoDB...\n');
        // Get transactions
        const transactions = await Transaction.find({ adminId }).sort({ date: -1 });
        const categories = await Category.find({ adminId });
        console.log(`📊 Database Status:`);
        console.log(`   • Total Transactions: ${transactions.length}`);
        console.log(`   • Total Categories: ${categories.length}`);
        // Calculate totals
        let totalIncome = 0;
        let totalExpense = 0;
        const typeBreakdown = {};
        transactions.forEach(tx => {
            if (tx.type === 'income') {
                totalIncome += tx.amount;
            }
            else {
                totalExpense += tx.amount;
            }
            typeBreakdown[tx.category] = (typeBreakdown[tx.category] || 0) + tx.amount;
        });
        console.log(`\n💰 Financial Summary:`);
        console.log(`   • Total Income: $${totalIncome.toFixed(2)}`);
        console.log(`   • Total Expense: $${totalExpense.toFixed(2)}`);
        console.log(`   • Net Balance: $${(totalIncome - totalExpense).toFixed(2)}`);
        console.log(`\n📈 Breakdown by Category:`);
        Object.entries(typeBreakdown).forEach(([cat, amount]) => {
            console.log(`   • ${cat}: $${amount.toFixed(2)}`);
        });
        console.log(`\n📋 Recent Transactions (Last 5):`);
        transactions.slice(0, 5).forEach((tx, idx) => {
            const date = new Date(tx.date).toLocaleDateString();
            const icon = tx.type === 'income' ? '📈' : '📉';
            console.log(`   ${idx + 1}. ${icon} ${tx.description} - $${tx.amount} (${date})`);
        });
        console.log(`\n✅ Data Verification Complete!`);
        return { transactions, categories, totalIncome, totalExpense };
    }
    catch (error) {
        console.error('❌ Error verifying data:', error);
        throw error;
    }
}
async function main() {
    const adminId = 'admin_sadhak_001'; // Using a consistent admin ID
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          SWAR YOGA ACCOUNTING DATA MANAGER                 ║');
    console.log('║          Clean & Verify MongoDB Storage                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    try {
        // Connect to MongoDB
        const connected = await connectDB();
        if (!connected) {
            process.exit(1);
        }
        // Clear old data
        await clearOldData(adminId);
        // Add fresh sample data
        const newData = await addSampleData(adminId);
        // Verify data
        const verified = await verifyData(adminId);
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                   ✅ ALL OPERATIONS SUCCESSFUL             ║');
        console.log('║   Data is properly stored and verified in MongoDB Atlas   ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');
        await mongoose.disconnect();
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Fatal Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}
main();
//# sourceMappingURL=manage-accounting.js.map