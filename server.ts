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

// --- Schemas ---
const automationLogSchema = new mongoose.Schema({
  message: { type: String, required: true },
  level: { type: String, enum: ['info', 'warn', 'error', 'success'], default: 'info' },
  createdAt: { type: Date, default: Date.now }
});
const AutomationLog = mongoose.model('AutomationLog', automationLogSchema);

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
      const email = await Email.findByIdAndUpdate(req.params.id, { assignedTo: userId }, { new: true });
      res.json(email);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/emails/assign-by-alias', authenticateToken, isAdmin, async (req, res) => {
    try {
      const { recipientAlias, userId } = req.body;
      
      // Update all emails with this recipient alias
      await Email.updateMany(
        { recipientAlias },
        { $set: { assignedTo: userId || null } }
      );
      
      // Also update the EmailAlias document
      await EmailAlias.findOneAndUpdate(
        { alias: recipientAlias },
        { $set: { assignedTo: userId || null } }
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

  // --- Automation Routes ---
  let currentAutomationCommand: string | null = null;
  let automationIsRunning = false;

  app.get('/api/admin/automation/status', authenticateToken, isAdmin, async (req, res) => {
    res.json({ command: currentAutomationCommand, isRunning: automationIsRunning });
  });

  app.post('/api/admin/automation/command', authenticateToken, isAdmin, async (req, res) => {
    const { command } = req.body;
    if (command === 'stop') {
      currentAutomationCommand = 'stop';
    } else if (command.startsWith('start')) {
      currentAutomationCommand = command;
      // Clear logs when starting new
      await AutomationLog.deleteMany({});
    }
    res.json({ success: true, command: currentAutomationCommand });
  });

  app.get('/api/admin/automation/logs', authenticateToken, isAdmin, async (req, res) => {
    try {
      const logs = await AutomationLog.find().sort({ createdAt: -1 }).limit(50);
      res.json(logs.reverse());
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Public route for the script to report back (usually protected by secret key)
  app.post('/api/automation/report', async (req, res) => {
    const { message, level, status, isRunning, secret } = req.body;
    const expectedSecret = process.env.API_SECRET_KEY || 'keyxxx';
    if (secret !== expectedSecret) return res.status(401).json({ error: 'Unauthorized' });

    if (message) {
      const log = new AutomationLog({ message, level: level || 'info' });
      await log.save();
    }
    
    if (status) currentAutomationCommand = status;
    if (typeof isRunning === 'boolean') automationIsRunning = isRunning;
    
    res.json({ command: currentAutomationCommand });
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
