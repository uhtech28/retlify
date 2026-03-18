/**
 * Retlify Backend API
 * Node.js + Express + MongoDB + Nodemailer + JWT
 * Author: Utkarsh Verma / Retlify Team
 */

'use strict';

require('dotenv').config();

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ==============================
   CONFIGURATION
   ============================== */
const CONFIG = {
  jwtSecret:  process.env.JWT_SECRET  || 'retlify-jwt-secret-change-in-production',
  mongoUri:   process.env.MONGO_URI   || 'mongodb://127.0.0.1:27017/retlify',
  emailUser:  process.env.EMAIL_USER  || 'retlifyy@gmail.com',
  emailPass:  process.env.EMAIL_PASS  || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  adminEmail: 'retlifyy@gmail.com',
};

/* ==============================
   MIDDLEWARE
   ============================== */
app.use(cors({
  origin: [CONFIG.frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* Request logger */
app.use(function(req, _res, next) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

/* ==============================
   DATABASE CONNECTION
   ============================== */
mongoose.connect(CONFIG.mongoUri)
  .then(function() { console.log('✅  MongoDB connected →', CONFIG.mongoUri); })
  .catch(function(err) { console.error('❌  MongoDB connection failed:', err.message); });

/* ==============================
   MONGOOSE MODELS
   ============================== */

/* User */
const userSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true, maxlength: 100 },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, required: true, minlength: 6 },
  phone:      { type: String, default: '', trim: true },
  role:       { type: String, enum: ['shopkeeper', 'customer', 'admin'], default: 'customer' },
  avatar:     { type: String, default: '' },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

userSchema.index({ email: 1 });
const User = mongoose.model('User', userSchema);

/* Survey Response */
const surveySchema = new mongoose.Schema({
  userId:                 { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  q1_shopping_habit:      { type: String, default: '' },
  q2_offline_problems:    [{ type: String }],
  q3_retlify_usefulness:  { type: String, default: '' },
  q4_most_useful_feature: { type: String, default: '' },
  q5_shopkeeper_interest: { type: String, default: '' },
  ipAddress:              { type: String, default: '' },
}, { timestamps: true });

const Survey = mongoose.model('Survey', surveySchema);

/* Contact / Feedback */
const contactSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  email:   { type: String, required: true, trim: true, lowercase: true },
  message: { type: String, required: true, trim: true },
  type:    { type: String, enum: ['contact', 'feedback'], default: 'contact' },
  ipAddress: { type: String, default: '' },
}, { timestamps: true });

const Contact = mongoose.model('Contact', contactSchema);

/* ==============================
   EMAIL TRANSPORTER
   ============================== */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: CONFIG.emailUser, pass: CONFIG.emailPass },
});

async function sendEmail({ to, subject, html }) {
  if (!CONFIG.emailPass) {
    console.warn('⚠️  EMAIL_PASS not set — skipping email to', to);
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"Retlify Platform 🏪" <${CONFIG.emailUser}>`,
      to, subject, html,
    });
    console.log(`📧  Email sent → ${to}`);
    return true;
  } catch (err) {
    console.error('❌  Email error:', err.message);
    return false;
  }
}

/* ==============================
   AUTH MIDDLEWARE
   ============================== */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) return res.status(401).json({ error: 'Authentication required. Please log in.' });
  try {
    req.user = jwt.verify(token, CONFIG.jwtSecret);
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token.';
    return res.status(401).json({ error: msg });
  }
}

/* ==============================
   INPUT VALIDATION HELPERS
   ============================== */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function sanitize(str) {
  return String(str || '').trim().substring(0, 1000);
}

/* ==============================
   AUTH ROUTES
   ============================== */

/* POST /api/auth/signup */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const name     = sanitize(req.body.name);
    const email    = sanitize(req.body.email).toLowerCase();
    const password = String(req.body.password || '');
    const phone    = sanitize(req.body.phone);
    const role     = ['shopkeeper', 'customer'].includes(req.body.role) ? req.body.role : 'customer';

    if (!name)               return res.status(400).json({ error: 'Name is required.' });
    if (!email)              return res.status(400).json({ error: 'Email is required.' });
    if (!isValidEmail(email))return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!password)           return res.status(400).json({ error: 'Password is required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    const hashedPw = await bcrypt.hash(password, 12);
    const avatar   = name.split(' ').map(n => n[0] || '').join('').substring(0, 2).toUpperCase();

    const user = await User.create({ name, email, password: hashedPw, phone, role, avatar });

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      CONFIG.jwtSecret,
      { expiresIn: '7d' }
    );

    /* Welcome email (non-blocking) */
    sendEmail({
      to: user.email,
      subject: '🎉 Welcome to Retlify!',
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="color:#1F2937;">Welcome to Retlify, ${user.name}! 🎉</h2>
          <p style="color:#6B7280;line-height:1.6;">You've successfully joined India's retail technology platform.</p>
          <p style="color:#6B7280;line-height:1.6;">Start exploring nearby stores, manage your inventory, and grow your business with Retlify.</p>
          <a href="${CONFIG.frontendUrl}/dashboard.html"
             style="display:inline-block;background:#FFD23F;color:#111827;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:800;margin-top:20px;font-family:sans-serif;">
            Go to Dashboard →
          </a>
          <hr style="margin-top:40px;border:none;border-top:1px solid #E5E7EB;">
          <p style="color:#9CA3AF;font-size:12px;margin-top:16px;">© 2024 Retlify India · <a href="mailto:retlifyy@gmail.com" style="color:#C99B00;">retlifyy@gmail.com</a></p>
        </div>
      `,
    });

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar },
    });

  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

