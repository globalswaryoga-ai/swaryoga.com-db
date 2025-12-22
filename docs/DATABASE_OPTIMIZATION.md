/**
 * Database optimization and indexing recommendations
 * File: DATABASE_OPTIMIZATION.md
 */

# Database Optimization Guide

## Current Indexes & Performance

### Existing Collections & Recommended Indexes

#### Users Collection
```javascript
// Existing indexes:
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ createdAt: -1 })

// Recommended additional indexes:
db.users.createIndex({ status: 1, createdAt: -1 })  // For user status filters
db.users.createIndex({ phone: 1 }, { sparse: true }) // For phone lookups
db.users.createIndex({ country: 1 })                 // For regional filters
```

#### Orders Collection
```javascript
// Recommended indexes:
db.orders.createIndex({ userId: 1, createdAt: -1 })
db.orders.createIndex({ paymentStatus: 1, createdAt: -1 })
db.orders.createIndex({ orderStatus: 1 })
db.orders.createIndex({ payuTxnId: 1 }, { sparse: true, unique: true })
db.orders.createIndex({ email: 1 })
db.orders.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }) // 30-day TTL for old orders
```

#### Sessions Collection
```javascript
// Recommended indexes:
db.sessions.createIndex({ userId: 1 })
db.sessions.createIndex({ sessionCode: 1 }, { unique: true })
db.sessions.createIndex({ startDate: 1, endDate: 1 })
db.sessions.createIndex({ enrollments: 1 }, { sparse: true })
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }) // 90-day archive
```

#### Notes Collection
```javascript
// Recommended indexes:
db.notes.createIndex({ userId: 1, createdAt: -1 })
db.notes.createIndex({ category: 1 })
db.notes.createIndex({ isPublic: 1, createdAt: -1 })
db.notes.createIndex({ tags: 1 })
```

#### CRM Leads Collection
```javascript
// Recommended indexes:
db.leads.createIndex({ email: 1 }, { sparse: true })
db.leads.createIndex({ phone: 1 }, { sparse: true })
db.leads.createIndex({ status: 1, createdAt: -1 })
db.leads.createIndex({ labels: 1 })
db.leads.createIndex({ lastContactDate: -1 })
db.leads.createIndex({ conversationHistory: 1 }, { sparse: true })
```

#### Community Posts Collection
```javascript
// Recommended indexes:
db.posts.createIndex({ communityId: 1, createdAt: -1 })
db.posts.createIndex({ authorId: 1 })
db.posts.createIndex({ tags: 1 })
db.posts.createIndex({ likeCount: -1 })
db.posts.createIndex({ commentCount: -1 })
```

---

## Performance Optimization Strategies

### 1. Indexing Strategy

#### Do's
- ✅ Create indexes on frequently filtered fields
- ✅ Use compound indexes for common query patterns
- ✅ Monitor index usage with `db.collection.aggregate([{$indexStats: {}}])`
- ✅ Use sparse indexes for optional fields
- ✅ Set TTL indexes for temporary data

#### Don'ts
- ❌ Create too many indexes (slows writes)
- ❌ Index low-cardinality fields (status, country)
- ❌ Create indexes on fields you never filter
- ❌ Use indexes on fields with many NULL values without sparse option

### 2. Query Optimization

#### Use `.lean()` for Read Operations
```typescript
// ✅ Good - returns plain JS objects
const users = await User.find({ status: 'active' }).lean();

// ❌ Slower - returns Mongoose documents
const users = await User.find({ status: 'active' });
```

#### Project Only Needed Fields
```typescript
// ✅ Good - only fetch needed fields
const users = await User.find({}, { name: 1, email: 1 }).lean();

// ❌ Unnecessary - fetches all fields
const users = await User.find().lean();
```

#### Pagination for Large Results
```typescript
// ✅ Good - paginated
const skip = (page - 1) * pageSize;
const results = await Order.find()
  .skip(skip)
  .limit(pageSize)
  .lean();

// ❌ Bad - loads entire collection
const results = await Order.find();
```

### 3. Connection Pooling

**MongoDB Default Pool Settings:**
- Min pool size: 10
- Max pool size: 100
- Connection timeout: 10s

**Recommended Environment Variables:**
```env
MONGODB_URI=mongodb+srv://user:pass@host/db?maxPoolSize=50&minPoolSize=10&maxIdleTimeMS=45000
```

### 4. Aggregation Optimization

