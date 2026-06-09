require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'money-challenge-super-secret-key-10cr';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://Adityas3111N:0Ok0ZbOP01pIxEzS@cluster0.knolz.mongodb.net/todo-db?retryWrites=true&w=majority';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    
    // Programmatically drop legacy single-field unique date indexes if they exist
    const collectionsToClean = ['dailystates', 'consistencylogs'];
    collectionsToClean.forEach(colName => {
      mongoose.connection.db.collection(colName).dropIndex('date_1')
        .then(() => console.log(`Cleared legacy date_1 index from ${colName}`))
        .catch(err => {
          // If index doesn't exist, we can ignore the error
          if (err.codeName !== 'IndexNotFound' && err.code !== 27) {
            console.warn(`Note on index check for ${colName}:`, err.message);
          }
        });
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const NotificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const DailyStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  salesCallsCount: { type: Number, default: 0 },
  salesCallsTarget: { type: Number, default: 10 },
  tasks: [{
    id: { type: String, required: true },
    text: { type: String, required: true },
    completed: { type: Boolean, default: false }
  }]
});
// Create a compound index so date is unique per user
DailyStateSchema.index({ userId: 1, date: 1 }, { unique: true });

const ConsistencyLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  performance: { type: String, enum: ['green', 'yellow', 'red'], required: true },
  tasksCompleted: { type: Number, default: 0 },
  tasksTotal: { type: Number, default: 0 },
  salesCallsCount: { type: Number, default: 0 },
  salesCallsTarget: { type: Number, default: 10 }
});
ConsistencyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

const UserSettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, required: true },
  value: { type: String, required: true }
});
UserSettingsSchema.index({ userId: 1, key: 1 }, { unique: true });

const User = mongoose.model('User', UserSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const DailyState = mongoose.model('DailyState', DailyStateSchema);
const ConsistencyLog = mongoose.model('ConsistencyLog', ConsistencyLogSchema);
const UserSettings = mongoose.model('UserSettings', UserSettingsSchema);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    if (!user || !user.id || !mongoose.Types.ObjectId.isValid(user.id)) {
      return res.status(401).json({ error: 'Invalid user session' });
    }
    req.user = user;
    next();
  });
};

// Admin Middleware
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Auth check failed' });
  }
};

// Helper to calculate performance color
function calculatePerformance(state) {
  const totalTasks = state.tasks.length + 1; // +1 for Sales Calls
  const completedTasks = state.tasks.filter(t => t.completed).length;
  
  const salesCallsDone = state.salesCallsCount;
  const salesCallsTarget = state.salesCallsTarget;

  const salesCompleted = salesCallsDone >= salesCallsTarget;
  const allTasksCompleted = completedTasks === state.tasks.length;

  if (salesCompleted && allTasksCompleted) {
    return 'green';
  } else if (salesCallsDone > 0 || completedTasks > 0) {
    return 'yellow';
  } else {
    return 'red';
  }
}

// Authentication Endpoints

