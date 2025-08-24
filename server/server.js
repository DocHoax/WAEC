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

// Load routes one by one to identify the problematic one
const routesToLoad = [
  { name: 'auth', path: './routes/auth', mount: '/api/auth' },
  { name: 'questions', path: './routes/questions', mount: '/api/questions' },
  { name: 'tests', path: './routes/tests', mount: '/api/tests' },
  { name: 'analytics', path: './routes/analytics', mount: '/api/analytics' },
  { name: 'cheat-logs', path: './routes/cheat-logs', mount: '/api/cheat-logs' },
  { name: 'classes', path: './routes/classes', mount: '/api/classes' },
  { name: 'results', path: './routes/results', mount: '/api/results' },
  { name: 'reports', path: './routes/reports', mount: '/api/reports' },
  { name: 'subjects', path: './routes/subjects', mount: '/api/subjects' },
  { name: 'sessions', path: './routes/sessions', mount: '/api/sessions' }
];

routesToLoad.forEach(({ name, path: routePath, mount }) => {
  try {
    console.log(`Loading ${name} routes from ${routePath}...`);
    const routeModule = require(routePath);
    
    if (name === 'questions') {
      app.use(mount, formDataUpload.any(), routeModule);
    } else {
      app.use(mount, routeModule);
    }
    console.log(`✅ Successfully loaded ${name} routes`);
  } catch (error) {
    console.error(`❌ Error loading ${name} routes:`, error.message);
    console.error(`Stack trace:`, error.stack);
    // Don't exit, continue with other routes
  }
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
  res.status(200).json({ status: 'OK', message: 'Server is running' });
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