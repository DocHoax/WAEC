require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Signature = require('./models/Signature');
const { auth } = require('./middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Set timezone to WAT (Africa/Lagos)
process.env.TZ = 'Africa/Lagos';

// Configure Multer for signature uploads (file-based)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'Uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .jpg, .jpeg, and .png files are allowed'), false);
    }
  },
});

// Configure Multer for form-data fields (no files, for questions)
const formDataUpload = multer();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://your-app-name.onrender.com' 
    : 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('Uploads'));
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url} | Params: ${JSON.stringify(req.params)} | Query: ${JSON.stringify(req.query)}`);
  if (req.url.includes('://') || req.url.includes('(')) {
    console.error('Malformed URL detected:', req.url);
    return res.status(400).json({ error: 'Invalid URL' });
  }
  next();
});

// Load only the working routes for now
try {
  console.log('Loading cheat-logs routes...');
  const cheatLogRoutes = require('./routes/cheat-logs');
  app.use('/api/cheat-logs', cheatLogRoutes);
  console.log('✅ Successfully loaded cheat-logs routes');
} catch (error) {
  console.error('❌ Error loading cheat-logs routes:', error.message);
}

try {
  console.log('Loading subjects routes...');
  const subjectsRoutes = require('./routes/subjects');
  app.use('/api/subjects', subjectsRoutes);
  console.log('✅ Successfully loaded subjects routes');
} catch (error) {
  console.error('❌ Error loading subjects routes:', error.message);
}

// Temporary placeholder routes for the broken ones
app.use('/api/auth', (req, res) => {
  res.status(503).json({ error: 'Auth routes temporarily unavailable - being fixed' });
});

app.use('/api/questions', (req, res) => {
  res.status(503).json({ error: 'Questions routes temporarily unavailable - being fixed' });
});

app.use('/api/tests', (req, res) => {
  res.status(503).json({ error: 'Tests routes temporarily unavailable - being fixed' });
});

app.use('/api/analytics', (req, res) => {
  res.status(503).json({ error: 'Analytics routes temporarily unavailable - being fixed' });
});

app.use('/api/classes', (req, res) => {
  res.status(503).json({ error: 'Classes routes temporarily unavailable - being fixed' });
});

app.use('/api/results', (req, res) => {
  res.status(503).json({ error: 'Results routes temporarily unavailable - being fixed' });
});

app.use('/api/reports', (req, res) => {
  res.status(503).json({ error: 'Reports routes temporarily unavailable - being fixed' });
});

app.use('/api/sessions', (req, res) => {
  res.status(503).json({ error: 'Sessions routes temporarily unavailable - being fixed' });
});

// Manual signature upload route
app.post('/api/signatures/upload', auth, upload.fields([
  { name: 'classTeacherSignature', maxCount: 1 },
  { name: 'principalSignature', maxCount: 1 },
]), async (req, res) => {
  try {
    const { className } = req.body;
    if (!className && !req.files.principalSignature) {
      return res.status(400).json({ error: 'Select a class or upload a principal signature.' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (req.files.principalSignature) {
      const signatureData = {
        class: null,
        principalSignature: req.files.principalSignature[0].filename,
        updatedBy: req.user.userId,
        updatedAt: new Date(),
      };
      await Signature.findOneAndUpdate(
        { class: null },
        signatureData,
        { upsert: true, new: true }
      );
    }
    if (className && req.files.classTeacherSignature) {
      const signatureData = {
        class: className,
        classTeacherSignature: req.files.classTeacherSignature[0].filename,
        updatedBy: req.user.userId,
        updatedAt: new Date(),
      };
      await Signature.findOneAndUpdate(
        { class: className },
        signatureData,
        { upsert: true, new: true }
      );
    }
    res.status(201).json({ message: 'Signatures uploaded successfully' });
  } catch (error) {
    console.error('Signature upload - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running', 
    workingRoutes: ['cheat-logs', 'subjects', 'signatures'],
    brokenRoutes: ['auth', 'questions', 'tests', 'analytics', 'classes', 'results', 'reports', 'sessions']
  });
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../build', 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    params: req.params,
    query: req.query,
  });
  res.status(500).json({ error: 'Internal server error' });
});

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://sodiqolaniyisanni:Controller1@cluster0.gw4ko28.mongodb.net/waec-cbt?retryWrites=true&w=majority');
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));