// Signup
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isAdmin = email.toLowerCase() === 'singhaditya4333@gmail.com';

    const newUser = new User({
      email,
      password: hashedPassword,
      isAdmin
    });
    await newUser.save();

    // Notify admin if a new non-admin user signs up
    if (!isAdmin) {
      const newNotification = new Notification({
        message: `New user signup: ${email}`
      });
      await newNotification.save();
    }

    const token = jwt.sign({ id: newUser._id, email: newUser.email, isAdmin: newUser.isAdmin }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, email: newUser.email, isAdmin: newUser.isAdmin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, email: user.email, isAdmin: user.isAdmin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Authenticated State & Task Endpoints

// Get current state and process mid-night transitions if needed
app.post('/api/state', authenticateToken, async (req, res) => {
  const { localDate } = req.body; // YYYY-MM-DD from client
  if (!localDate) {
    return res.status(400).json({ error: 'localDate is required' });
  }

  try {
    const userId = req.user.id;

    // 1. Initialize start date setting if not exists for this user
    let startDateSetting = await UserSettings.findOne({ userId, key: 'countdown_start_date' });
    if (!startDateSetting) {
      startDateSetting = new UserSettings({ userId, key: 'countdown_start_date', value: localDate });
      await startDateSetting.save();
    }

    // 2. Find any active daily state for this user
    let activeState = await DailyState.findOne({ userId }).sort({ date: -1 });

    if (!activeState) {
      // Create new state for today
      activeState = new DailyState({ userId, date: localDate });
      await activeState.save();
    } else if (activeState.date !== localDate) {
      // Date changed! Perform midnight reset evaluation
      const performance = calculatePerformance(activeState);

      // Save to Consistency Log
      await ConsistencyLog.findOneAndUpdate(
        { userId, date: activeState.date },
        {
          performance,
          tasksCompleted: activeState.tasks.filter(t => t.completed).length + (activeState.salesCallsCount >= activeState.salesCallsTarget ? 1 : 0),
          tasksTotal: activeState.tasks.length + 1,
          salesCallsCount: activeState.salesCallsCount,
          salesCallsTarget: activeState.salesCallsTarget
        },
        { upsert: true, new: true }
      );

      // Clean up old active state
      await DailyState.deleteOne({ _id: activeState._id });

      // Create new state for the new day
      activeState = new DailyState({
        userId,
        date: localDate,
        salesCallsTarget: activeState.salesCallsTarget // carry over target
      });
      await activeState.save();
    }

    res.json({
      state: activeState,
      countdownStartDate: startDateSetting.value
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update Sales Calls Count
app.post('/api/sales/count', authenticateToken, async (req, res) => {
  const { localDate, increment } = req.body;
  try {
    const state = await DailyState.findOne({ userId: req.user.id, date: localDate });
    if (!state) return res.status(404).json({ error: 'State not found for today' });

    state.salesCallsCount = Math.max(0, state.salesCallsCount + (increment ? 1 : -1));
    await state.save();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Sales Calls Target
app.post('/api/sales/target', authenticateToken, async (req, res) => {
  const { localDate, target } = req.body;
  try {
    const state = await DailyState.findOne({ userId: req.user.id, date: localDate });
    if (!state) return res.status(404).json({ error: 'State not found for today' });

    state.salesCallsTarget = Math.max(1, target);
    await state.save();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { localDate, text } = req.body;
  try {
    const state = await DailyState.findOne({ userId: req.user.id, date: localDate });
    if (!state) return res.status(404).json({ error: 'State not found for today' });

    const newTask = {
      id: Date.now().toString(),
      text,
      completed: false
    };
    state.tasks.push(newTask);
    await state.save();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Task
app.put('/api/tasks/:id/toggle', authenticateToken, async (req, res) => {
  const { localDate } = req.body;
  const taskId = req.params.id;
  try {
    const state = await DailyState.findOne({ userId: req.user.id, date: localDate });
    if (!state) return res.status(404).json({ error: 'State not found for today' });

    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      await state.save();
    }
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  const { localDate } = req.body;
  const taskId = req.params.id;
  try {
    const state = await DailyState.findOne({ userId: req.user.id, date: localDate });
    if (!state) return res.status(404).json({ error: 'State not found for today' });

    state.tasks = state.tasks.filter(t => t.id !== taskId);
    await state.save();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Consistency Logs for the calendar grid
app.get('/api/logs', authenticateToken, async (req, res) => {
  try {
    const logs = await ConsistencyLog.find({ userId: req.user.id }).sort({ date: 1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Dashboard Endpoints

// Get admin notifications (signup logs)
app.get('/api/admin/notifications', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear admin notifications
app.post('/api/admin/notifications/clear', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await Notification.deleteMany({});
    res.json({ message: 'Notifications cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get registered users list
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, 'email createdAt isAdmin').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export app for serverless environments (like Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
module.exports = app;