/* POST /api/auth/login */
app.post('/api/auth/login', async (req, res) => {
  try {
    const email    = sanitize(req.body.email).toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated. Contact support.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      CONFIG.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

/* GET /api/auth/me */
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -__v');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user });
  } catch (err) {
    console.error('Get me error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

/* PUT /api/auth/profile */
app.put('/api/auth/profile', authenticate, async (req, res) => {
  try {
    const name  = sanitize(req.body.name);
    const phone = sanitize(req.body.phone);
    if (!name) return res.status(400).json({ error: 'Name cannot be empty.' });

    const avatar = name.split(' ').map(n => n[0] || '').join('').substring(0, 2).toUpperCase();
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, phone, avatar },
      { new: true, select: '-password -__v' }
    );
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ message: 'Profile updated successfully.', user });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

/* PUT /api/auth/change-password */
app.put('/api/auth/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields are required.' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect.' });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

/* ==============================
   SURVEY ROUTES
   ============================== */

/* POST /api/survey */
app.post('/api/survey', async (req, res) => {
  try {
    const { q1, q2, q3, q4, q5, userId } = req.body;
    const problems = Array.isArray(q2) ? q2 : (q2 ? [q2] : []);

    const survey = await Survey.create({
      userId:                 userId || null,
      q1_shopping_habit:      sanitize(q1),
      q2_offline_problems:    problems.map(sanitize),
      q3_retlify_usefulness:  sanitize(q3),
      q4_most_useful_feature: sanitize(q4),
      q5_shopkeeper_interest: sanitize(q5),
      ipAddress:              req.ip || '',
    });

    /* Admin notification (non-blocking) */
    sendEmail({
      to: CONFIG.adminEmail,
      subject: '📋 New Survey Response — Retlify',
      html: `
        <div style="font-family:sans-serif;max-width:600px;">
          <h2 style="color:#1F2937;">New Survey Response</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
            <tr style="background:#F9FAFB;"><td style="padding:10px 14px;font-weight:700;border:1px solid #E5E7EB;width:40%;">Shopping Habit</td><td style="padding:10px 14px;border:1px solid #E5E7EB;">${sanitize(q1) || '—'}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:700;border:1px solid #E5E7EB;">Offline Problems</td><td style="padding:10px 14px;border:1px solid #E5E7EB;">${problems.join(', ') || '—'}</td></tr>
            <tr style="background:#F9FAFB;"><td style="padding:10px 14px;font-weight:700;border:1px solid #E5E7EB;">Retlify Usefulness</td><td style="padding:10px 14px;border:1px solid #E5E7EB;">${sanitize(q3) || '—'}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:700;border:1px solid #E5E7EB;">Most Useful Feature</td><td style="padding:10px 14px;border:1px solid #E5E7EB;">${sanitize(q4) || '—'}</td></tr>
            <tr style="background:#F9FAFB;"><td style="padding:10px 14px;font-weight:700;border:1px solid #E5E7EB;">Shopkeeper Interest</td><td style="padding:10px 14px;border:1px solid #E5E7EB;">${sanitize(q5) || '—'}</td></tr>
          </table>
          <p style="color:#9CA3AF;font-size:12px;margin-top:20px;">Submitted at: ${new Date().toLocaleString('en-IN')}</p>
        </div>
      `,
    });

    return res.status(201).json({ message: 'Survey submitted successfully.', id: survey._id });
  } catch (err) {
    console.error('Survey error:', err);
    return res.status(500).json({ error: 'Failed to submit survey. Please try again.' });
  }
});

/* GET /api/survey/stats */
app.get('/api/survey/stats', async (req, res) => {
  try {
    const [total, byUsefulness, byInterest, byHabit] = await Promise.all([
      Survey.countDocuments(),
      Survey.aggregate([{ $group: { _id: '$q3_retlify_usefulness', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Survey.aggregate([{ $group: { _id: '$q5_shopkeeper_interest', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Survey.aggregate([{ $group: { _id: '$q1_shopping_habit', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ]);
    return res.json({ total, byUsefulness, byInterest, byHabit });
  } catch (err) {
    console.error('Survey stats error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

/* ==============================
   CONTACT ROUTES
   ============================== */

/* POST /api/contact */
app.post('/api/contact', async (req, res) => {
  try {
    const name    = sanitize(req.body.name);
    const email   = sanitize(req.body.email).toLowerCase();
    const message = sanitize(req.body.message);

    if (!name)                return res.status(400).json({ error: 'Name is required.' });
    if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'A valid email is required.' });
    if (!message)             return res.status(400).json({ error: 'Message cannot be empty.' });

    await Contact.create({ name, email, message, ipAddress: req.ip || '' });

    /* Email to admin */
    sendEmail({
      to: CONFIG.adminEmail,
      subject: `📩 New Contact Message from ${name} — Retlify`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;">
          <h2 style="color:#1F2937;">New Contact Form Message</h2>
          <p style="font-size:14px;"><strong>Name:</strong> ${name}</p>
          <p style="font-size:14px;"><strong>Email:</strong> <a href="mailto:${email}" style="color:#C99B00;">${email}</a></p>
          <p style="font-size:14px;"><strong>Time:</strong> ${new Date().toLocaleString('en-IN')}</p>
          <div style="background:#FFFBEB;border-left:4px solid #FFD23F;padding:16px;border-radius:8px;margin-top:16px;">
            <p style="margin:0;color:#1F2937;font-size:14px;line-height:1.6;">${message.replace(/\n/g, '<br />')}</p>
          </div>
          <hr style="margin-top:32px;border:none;border-top:1px solid #E5E7EB;">
          <p style="color:#9CA3AF;font-size:12px;">© 2024 Retlify India</p>
        </div>
      `,
    });

    /* Confirmation to sender */
    sendEmail({
      to: email,
      subject: '✅ We received your message — Retlify',
      html: `
        <div style="font-family:sans-serif;max-width:560px;padding:24px;">
          <h2 style="color:#1F2937;">Thanks for reaching out, ${name}! 👋</h2>
          <p style="color:#6B7280;line-height:1.6;">We've received your message and will get back to you within 24–48 hours.</p>
          <p style="color:#6B7280;line-height:1.6;">In the meantime, follow us on Instagram <a href="https://instagram.com/retlifyy" style="color:#C99B00;font-weight:700;">@retlifyy</a> for updates.</p>
          <hr style="margin-top:32px;border:none;border-top:1px solid #E5E7EB;">
          <p style="color:#9CA3AF;font-size:12px;">© 2024 Retlify India · <a href="mailto:retlifyy@gmail.com" style="color:#C99B00;">retlifyy@gmail.com</a></p>
        </div>
      `,
    });

    return res.status(201).json({ message: 'Message sent successfully.' });
  } catch (err) {
    console.error('Contact error:', err);
    return res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

/* ==============================
   HEALTH CHECK
   ============================== */
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    service:   'Retlify API',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    db:        mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

/* ==============================
   404 HANDLER
   ============================== */
app.use(function(_req, res) {
  res.status(404).json({ error: 'Route not found.' });
});

/* ==============================
   GLOBAL ERROR HANDLER
   ============================== */
app.use(function(err, _req, res, _next) {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

/* ==============================
   START SERVER
   ============================== */
app.listen(PORT, function() {
  console.log('');
  console.log('🚀  Retlify API running at http://localhost:' + PORT);
  console.log('📦  Environment :', process.env.NODE_ENV || 'development');
  console.log('🗃️   Database    :', CONFIG.mongoUri);
  console.log('📧  Email user  :', CONFIG.emailUser);
  console.log('');
});

module.exports = app;
