import express from 'express';
import mongoose from 'mongoose';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { simpleParser } from 'mailparser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';

// --- MongoDB Setup ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nexus-hub';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-nexus-hub-2026';

if (process.env.MONGO_URI && process.env.MONGO_URI !== 'YOUR_MONGO_URI_HERE') {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.warn('MONGO_URI is not set. MongoDB will not be connected.');
}

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  thumbnail: { type: String },
  type: { type: String, enum: ['activated_email', 'account', 'service'], default: 'account' },
  stock: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    quantity: Number
  }],
  totalAmount: { type: Number, required: true },
  exactCryptoAmount: { type: Number, required: true },
  cryptoCurrency: { type: String, required: true },
  customerDetails: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

const emailAliasSchema = new mongoose.Schema({
  alias: { type: String, required: true, unique: true },
  status: { type: String, enum: ['admin', 'stocking', 'stocked', 'assigned', 'unassigned'], default: 'stocking' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false },
  deletedMessageCount: { type: Number, default: 0 },
  usedUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
const EmailAlias = mongoose.model('EmailAlias', emailAliasSchema);

const emailSchema = new mongoose.Schema({
  otp: { type: String, required: false },
  fullBody: { type: String, required: true },
  htmlBody: { type: String, required: false },
  recipientAlias: { type: String, required: true },
  from: { type: String, required: false },
  subject: { type: String, required: false },
  status: { type: String, enum: ['pending', 'stock', 'sold', 'admin', 'unassigned'], default: 'pending' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  receivedAt: { type: Date, default: Date.now },
});
const Email = mongoose.model('Email', emailSchema);

const configSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
});
const Config = mongoose.model('Config', configSchema);

// Initialize Config
async function initConfig() {
  if (mongoose.connection.readyState === 1) {
    const modeConfig = await Config.findOne({ key: 'emailMode' });
    if (!modeConfig) {
      await new Config({ key: 'emailMode', value: 'STOCKING' }).save();
    }
  }
}
mongoose.connection.once('open', initConfig);

// --- Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  // Also check for token in cookies
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// --- Express App Setup ---
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25MB' }));
  app.use(express.urlencoded({ limit: '25MB', extended: true }));
  app.use(cookieParser());

  // Middleware to normalize double slashes in URLs
  app.use((req, res, next) => {
    if (req.url.includes('//')) {
      req.url = req.url.replace(/\/+/g, '/');
    }
    next();
  });

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });

      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      if (existingUser) return res.status(400).json({ error: 'Username or email already exists' });

      // Check if user should be admin based on ENV variables or specific email
      let isUserAdmin = false;
      if (email === 'rracfo@gmail.com') {
        isUserAdmin = true;
      }
      for (let i = 1; i <= 5; i++) {
        const adminUsername = process.env[`ADMIN_USER_${i}`];
        if (adminUsername && adminUsername === username) {
          isUserAdmin = true;
          break;
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ username, email, password: hashedPassword, isAdmin: isUserAdmin });
      await newUser.save();

      const token = jwt.sign({ id: newUser._id, username: newUser.username, isAdmin: newUser.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
      
      // Set cookie
      res.cookie('token', token, { 
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });

      res.json({ token, user: { id: newUser._id, username: newUser.username, email: newUser.email, isAdmin: newUser.isAdmin } });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { identifier, password } = req.body; // identifier can be username or email
      if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password required' });

      const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

      // Auto-upgrade to admin if email matches
      if (user.email === 'rracfo@gmail.com' && !user.isAdmin) {
        user.isAdmin = true;
        await user.save();
      }

      const token = jwt.sign({ id: user._id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
      
      // Set cookie
      res.cookie('token', token, { 
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });

      res.json({ token, user: { id: user._id, username: user.username, email: user.email, isAdmin: user.isAdmin } });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // --- Live OTP API ---
  app.get('/api/live-otp/latest', authenticateToken, async (req: any, res) => {
    try {
      let query: any = { assignedTo: req.user.id };
      if (req.user.isAdmin) {
        // Admins can see ALL recent live OTPs regardless of assignment or status
        query = {}; 
      }
      
      // Find the latest 4 emails with an OTP
      const latestEmails = await Email.find({ 
        ...query,
        otp: { $ne: null, $exists: true } 
      })
      .sort({ receivedAt: -1 })
      .limit(4);

      if (!latestEmails || latestEmails.length === 0) {
        return res.status(404).json({ error: 'No OTP found' });
      }

      const formattedOTPs = latestEmails.map(email => ({
        email: email.recipientAlias,
        otp: email.otp,
        receivedAt: email.receivedAt,
        from: email.from,
        subject: email.subject
      }));

      // If only one is requested historically, we return the array. 
      // User can access formattedOTPs[0] for the absolute latest.
      res.json(formattedOTPs);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // --- Shop Routes ---
  app.get('/api/products', async (req, res) => {
    try {
      // Auto-update stocking aliases to stocked if older than 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const aliasesToStock = await EmailAlias.find({ status: 'stocking', createdAt: { $lte: sevenDaysAgo } }).lean();
      
      for (const alias of aliasesToStock as any) {
        await EmailAlias.updateOne({ _id: alias._id }, { $set: { status: 'stocked' } });
        // Update all emails for this alias
        await Email.updateMany({ recipientAlias: alias.alias, status: 'pending' }, { $set: { status: 'stock' } });
      }

      const products = await Product.find().lean();
      
      // Calculate dynamic stock for 'activated_email' products
      const stockCount = await EmailAlias.countDocuments({ status: 'stocked' });
      
      const productsWithDynamicStock = products.map(p => {
        if (p.type === 'activated_email') {
          return { ...p, stock: stockCount };
        }
        return p;
      });

      res.json(productsWithDynamicStock);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // --- Checkout Route ---
  app.post('/api/checkout', authenticateToken, async (req: any, res) => {
    try {
      const { items, customerDetails, cryptoCurrency } = req.body;
      if (!items || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

      let totalAmount = 0;
      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) return res.status(400).json({ error: `Product not found: ${item.name}` });
        totalAmount += product.price * item.quantity;
      }

      // Add random cents for tracking (e.g., 15.00 -> 15.07)
      const randomCents = Math.floor(Math.random() * 99) + 1;
      const exactCryptoAmount = totalAmount + (randomCents / 100);

      const order = new Order({
        userId: req.user.id,
        items,
        totalAmount,
        exactCryptoAmount,
        cryptoCurrency,
        customerDetails,
        status: 'pending'
      });

      await order.save();
      res.json({ orderId: order._id, exactCryptoAmount, cryptoCurrency });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // --- User Emails Route ---
  app.get('/api/my-emails', authenticateToken, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20; // Default to 20 for reliability
      const skip = parseInt(req.query.skip as string) || 0;

      let query: any = { assignedTo: req.user.id };
      if (req.user.isAdmin) {
        query = { $or: [{ assignedTo: req.user.id }, { status: 'admin' }, { status: 'pending' }] };
      }
      
      const emails = await Email.find(query)
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
        
      res.json(emails);
    } catch (err) {
      console.error('[API MY-EMAILS] Error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Keep single fetch just in case, but standard list will now have everything
  app.get('/api/my-emails/:id', authenticateToken, async (req: any, res) => {
    try {
      let query: any = { _id: req.params.id, assignedTo: req.user.id };
      if (req.user.isAdmin) {
        query = { _id: req.params.id };
      }
      const email = await Email.findOne(query).lean();
      if (!email) return res.status(404).json({ error: 'Email not found' });
      res.json(email);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/my-aliases', authenticateToken, async (req: any, res) => {
    try {
      let query: any = { assignedTo: req.user.id };
      if (req.user.isAdmin) {
        query = {}; // Admins can see all aliases to assign them
      }
      const aliases = await EmailAlias.find(query).sort({ createdAt: -1 }).lean();
      res.json(aliases);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/my-aliases/:id', authenticateToken, async (req: any, res) => {
    try {
      let query: any = { _id: req.params.id, assignedTo: req.user.id };
      if (req.user.isAdmin) {
        query = { _id: req.params.id };
      }
      await EmailAlias.findOneAndUpdate(query, { isDeleted: true });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/my-aliases/:id/restore', authenticateToken, async (req: any, res) => {
    try {
      let query: any = { _id: req.params.id, assignedTo: req.user.id };
      if (req.user.isAdmin) {
        query = { _id: req.params.id };
      }
      await EmailAlias.findOneAndUpdate(query, { isDeleted: false, deletedMessageCount: 0 });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/my-emails/:id', authenticateToken, async (req: any, res) => {
    try {
      await Email.findOneAndDelete({ _id: req.params.id, assignedTo: req.user.id });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // --- Admin Routes ---
  app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
      const users = await User.find().select('-password');
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/emails/:id/assign', authenticateToken, isAdmin, async (req, res) => {
    try {
      const { userId } = req.body;
      const newEmailStatus = userId ? 'sold' : 'unassigned';
      const email = await Email.findByIdAndUpdate(req.params.id, { assignedTo: userId || null, status: newEmailStatus }, { new: true });
      res.json(email);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/emails/assign-by-alias', authenticateToken, isAdmin, async (req, res) => {
    try {
      const { recipientAlias, userId } = req.body;
      
      const newAliasStatus = userId ? 'assigned' : 'unassigned';
      const newEmailStatus = userId ? 'sold' : 'unassigned';

      // Update all emails with this recipient alias
      await Email.updateMany(
        { recipientAlias },
        { $set: { assignedTo: userId || null, status: newEmailStatus } }
      );
      
      // Also update the EmailAlias document
      await EmailAlias.findOneAndUpdate(
        { alias: recipientAlias },
        { $set: { assignedTo: userId || null, status: newAliasStatus } }
      );
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/config', authenticateToken, isAdmin, async (req, res) => {
    try {
      const config = await Config.find();
      res.json(config);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/config', authenticateToken, isAdmin, async (req, res) => {
    try {
      const { key, value } = req.body;
      await Config.findOneAndUpdate({ key }, { value }, { upsert: true });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/products', authenticateToken, isAdmin, async (req, res) => {
    try {
      const product = new Product(req.body);
      await product.save();
      res.json(product);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
    try {
      const orders = await Order.find().populate('userId', 'username email').sort({ createdAt: -1 });
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/orders/:id/complete', authenticateToken, isAdmin, async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      order.status = 'completed';
      await order.save();

      // If order contains activated_emails, assign them
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product && product.type === 'activated_email') {
          const aliasesToAssign = await EmailAlias.find({ status: 'stocked' }).limit(item.quantity);
          for (const aliasDoc of aliasesToAssign) {
            aliasDoc.status = 'assigned';
            aliasDoc.assignedTo = order.userId;
            await aliasDoc.save();
            
            // Update all existing emails for this alias
            await Email.updateMany(
              { recipientAlias: aliasDoc.alias },
              { $set: { status: 'sold', assignedTo: order.userId } }
            );
          }
        }
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/emails', authenticateToken, isAdmin, async (req, res) => {
    try {
      const mode = req.query.mode;
      const limit = parseInt(req.query.limit as string) || 20; // Default to 20
      const skip = parseInt(req.query.skip as string) || 0;

      let query: any = { status: { $ne: 'sold' } };
      
      if (mode === 'admin') {
        query.status = 'admin';
      } else if (mode === 'stocking') {
        query.status = { $in: ['pending', 'stock'] };
      }
      
      const emails = await Email.find(query)
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
        
      res.json(emails);
    } catch (err) {
      console.error('[API ADMIN-EMAILS] Error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/aliases', authenticateToken, isAdmin, async (req, res) => {
    try {
      const aliases = await EmailAlias.find().populate('assignedTo', 'username email').sort({ createdAt: -1 }).lean();
      res.json(aliases);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/aliases/:id/toggle-used', authenticateToken, isAdmin, async (req, res) => {
    try {
      const alias = await EmailAlias.findById(req.params.id);
      if (!alias) return res.status(404).json({ error: 'Alias not found' });
      
      const now = Date.now();
      const isCurrentlyUsed = alias.usedUntil && new Date(alias.usedUntil).getTime() > now;
      
      if (isCurrentlyUsed) {
        alias.usedUntil = null; // Unmark
      } else {
        alias.usedUntil = new Date(now + 24 * 60 * 60 * 1000); // Set 24h timer
      }
      
      await alias.save();
      res.json({ success: true, alias });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/emails/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
      await Email.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/emails', authenticateToken, isAdmin, async (req, res) => {
    try {
      await Email.deleteMany({ status: 'admin' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // --- Automation Routes (API Logger & Job Manager) ---
  const activeBots = new Map<string, { lastSeen: number }>();
  
  const jobManager = {
    activeJobs: new Map<string, any>(),
    currentTasks: new Map<string, any>(),
    summaries: new Map<string, any>(),
    globalJob: null as any,
    globalTask: null as any,
    globalSummary: null as any
  };

  const getOnlineBots = () => {
    const now = Date.now();
    const online: string[] = [];
    activeBots.forEach((data, botId) => {
      if (now - data.lastSeen < 20000) { 
        online.push(botId);
      } else {
        activeBots.delete(botId);
      }
    });
    return online;
  };

  app.post('/api/bot/heartbeat', (req, res) => {
    const { botId } = req.body;
    if (botId) {
      activeBots.set(botId, { lastSeen: Date.now() });
    }
    res.json({ success: true, onlineCount: getOnlineBots().length });
  });

  app.post('/api/bot/task/reply', (req, res) => {
    const { action, taskId } = req.body;
    
    // 1. Check Global Upload Job
    if (action === '-1' && jobManager.globalTask && jobManager.globalTask.id === taskId) {
      if (!jobManager.globalJob) {
          jobManager.globalTask = null;
          return res.json({ success: true, message: 'Global job already ended.' });
      }

      jobManager.globalJob.completedCount++;
      jobManager.globalTask = null; // Clear from history immediately
      
      const isTimeout = Date.now() > jobManager.globalJob.endTime;
      const isTargetReached = jobManager.globalJob.completedCount >= jobManager.globalJob.targetCount;

      console.log(`✅ [GLOBAL TASK COMPLETED] Task ${taskId} finished. Target: ${jobManager.globalJob.completedCount}/${jobManager.globalJob.targetCount}`);

      if (isTimeout || isTargetReached) {
        // Stop Job, print summary
        const status = isTimeout ? 'TIMEOUT' : 'GOAL_REACHED';
        const timeElapsed = ((Date.now() - jobManager.globalJob.startTime) / 60000).toFixed(1);
        jobManager.globalSummary = {
          status,
          target: jobManager.globalJob.targetCount,
          completed: jobManager.globalJob.completedCount,
          timeLeft: Math.max(0, jobManager.globalJob.targetCount - jobManager.globalJob.completedCount),
          timeElapsed
        };
        jobManager.globalJob = null;
        console.log(`🛑 [GLOBAL JOB ENDED] ${status} | Target: ${jobManager.globalSummary.target} | Done: ${jobManager.globalSummary.completed}`);
      } else {
        // Spawn Next
        const nextTaskId = 'T' + Math.floor(1000 + Math.random() * 9000);
        // Random available bot
        const onlineArr = Array.from(activeBots.keys());
        const randomTargetBot = onlineArr.length > 0 ? onlineArr[Math.floor(Math.random() * onlineArr.length)] : null;
        
        const idx = jobManager.globalJob.completedCount;
        const nextTaskInfo = jobManager.globalJob.uploadTasks[idx];
        jobManager.globalTask = {
          id: nextTaskId,
          command: '+1',
          action: 'Upload',
          targetBot: randomTargetBot,
          ...nextTaskInfo
        };
        
        console.log(`🚀 [GLOBAL NEXT TASK ADDED] ${nextTaskId}. TargetBot: ${randomTargetBot}`);
      }
      return res.json({ success: true });
    }

    // 2. Check Individual Bot Jobs
    for (let [botId, task] of jobManager.currentTasks.entries()) {
      if (action === '-1' && task && task.id === taskId) {
        const job = jobManager.activeJobs.get(botId);
        if (!job) {
          jobManager.currentTasks.delete(botId);
          return res.json({ success: true, message: 'Bot Job already ended.' });
        }

        job.completedCount++;
        jobManager.currentTasks.delete(botId);
        
        const isTimeout = Date.now() > job.endTime;
        const isTargetReached = job.completedCount >= job.targetCount;

        console.log(`✅ [TASK COMPLETED] Bot ${botId} - Task ${taskId} finished. Target: ${job.completedCount}/${job.targetCount}`);

        if (isTimeout || isTargetReached) {
          const status = isTimeout ? 'TIMEOUT' : 'GOAL_REACHED';
          const timeElapsed = ((Date.now() - job.startTime) / 60000).toFixed(1);
          jobManager.summaries.set(botId, {
            status,
            target: job.targetCount,
            completed: job.completedCount,
            timeLeft: Math.max(0, job.targetCount - job.completedCount),
            timeElapsed
          });
          jobManager.activeJobs.delete(botId);
          console.log(`🛑 [BOT JOB ENDED] ${botId} - ${status} | Target: ${jobManager.summaries.get(botId).target}`);
        } else {
          // Spawn Next
          const nextTaskId = 'T' + Math.floor(1000 + Math.random() * 9000);
          jobManager.currentTasks.set(botId, {
            id: nextTaskId,
            command: '+1',
            action: 'Email',
            targetBot: botId,
            password: job.password
          });
          console.log(`🚀 [NEXT TASK ADDED] Bot ${botId} - Task ${nextTaskId}`);
        }
        
        return res.json({ success: true });
      }
    }
    
    res.json({ success: false, error: 'Task ID mismatch or invalid action' });
  });

  app.get('/api/admin/automation/status', authenticateToken, isAdmin, (req, res) => {
    // Generate an array of all jobs to render
    const allJobs: any[] = [];
    
    if (jobManager.globalJob || jobManager.globalSummary) {
      allJobs.push({
        botId: 'GLOBAL_UPLOAD',
        job: jobManager.globalJob,
        task: jobManager.globalTask,
        summary: jobManager.globalSummary
      });
    }

    // Add active jobs
    for (let [botId, job] of jobManager.activeJobs.entries()) {
      allJobs.push({
        botId,
        job: job,
        task: jobManager.currentTasks.get(botId),
        summary: jobManager.summaries.get(botId) || null
      });
    }

    // Add summaries for bots that are no longer active
    for (let [botId, summary] of jobManager.summaries.entries()) {
       if (!jobManager.activeJobs.has(botId)) {
          allJobs.push({
             botId,
             job: null,
             task: null,
             summary: summary
          });
       }
    }

    res.json({
      onlineBots: getOnlineBots(),
      jobs: allJobs,
      
      // Keep legacy fields so frontend doesn't crash during transition (optional, but defensive)
      activeJob: null,
      currentTask: null, 
      summary: null
    });
  });

  // START JOB
  app.post('/api/admin/automation/job/start', authenticateToken, isAdmin, async (req, res) => {
    const { password, timer, targetCount, type = 'email', uploadTasks = [], targetBots = [] } = req.body;
    
    // Fallback if targetBots is empty: use all currently online bots
    let botsToUse = targetBots;
    if (!botsToUse || botsToUse.length === 0) {
       botsToUse = getOnlineBots();
    }
    
    if (botsToUse.length === 0) {
       return res.status(400).json({ error: 'No bots are currently online or selected.' });
    }

    const mins = parseInt(timer);
    const count = parseInt(targetCount);
    let successBots = [];

    if (type === 'upload') {
      if (jobManager.globalJob) {
        return res.status(400).json({ error: 'A global upload job is already running' });
      }

      // For upload jobs, fetch admin aliases that are NOT on cooldown
      const now = Date.now();
      let adminAliases = await EmailAlias.find({ 
        status: 'admin', 
        $or: [{ usedUntil: null }, { usedUntil: { $lte: new Date(now) } }] 
      });

      if (adminAliases.length === 0) {
        return res.status(400).json({ error: 'No available aged admin accounts found. All might be on 24h cooldown.' });
      }

      if (uploadTasks.length > adminAliases.length) {
        return res.status(400).json({ error: `Not enough available aged accounts. Required: ${uploadTasks.length}, Available: ${adminAliases.length}` });
      }

      // Shuffle available aliases
      adminAliases = adminAliases.sort(() => 0.5 - Math.random());

      let jobTasks = [];
      for (let i = 0; i < uploadTasks.length; i++) {
        const assignedAlias = adminAliases[i];
        jobTasks.push({
          ...uploadTasks[i],
          email: assignedAlias.alias,
          password
        });
        
        // Lock this alias for 24 hours immediately
        assignedAlias.usedUntil = new Date(now + 24 * 60 * 60 * 1000);
        await assignedAlias.save();
      }

      if (jobTasks.length === 0) {
        return res.status(400).json({ error: 'No valid tasks provided for upload job.' });
      }

      jobManager.globalJob = {
        id: 'J' + Math.floor(1000 + Math.random() * 9000),
        type: 'upload',
        password,
        targetCount: jobTasks.length,
        completedCount: 0,
        endTime: Date.now() + (mins * 60000),
        startTime: Date.now(),
        uploadTasks: jobTasks
      };
      
      jobManager.globalSummary = null;

      // Dispatch first global task
      const taskId = 'T' + Math.floor(1000 + Math.random() * 9000);
      const firstTargetBot = botsToUse[Math.floor(Math.random() * botsToUse.length)];
      
      jobManager.globalTask = {
        id: taskId,
        command: '+1',
        action: 'Upload',
        targetBot: firstTargetBot,
        ...jobTasks[0]
      };

      console.log(`\n======================================================`);
      console.log(`🟢 [GLOBAL UPLOAD STARTED] ID: ${jobManager.globalJob.id} | Bots Pool: ${botsToUse.join(', ')}`);
      console.log(`🎯 Target: ${jobTasks.length} | ⏳ Timer: ${mins} Mins`);
      console.log(`======================================================\n`);
      
      return res.json({ success: true });

    } else {
      // Email Job per Bot
      for (const botId of botsToUse) {
        if (jobManager.activeJobs.has(botId)) {
          console.warn(`[START] Bot ${botId} is already running a job, skipping new start command for this bot.`);
          continue;
        }

        const jobId = 'J' + Math.floor(1000 + Math.random() * 9000);
        const taskId = 'T' + Math.floor(1000 + Math.random() * 9000);

        jobManager.activeJobs.set(botId, {
          id: jobId,
          type: 'email',
          password,
          targetCount: count,
          completedCount: 0,
          endTime: Date.now() + (mins * 60000),
          startTime: Date.now(),
          targetBot: botId
        });

        jobManager.summaries.delete(botId);

        jobManager.currentTasks.set(botId, {
          id: taskId,
          command: '+1',
          action: 'Email',
          targetBot: botId,
          password
        });
        
        successBots.push(botId);
        
        console.log(`🟢 [BOT JOB STARTED] Bot: ${botId} | ID: ${jobId} | Target: ${count}`);
      }

      if (successBots.length === 0) {
        return res.status(400).json({ error: 'All selected bots are already running a job.' });
      }

      res.json({ success: true, message: `Started on ${successBots.length} bots.` });
    }
  });

  // VERIFY GAME ID
  app.get('/api/admin/verify-game/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
      // Validate game ID by checking Roblox universe/place endpoint
      // Using an open Roblox API: checking thumbnail gives 200 vs 400 for invalid
      const roboxRes = await fetch(`https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${req.params.id}&size=50x50&format=Png&isCircular=false`);
      if (roboxRes.ok) {
        const data = await roboxRes.json();
        if (data && data.data && data.data.length > 0 && data.data[0].state === 'Completed') {
          return res.json({ success: true, valid: true });
        }
      }
      res.json({ success: true, valid: false });
    } catch {
      res.json({ success: true, valid: false }); // Fallback to invalid if API blocks
    }
  });

  // STOP JOB
  app.post('/api/admin/automation/job/stop', authenticateToken, isAdmin, (req, res) => {
    const { botId } = req.body;
    
    if (botId === 'GLOBAL_UPLOAD') {
      if (jobManager.globalJob) {
        const timeElapsed = ((Date.now() - jobManager.globalJob.startTime) / 60000).toFixed(1);
        jobManager.globalSummary = {
          status: 'MANUAL_STOP',
          target: jobManager.globalJob.targetCount,
          completed: jobManager.globalJob.completedCount,
          timeLeft: Math.max(0, jobManager.globalJob.targetCount - jobManager.globalJob.completedCount),
          timeElapsed
        };
        console.log(`🛑 [GLOBAL UPLOAD STOPPED] Done: ${jobManager.globalSummary.completed}/${jobManager.globalSummary.target}`);
        jobManager.globalJob = null;
        jobManager.globalTask = null;
      }
    } else if (botId) {
      if (jobManager.activeJobs.has(botId)) {
        const job = jobManager.activeJobs.get(botId);
        const timeElapsed = ((Date.now() - job.startTime) / 60000).toFixed(1);
        jobManager.summaries.set(botId, {
          status: 'MANUAL_STOP',
          target: job.targetCount,
          completed: job.completedCount,
          timeLeft: Math.max(0, job.targetCount - job.completedCount),
          timeElapsed
        });
        console.log(`🛑 [BOT JOB STOPPED] ${botId} Done: ${job.completedCount}/${job.targetCount}`);
        jobManager.activeJobs.delete(botId);
        jobManager.currentTasks.delete(botId);
      }
    } else {
      // If no botId specific, fallback to stopping everything (legacy format stop)
      if (jobManager.globalJob) {
        const timeElapsed = ((Date.now() - jobManager.globalJob.startTime) / 60000).toFixed(1);
        jobManager.globalSummary = {
          status: 'MANUAL_STOP',
          target: jobManager.globalJob.targetCount,
          completed: jobManager.globalJob.completedCount,
          timeLeft: Math.max(0, jobManager.globalJob.targetCount - jobManager.globalJob.completedCount),
          timeElapsed
        };
        jobManager.globalJob = null;
        jobManager.globalTask = null;
      }
      for (const [key, job] of jobManager.activeJobs.entries()) {
        const timeElapsed = ((Date.now() - job.startTime) / 60000).toFixed(1);
        jobManager.summaries.set(key, {
          status: 'MANUAL_STOP',
          target: job.targetCount,
          completed: job.completedCount,
          timeLeft: Math.max(0, job.targetCount - job.completedCount),
          timeElapsed
        });
        jobManager.activeJobs.delete(key);
        jobManager.currentTasks.delete(key);
      }
    }

    res.json({ success: true });
  });

  // Public endpoint for the user to view API history
  app.get('/api/automation/history/:botId?', (req, res) => {
    // Determine the bot requesting the history (optional params, but recommended)
    const requestingBot = (req.params.botId || req.query.botId) as string;

    let taskForBot = null;
    let isJobActive = false;

    // 1. Is there a global task assigned to this bot?
    if (jobManager.globalTask) {
        if (!jobManager.globalTask.targetBot || jobManager.globalTask.targetBot === requestingBot) {
             taskForBot = jobManager.globalTask;
        } else if (!requestingBot) {
             taskForBot = jobManager.globalTask; // For generic panel view
        }
        isJobActive = !!jobManager.globalJob;
    }

    // 2. Is there a specific email task? (This can override generic panel view, or take precedence if explicitly targetted)
    if (!taskForBot && requestingBot && jobManager.currentTasks.has(requestingBot)) {
        taskForBot = jobManager.currentTasks.get(requestingBot);
        isJobActive = true;
    } else if (!taskForBot && !requestingBot) {
        // Return ANY email task for the panel view if no global task was found
        if (jobManager.currentTasks.size > 0) {
           taskForBot = Array.from(jobManager.currentTasks.values())[0];
           isJobActive = true;
        }
    }

    res.json({
      status: 'active',
      isJobActive,
      history: taskForBot ? [taskForBot] : []
    });
  });

  // Dummy route to absorb any stray bot logs if they still hit it
  app.post('/api/automation/report', (req, res) => {
    res.json({ status: 'ok' });
  });


  // --- Webhook Route (Email Receiver) ---
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is awake' });
  });

  app.post('/api/webhook/email', async (req, res) => {
    console.log(`[EMAIL WEBHOOK] Received request at ${new Date().toISOString()}`);
    console.log(`[EMAIL WEBHOOK] Headers:`, JSON.stringify(req.headers));
    
    try {
      const authHeader = req.headers.authorization;
      const xAuthKey = req.headers['x-auth-key'];
      const expectedAuth = process.env.API_SECRET_KEY || 'keyxxx';
      
      const isAuthorized = 
        (authHeader && authHeader === `Bearer ${expectedAuth}`) || 
        (xAuthKey && xAuthKey === expectedAuth);

      if (!isAuthorized) {
        console.warn(`[EMAIL WEBHOOK] Unauthorized access attempt. Provided authHeader: ${authHeader}, xAuthKey: ${xAuthKey}`);
        return res.status(401).json({ error: 'Unauthorized' });
      }

      console.log(`[EMAIL WEBHOOK] Authorization successful.`);

      if (mongoose.connection.readyState !== 1) {
        console.error(`[EMAIL WEBHOOK] Database not connected. ReadyState: ${mongoose.connection.readyState}`);
        return res.status(503).json({ error: 'Database not connected' });
      }

      const modeConfig = await Config.findOne({ key: 'emailMode' });
      const currentMode = modeConfig ? modeConfig.value : 'STOCKING';
      console.log(`[EMAIL WEBHOOK] Current email mode: ${currentMode}`);

      const { to, from, subject, body } = req.body;
      console.log(`[EMAIL WEBHOOK] Parsed body fields - To: ${to}, From: ${from}, Subject: ${subject}, Body Length: ${body ? body.length : 0}`);
      
      if (!to || !body) {
        console.error(`[EMAIL WEBHOOK] Missing required fields. to: ${!!to}, body: ${!!body}`);
        return res.status(400).json({ error: 'Missing required fields: to, body' });
      }

      let parsedText = '';
      let parsedHtml = '';
      
      if (body.includes('MIME-Version:') || body.includes('Content-Type:')) {
        console.log(`[EMAIL WEBHOOK] Body looks like raw MIME, attempting to parse...`);
        try {
          const parsed = await simpleParser(body);
          parsedText = parsed.text || '';
          parsedHtml = parsed.html || '';
          console.log(`[EMAIL WEBHOOK] MIME parsing successful. Text length: ${parsedText.length}, HTML length: ${parsedHtml.length}`);
        } catch (parseErr) {
          console.error('[EMAIL WEBHOOK] Error parsing email body:', parseErr);
        }
      } else {
        console.log(`[EMAIL WEBHOOK] Body is not raw MIME, using as plain text.`);
        parsedText = body;
      }

      // Extract OTP
      let otp = null;
      const searchText = parsedText || parsedHtml || body;
      const keywordRegex = /(?:(?:otp|code|pin|password|verification|token)[\s\S]{0,150}?\b(?!(?:19|20)\d{2}\b)(\d{4,8})\b)|(?:\b(?!(?:19|20)\d{2}\b)(\d{4,8})\b[\s\S]{0,150}?(?:otp|code|pin|password|verification|token))/i;
      const keywordMatch = searchText.match(keywordRegex);
      if (keywordMatch) {
        otp = keywordMatch[1] || keywordMatch[2];
        console.log(`[EMAIL WEBHOOK] Extracted OTP: ${otp}`);
      } else {
        console.log(`[EMAIL WEBHOOK] No OTP found in email content.`);
      }

      // Check or create EmailAlias to determine permanent status
      let aliasDoc = await EmailAlias.findOne({ alias: to });
      let finalStatus = 'pending';
      let assignedTo = null;

      if (!aliasDoc) {
        if (String(currentMode).toUpperCase() === 'OFF') {
          // Special case for OFF mode: don't create alias, save as admin email
          finalStatus = 'admin';
          console.log(`[EMAIL WEBHOOK] Mode is OFF and no alias found for ${to}. Saving as admin email without alias.`);
        } else {
          let initialStatus = 'stocking';
          if (String(currentMode).toUpperCase() === 'ADMIN') initialStatus = 'admin';
          
          aliasDoc = new EmailAlias({ alias: to, status: initialStatus });
          await aliasDoc.save();
          console.log(`[EMAIL WEBHOOK] Created new EmailAlias for ${to} with status ${initialStatus}`);
          
          if (aliasDoc.status === 'admin') finalStatus = 'admin';
          else finalStatus = 'pending';
        }
      } else {
        console.log(`[EMAIL WEBHOOK] Found existing EmailAlias for ${to} with status ${aliasDoc.status}`);
        
        if (aliasDoc.isDeleted) {
          if (aliasDoc.status === 'admin') {
            console.log(`[EMAIL WEBHOOK] Alias ${to} is deleted but status is ADMIN. Saving anyway.`);
          } else {
            console.log(`[EMAIL WEBHOOK] Alias ${to} is deleted. Incrementing deletedMessageCount and skipping email save.`);
            aliasDoc.deletedMessageCount = (aliasDoc.deletedMessageCount || 0) + 1;
            await aliasDoc.save();
            return res.status(200).json({ success: true, message: 'Email skipped for deleted alias' });
          }
        }

        // Map alias status to email status
        if (aliasDoc.status === 'admin') finalStatus = 'admin';
        else if (aliasDoc.status === 'stocked') finalStatus = 'stock';
        else if (aliasDoc.status === 'assigned') finalStatus = 'sold';
        else if (aliasDoc.status === 'unassigned') finalStatus = 'unassigned';
        assignedTo = aliasDoc.assignedTo;
      }

      console.log(`[EMAIL WEBHOOK] Saving email with status: ${finalStatus}`);

      const newEmail = new Email({
        otp,
        fullBody: parsedText || body,
        htmlBody: parsedHtml || '',
        recipientAlias: to,
        from,
        subject,
        status: finalStatus,
        assignedTo: assignedTo
      });
      await newEmail.save();
      
      console.log(`[EMAIL WEBHOOK] Email saved successfully with ID: ${newEmail._id}`);

      res.status(200).json({ success: true, message: `Email saved as ${finalStatus}` });
    } catch (error) {
      console.error('[EMAIL WEBHOOK] Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // SPA Fallback - Exclude API and other functional routes
    app.get('*', (req, res) => {
      // If it's an API route that wasn't matched, return 404 instead of index.html
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      
      const indexPath = path.join(distPath, 'index.html');
      
      // Specifically check if file exists to provide better error feedback
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`[SERVER ERROR] Failed to send index.html: ${err.message}`);
          res.status(500).send(`
            <h1>Production Build Missing</h1>
            <p>The file <b>/dist/index.html</b> was not found.</p>
            <p>Please make sure you have run <b>npm run build</b> on your server before starting.</p>
            <p>Current Directory: ${process.cwd()}</p>
          `);
        }
      });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
