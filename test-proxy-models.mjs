// Test if Proxy models work with Mongoose operations
import { connectDB } from './lib/db.js';
import mongoose from 'mongoose';

// Simulate the Proxy pattern
const modelCache = {};

async function getCrmDb() {
  // Use the default connection for this test
  return mongoose.connection;
}

function getModel(modelName, schema) {
  console.log(`[TEST] getModel called for ${modelName}`);
  if (modelCache[modelName]) {
    console.log(`[TEST] Returning cached model for ${modelName}`);
    return modelCache[modelName];
  }
  
  const crmDb = getCrmDb();
  console.log(`[TEST] Creating model ${modelName}`);
  const model = crmDb.models[modelName] || crmDb.model(modelName, schema);
  modelCache[modelName] = model;
  console.log(`[TEST] Model created: ${modelName}, type: ${typeof model}, has create: ${!!model.create}`);
  return model;
}

// Create a simple test schema
const testSchema = new mongoose.Schema({
  testField: String,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'test_proxy_models' });

// Create Proxy like enterpriseSchemas does
const TestModel = new Proxy({}, {
  get: (target, prop) => {
    console.log(`[PROXY] Accessing property: ${String(prop)}`);
    const actualModel = getModel('TestModel', testSchema);
    const value = actualModel[prop];
    console.log(`[PROXY] Property ${String(prop)} = ${typeof value}`);
    return value;
  }
});

async function runTest() {
  try {
    console.log('\n=== Starting Proxy Model Test ===\n');
    
    await connectDB();
    console.log('[TEST] Database connected\n');
    
    // Test 1: Check if we can access the create method
    console.log('[TEST 1] Testing model.create()\n');
    const doc = await TestModel.create({
      testField: 'Proxy test value'
    });
    console.log('[TEST 1 RESULT] Document created:', doc._id, '\n');
    
    // Test 2: Check if we can access find method
    console.log('[TEST 2] Testing model.findOne()\n');
    const found = await TestModel.findOne({ _id: doc._id });
    console.log('[TEST 2 RESULT] Document found:', found?.testField, '\n');
    
    // Test 3: Test updateOne
    console.log('[TEST 3] Testing model.updateOne()\n');
    const updateResult = await TestModel.updateOne(
      { _id: doc._id },
      { $set: { testField: 'Updated via Proxy' } }
    );
    console.log('[TEST 3 RESULT] Update result:', updateResult.matchedCount, 'matched,', updateResult.modifiedCount, 'modified\n');
    
    // Test 4: Verify update worked
    console.log('[TEST 4] Verifying update\n');
    const updated = await TestModel.findOne({ _id: doc._id });
    console.log('[TEST 4 RESULT] Updated value:', updated?.testField, '\n');
    
    // Clean up
    console.log('[TEST] Cleaning up\n');
    await TestModel.deleteOne({ _id: doc._id });
    
    console.log('=== All tests passed! ===\n');
    
  } catch (error) {
    console.error('[TEST ERROR]', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
