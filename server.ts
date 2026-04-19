import express from 'express';
import mongoose from 'mongoose';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { simpleParser } from 'mailparser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

// --- MongoDB Setup ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nexus-hub';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-jwt-secret';
const API_SECRET_KEY = process.env.API_SECRET_KEY || 'your-api-secret-key';

if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
}

// --- Schemas ---
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

const botLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  details: { type: String },
  status: { type: String, enum: ['success', 'error', 'info'], default: 'info' },
  timestamp: { type: Date, default: Date.now }
});
const BotLog = mongoose.model('BotLog', botLogSchema);

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  name: { type: String, default: 'Unknown Device' },
  lastSeen: { type: Date, default: Date.now },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  targetState: { type: String, enum: ['START', 'STOP'], default: 'STOP' },
  timerValue: { type: Number, default: 0 },
  startTime: { type: Date, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
});
const Device = mongoose.model('Device', deviceSchema);

// --- Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
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

// --- API Routes ---
async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '25MB' }));
  app.use(express.urlencoded({ limit: '25MB', extended: true }));
  app.use(cookieParser());

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });

      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      if (existingUser) return res.status(400).json({ error: 'Username or email already exists' });

      // Admin verification logic
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',');
      const isUserAdmin = adminEmails.includes(email);

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ username, email, password: hashedPassword, isAdmin: isUserAdmin });
      await newUser.save();

      const token = jwt.sign({ id: newUser._id, username: newUser.username, isAdmin: newUser.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
      
      res.cookie('token', token, { 
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });

      res.json({ token, user: { id: newUser._id, username: newUser.username, email: newUser.email, isAdmin: newUser.isAdmin } });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { identifier, password } = req.body;
      const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: user._id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
      
      res.cookie('token', token, { 
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000,
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

  // --- Feature Routes ---
  app.get('/api/live-otp/latest', authenticateToken, async (req: any, res) => {
    try {
      let query: any = { assignedTo: req.user.id };
      if (req.user.isAdmin) {
        query = {}; 
      }
      
      const latestEmails = await Email.find({ 
        ...query,
        otp: { $ne: null, $exists: true } 
      })
      .sort({ receivedAt: -1 })
      .limit(4);

      res.json(latestEmails.map(email => ({
        email: email.recipientAlias,
        otp: email.otp,
        receivedAt: email.receivedAt,
        from: email.from,
        subject: email.subject
      })));
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/products', async (req, res) => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await EmailAlias.updateMany(
        { status: 'stocking', createdAt: { $lte: sevenDaysAgo } }, 
        { $set: { status: 'stocked' } }
      );
      
      const products = await Product.find().lean();
      const stockCount = await EmailAlias.countDocuments({ status: 'stocked' });
      
      res.json(products.map(p => p.type === 'activated_email' ? { ...p, stock: stockCount } : p));
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/checkout', authenticateToken, async (req: any, res) => {
    try {
      const { items, customerDetails, cryptoCurrency } = req.body;
      if (!items || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

      let totalAmount = 0;
      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (product) totalAmount += product.price * item.quantity;
      }

      const exactCryptoAmount = totalAmount + (Math.floor(Math.random() * 99) + 1) / 100;

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

  app.get('/api/my-emails', authenticateToken, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = parseInt(req.query.skip as string) || 0;
      let query: any = { assignedTo: req.user.id };
      if (req.user.isAdmin) {
        query = { $or: [{ assignedTo: req.user.id }, { status: 'admin' }, { status: 'pending' }] };
      }
      const emails = await Email.find(query).sort({ receivedAt: -1 }).skip(skip).limit(limit).lean();
      res.json(emails);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/my-aliases', authenticateToken, async (req: any, res) => {
    try {
      let query: any = { assignedTo: req.user.id };
      if (req.user.isAdmin) query = {};
      const aliases = await EmailAlias.find(query).sort({ createdAt: -1 }).lean();
      res.json(aliases);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/my-aliases/:id', authenticateToken, async (req: any, res) => {
    try {
      let query: any = { _id: req.params.id, assignedTo: req.user.id };
      if (req.user.isAdmin) query = { _id: req.params.id };
      await EmailAlias.findOneAndUpdate(query, { isDeleted: true });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/my-aliases/:id/restore', authenticateToken, async (req: any, res) => {
    try {
      let query: any = { _id: req.params.id, assignedTo: req.user.id };
      if (req.user.isAdmin) query = { _id: req.params.id };
      await EmailAlias.findOneAndUpdate(query, { isDeleted: false, deletedMessageCount: 0 });
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
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product && product.type === 'activated_email') {
          const aliases = await EmailAlias.find({ status: 'stocked' }).limit(item.quantity);
          for (const a of aliases) {
            a.status = 'assigned';
            a.assignedTo = order.userId;
            await a.save();
            await Email.updateMany({ recipientAlias: a.alias }, { $set: { status: 'sold', assignedTo: order.userId } });
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
      const { mode, limit = 20, skip = 0 } = req.query;
      let query: any = { status: { $ne: 'sold' } };
      if (mode === 'admin') query.status = 'admin';
      else if (mode === 'stocking') query.status = { $in: ['pending', 'stock'] };
      const emails = await Email.find(query).sort({ receivedAt: -1 }).skip(Number(skip)).limit(Number(limit)).lean();
      res.json(emails);
    } catch (err) {
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

  app.delete('/api/admin/emails/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
      await Email.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // --- Bot & Device Management ---
  app.get('/api/admin/bot/status', authenticateToken, isAdmin, async (req, res) => {
    try {
      const status = await Config.findOne({ key: 'botStatus' }) || { value: 'STOPPED' };
      const successCount = await BotLog.countDocuments({ status: 'success' });
      const errorCount = await BotLog.countDocuments({ status: 'error' });
      const lastRun = await BotLog.findOne().sort({ timestamp: -1 });
      res.json({ isRunning: status.value === 'RUNNING', stats: { success: successCount, errors: errorCount }, lastRun: lastRun?.timestamp || null });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/bot/toggle', authenticateToken, isAdmin, async (req, res) => {
    try {
      const statusDoc = await Config.findOne({ key: 'botStatus' });
      const newStatus = statusDoc?.value === 'RUNNING' ? 'STOPPED' : 'RUNNING';
      await Config.findOneAndUpdate({ key: 'botStatus' }, { value: newStatus }, { upsert: true });
      await new BotLog({ action: `BOT_${newStatus}`, details: `Automation manual toggle.`, status: 'info' }).save();
      res.json({ success: true, isRunning: newStatus === 'RUNNING' });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/bot/logs', authenticateToken, isAdmin, async (req, res) => {
    try {
      const logs = await BotLog.find().sort({ timestamp: -1 }).limit(10);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/devices/heartbeat', async (req, res) => {
    try {
      const { deviceId, name, secret, metadata } = req.body;
      if (secret !== API_SECRET_KEY) return res.status(401).json({ error: 'Unauthorized' });
      const device = await Device.findOneAndUpdate(
        { deviceId },
        { name, lastSeen: new Date(), status: 'online', $set: { 'metadata.ip': req.ip, 'metadata.taskActive': metadata?.taskActive } },
        { upsert: true, new: true }
      );
      res.json({ success: true, device });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/devices', authenticateToken, isAdmin, async (req, res) => {
    try {
      const devices = await Device.find().sort({ lastSeen: -1 });
      const processed = devices.map(d => {
        const doc = d.toObject();
        const isOffline = (Date.now() - new Date(doc.lastSeen).getTime()) > 120000;
        return { ...doc, status: isOffline ? 'offline' : doc.status };
      });
      res.json(processed);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/devices/control', authenticateToken, isAdmin, async (req, res) => {
    try {
      const { action, timerValue } = req.body;
      const update: any = { targetState: action };
      if (action === 'START') { update.startTime = new Date(); update.timerValue = timerValue || 0; }
      await Device.updateMany({}, { $set: update });
      await new BotLog({ action: `GLOBAL_${action}`, details: `Global request.`, status: 'info' }).save();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/devices/:deviceId/control', authenticateToken, isAdmin, async (req, res) => {
    try {
      const { action, timerValue } = req.body;
      const update: any = { targetState: action };
      if (action === 'START') { update.startTime = new Date(); update.timerValue = timerValue || 0; }
      const device = await Device.findOneAndUpdate({ deviceId: req.params.deviceId }, { $set: update }, { new: true });
      if (!device) return res.status(404).json({ error: 'Device not found' });
      await new BotLog({ action: `DEVICE_${action}`, details: `${device.name}: ${action} requested.`, status: 'info' }).save();
      res.json({ success: true, device });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.post('/api/webhook/email', async (req, res) => {
    try {
      const secret = req.headers['x-auth-key'] || req.headers.authorization?.split(' ')[1];
      if (secret !== API_SECRET_KEY) return res.status(401).json({ error: 'Unauthorized' });

      const modeConfig = await Config.findOne({ key: 'emailMode' });
      const currentMode = modeConfig?.value || 'STOCKING';
      const { to, from, subject, body } = req.body;
      if (!to || !body) return res.status(400).json({ error: 'Missing to/body' });

      let text = body;
      if (body.includes('MIME-Version:')) {
        const parsed = await simpleParser(body);
        text = parsed.text || '';
      }

      const otpMatch = text.match(/(?:otp|code|pin|verification)[\s\S]{0,100}?\b(\d{4,8})\b/i);
      const otp = otpMatch ? otpMatch[1] : null;

      let alias = await EmailAlias.findOne({ alias: to });
      let status = 'pending';
      let assignedTo = null;

      if (!alias) {
        if (currentMode === 'OFF') status = 'admin';
        else {
          alias = new EmailAlias({ alias: to, status: currentMode === 'ADMIN' ? 'admin' : 'stocking' });
          await alias.save();
          status = alias.status === 'admin' ? 'admin' : 'pending';
        }
      } else {
        if (alias.isDeleted && alias.status !== 'admin') {
          alias.deletedMessageCount = (alias.deletedMessageCount || 0) + 1;
          await alias.save();
          return res.json({ success: true, skipped: true });
        }
        status = alias.status === 'admin' ? 'admin' : alias.status === 'stocked' ? 'stock' : alias.status === 'assigned' ? 'sold' : 'unassigned';
        assignedTo = alias.assignedTo;
      }

      await new Email({ otp, fullBody: text, recipientAlias: to, from, subject, status, assignedTo }).save();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API not found' });
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
