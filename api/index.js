import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Import all routes
import workshopRoutes from '../server/routes/workshops.js';
import adminRoutes from '../server/routes/admin.js';
import authRoutes from '../server/routes/auth.js';
import visionRoutes from '../server/routes/visions.js';
import goalRoutes from '../server/routes/goals.js';
import taskRoutes from '../server/routes/tasks.js';
import todoRoutes from '../server/routes/todos.js';
import mywordRoutes from '../server/routes/mywords.js';
import healthRoutes from '../server/routes/health.js';
import userRoutes from '../server/routes/users.js';
import cartRoutes from '../server/routes/carts.js';
import adminMongoRoutes from '../server/routes/adminMongo.js';
import contactRoutes from '../server/routes/contact.js';
import milestoneRoutes from '../server/routes/milestones.js';
import reminderRoutes from '../server/routes/reminders.js';
import dailyPlanRoutes from '../server/routes/dailyplans.js';
import accountingRoutes from '../server/routes/accounting.js';
import checkoutRoutes from '../server/routes/checkout.js';
import pageStateRoutes from '../server/routes/pagestate.js';

// API Routes
app.use('/api/page-state', pageStateRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/visions', visionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/mywords', mywordRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/admin-mongo', adminMongoRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/dailyplans', dailyPlanRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/checkout', checkoutRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