#### Use Aggregation Pipeline
```typescript
// ✅ Efficient - uses server-side aggregation
const stats = await Order.aggregate([
  { $match: { createdAt: { $gte: startDate } } },
  { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]);

// ❌ Inefficient - loads all to client
const orders = await Order.find({ createdAt: { $gte: startDate } });
const stats = aggregateInApp(orders);
```

#### Aggregation Pipeline Stages Order
1. `$match` - Filter documents first (reduces data)
2. `$project` - Remove unnecessary fields
3. `$lookup` - Join with other collections (after filtering)
4. `$group` - Group results
5. `$sort` - Sort results
6. `$limit` - Limit output

### 5. Caching Strategy

#### In-Memory Cache (TTL)
```typescript
import { TTLCache } from '@/lib/cache';

const cache = new TTLCache(5 * 60 * 1000); // 5 minutes

export const getSessionById = async (id: string) => {
  const cached = cache.get(id);
  if (cached) return cached;

  const session = await Session.findById(id).lean();
  cache.set(id, session);
  return session;
};
```

#### Redis Cache (Production)
```typescript
// Implement with redis-client
const cacheKey = `session:${id}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const session = await Session.findById(id);
await redis.setex(cacheKey, 300, JSON.stringify(session)); // 5 min TTL
return session;
```

---

## Monitoring & Diagnosis

### Check Collection Stats
```javascript
db.orders.aggregate([{ $collStats: { latencyStats: {} } }])
```

### Analyze Query Performance
```javascript
db.orders.find({ paymentStatus: 'pending' }).explain('executionStats')
```

### Index Usage
```javascript
db.orders.aggregate([{ $indexStats: {} }])
```

### Connection Pool Stats
```bash
# In Node.js with MongoDB driver
const poolStats = mongoose.connection.getClient().topology.s.pool.stats();
console.log(poolStats);
```

---

## Migration Scripts

### Create All Recommended Indexes
```javascript
// scripts/create-indexes.js
async function createIndexes() {
  const db = mongoose.connection.db;

  // Users
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ status: 1, createdAt: -1 });

  // Orders
  await db.collection('orders').createIndex({ userId: 1, createdAt: -1 });
  await db.collection('orders').createIndex({ paymentStatus: 1, createdAt: -1 });
  await db.collection('orders').createIndex({ payuTxnId: 1 }, { sparse: true, unique: true });

  // Sessions
  await db.collection('sessions').createIndex({ userId: 1 });
  await db.collection('sessions').createIndex({ sessionCode: 1 }, { unique: true });

  // Add more indexes as needed

  console.log('✅ All indexes created successfully');
}
```

### Remove Unused Indexes
```javascript
// Before: Ensure index is not being used
db.collection.aggregate([{ $indexStats: {} }])

// Then drop if unused
db.collection.dropIndex('indexName')
```

---

## Scaling Recommendations

### Phase 1: Single Instance (Current)
- ✅ Add recommended indexes
- ✅ Implement query optimization
- ✅ Add application-level caching
- ✅ Monitor slow queries

### Phase 2: Replication Set (10K+ users)
```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "host1:27017" },
    { _id: 1, host: "host2:27017" },
    { _id: 2, host: "host3:27017", arbiterOnly: true }
  ]
})
```

### Phase 3: Sharding (100K+ users)
- Shard on `userId` for user-specific data
- Shard on `createdAt` for time-series data
- Monitor shard key cardinality

---

## Performance Targets

| Operation | Target | Current |
|-----------|--------|---------|
| Find single user | < 5ms | ? |
| Find paginated list (20 items) | < 20ms | ? |
| Create order | < 50ms | ? |
| Complex aggregation | < 200ms | ? |
| Bulk update 1000 items | < 500ms | ? |

---

## Troubleshooting

### High CPU Usage
1. Check for missing indexes: `db.collection.aggregate([{ $indexStats: {} }])`
2. Review slow queries: `db.setProfilingLevel(1)` then `db.system.profile.find()`
3. Monitor connection pool: Increase `maxPoolSize` if maxed out

### High Memory Usage
1. Reduce batch sizes in aggregation
2. Use `.lean()` on all read queries
3. Implement pagination
4. Clear unused TTL cache entries

### Slow Writes
1. Check write concern settings
2. Reduce index count on collection
3. Batch multiple writes together

---

**Generated:** December 23, 2024
**Database:** MongoDB Atlas
**Recommended Review:** Monthly
