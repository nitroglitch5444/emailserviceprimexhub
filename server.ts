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
      let query: any = req.user.isAdmin ? {} : { assignedTo: req.user.id };
      const latestEmails = await Email.find({ ...query, otp: { $ne: null, $exists: true } }).sort({ receivedAt: -1 }).limit(4);
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
      let totalAmount = 0;
      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (product) totalAmount += product.price * item.quantity;
      }
      const order = new Order({
        userId: req.user.id,
        items,
        totalAmount,
        exactCryptoAmount: totalAmount + (Math.floor(Math.random() * 99) + 1) / 100,
        cryptoCurrency,
        customerDetails,
        status: 'pending'
      });
      await order.save();
      res.json({ orderId: order._id, exactCryptoAmount: order.exactCryptoAmount, cryptoCurrency: order.cryptoCurrency });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // [Include other routes: my-emails, my-aliases, admin users, admin config, admin products, admin orders, bot, devices, webhooks]

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
