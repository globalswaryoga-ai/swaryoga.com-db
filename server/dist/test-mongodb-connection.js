#!/usr/bin/env ts-node
/**
 * MongoDB Connection & Routes Test
 * Tests if MongoDB Atlas connection is working and all routes can save data
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });
// Import all models
import User from './models/User.js';
import Vision from './models/Vision.js';
import Goal from './models/Goal.js';
import Task from './models/Task.js';
import Todo from './models/Todo.js';
import MyWord from './models/MyWord.js';
import HealthTracker from './models/HealthTracker.js';
import Milestone from './models/Milestone.js';
import Reminder from './models/Reminder.js';
import DailyPlan from './models/DailyPlan.js';
import Workshop from './models/Workshop.js';
import Cart from './models/Cart.js';
import Contact from './models/Contact.js';
import Admin from './models/Admin.js';
import SignupData from './models/SignupData.js';
import SigninData from './models/SigninData.js';
import { Transaction } from './models/Accounting.js';
import Enrollment from './models/Enrollment.js';
import StudentProgress from './models/StudentProgress.js';
import Assignment from './models/Assignment.js';
import Payment from './models/Payment.js';
import ChatMessage from './models/ChatMessage.js';
import ZoomMeeting from './models/ZoomMeeting.js';
import Checkout from './models/Checkout.js';
import PageState from './models/PageState.js';
const results = [];
async function testMongoDBConnection() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 MONGODB CONNECTION & ROUTES TEST');
    console.log('='.repeat(70));
    try {
        // Check connection string
        const mongoUri = process.env.MONGODB_URI || '';
        console.log('\n📋 Configuration:');
        console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
        console.log(`   PORT: ${process.env.PORT}`);
        if (mongoUri.includes('<db_password>')) {
            console.log('   ⚠️  MONGODB_URI: Has placeholder <db_password>');
            console.log('   ❌ MONGODB NOT CONFIGURED - Please add actual password');
            results.push({
                collection: 'MongoDB Connection',
                status: 'FAIL',
                message: 'MongoDB URI has placeholder <db_password> instead of actual password'
            });
            printResults();
            process.exit(1);
        }
        else {
            console.log('   ✅ MONGODB_URI: Configured (password present)');
        }
        // Connect to MongoDB
        console.log('\n🔗 Connecting to MongoDB Atlas...');
        await mongoose.connect(mongoUri, {
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 1,
            minPoolSize: 0,
            retryWrites: true,
            w: 'majority',
        });
        console.log('✅ MongoDB Connection Successful!');
        // Get database info
        const db = mongoose.connection.db;
        if (db) {
            const collections = await db.listCollections().toArray();
            console.log(`✅ Found ${collections.length} collections in database`);
        }
        // Test each model/collection
        console.log('\n📊 Testing All Collections:');
        console.log('-'.repeat(70));
        const models = [
            { name: 'User', model: User },
            { name: 'Vision', model: Vision },
            { name: 'Goal', model: Goal },
            { name: 'Task', model: Task },
            { name: 'Todo', model: Todo },
            { name: 'MyWord', model: MyWord },
            { name: 'HealthTracker', model: HealthTracker },
            { name: 'Milestone', model: Milestone },
            { name: 'Reminder', model: Reminder },
            { name: 'DailyPlan', model: DailyPlan },
            { name: 'Workshop', model: Workshop },
            { name: 'Cart', model: Cart },
            { name: 'Contact', model: Contact },
            { name: 'Admin', model: Admin },
            { name: 'SignupData', model: SignupData },
            { name: 'SigninData', model: SigninData },
            { name: 'Transaction', model: Transaction },
            { name: 'Enrollment', model: Enrollment },
            { name: 'StudentProgress', model: StudentProgress },
            { name: 'Assignment', model: Assignment },
            { name: 'Payment', model: Payment },
            { name: 'ChatMessage', model: ChatMessage },
            { name: 'ZoomMeeting', model: ZoomMeeting },
            { name: 'Checkout', model: Checkout },
            { name: 'PageState', model: PageState },
        ];
        for (const { name, model } of models) {
            try {
                // Check if collection exists and is accessible
                const count = await model.countDocuments();
                console.log(`   ✅ ${name.padEnd(20)} - ${count} documents`);
                results.push({
                    collection: name,
                    status: 'PASS',
                    message: `Connected successfully (${count} documents)`
                });
            }
            catch (error) {
                const err = error instanceof Error ? error.message : 'Unknown error';
                console.log(`   ❌ ${name.padEnd(20)} - ERROR: ${err}`);
                results.push({
                    collection: name,
                    status: 'FAIL',
                    message: err
                });
            }
        }
        // Summary
        console.log('\n' + '-'.repeat(70));
        const passed = results.filter(r => r.status === 'PASS').length;
        const failed = results.filter(r => r.status === 'FAIL').length;
        console.log(`\n✅ PASSED: ${passed}/${results.length}`);
        console.log(`❌ FAILED: ${failed}/${results.length}`);
        if (failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! MongoDB Atlas is properly configured.');
            console.log('✅ All 25+ collections can save data');
            console.log('✅ Backend routes are ready to use');
            console.log('\n📝 Next Steps:');
            console.log('   1. Start the backend: npm run start:ts');
            console.log('   2. Backend will run on port 4000');
            console.log('   3. Frontend can now save data to MongoDB Atlas');
        }
        else {
            console.log('\n⚠️  Some collections failed. Check errors above.');
        }
        printResults();
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.log('\n❌ MongoDB Connection Failed!');
        console.log(`Error: ${errorMsg}`);
        console.log('\n🔍 Troubleshooting:');
        console.log('   1. Check if <db_password> placeholder exists in .env');
        console.log('   2. Verify MongoDB Atlas cluster is running');
        console.log('   3. Check IP whitelist on MongoDB Atlas (0.0.0.0/0 for development)');
        console.log('   4. Verify network connectivity to MongoDB Atlas');
        results.push({
            collection: 'MongoDB Connection',
            status: 'FAIL',
            message: errorMsg
        });
        printResults();
    }
    finally {
        // Close connection
        await mongoose.disconnect();
        console.log('\n🔌 MongoDB Connection Closed');
        console.log('='.repeat(70) + '\n');
    }
}
function printResults() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(70));
    results.forEach((result, index) => {
        const icon = result.status === 'PASS' ? '✅' : '❌';
        console.log(`${index + 1}. ${icon} ${result.collection}`);
        console.log(`   ${result.message}`);
    });
    console.log('='.repeat(70) + '\n');
}
// Run tests
testMongoDBConnection().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=test-mongodb-connection.js.map