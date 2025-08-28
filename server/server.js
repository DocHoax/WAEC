require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const Signature = require('./models/Signature');
const { auth } = require('./middleware/auth');

const app = express();

process.env.TZ = 'Africa/Lagos';

const ensureUploadDir = () => {
  const uploadDir = path.join(__dirname, 'Uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created uploads directory:', uploadDir);
  }
  return uploadDir;
};

const validateEnvironment = () => {
  const required = ['MONGODB_URI'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ensureUploadDir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  },
});

const signatureUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedExtensions.includes(ext) && allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, and PNG image files are allowed'), false);
    }
  },
});

const formDataUpload = multer({ limits: { fieldSize: 1024 * 1024 } });

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL || 'https://waec-gfv0.onrender.com']
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'Uploads'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '1h'
}));

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} | IP: ${req.ip}`);
  const suspiciousPatterns = ['://', '(', ')', '<', '>', '"', "'", '\\'];
  if (suspiciousPatterns.some(pattern => req.url.includes(pattern))) {
    console.error('Potentially malicious URL detected:', req.url);
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  next();
});

const routes = [
  { name: 'auth', file: 'auth.js', mount: '/api/auth' },
  { name: 'questions', file: 'questions.js', mount: '/api/questions' },
  { name: 'tests', file: 'tests.js', mount: '/api/tests' },
  { name: 'analytics', file: 'analytics.js', mount: '/api/analytics' },
  { name: 'cheat-logs', file: 'cheat-logs.js', mount: '/api/cheat-logs' },
  { name: 'classes', file: 'classes.js', mount: '/api/classes' },
  { name: 'results', file: 'results.js', mount: '/api/results' },
  { name: 'reports', file: 'reports.js', mount: '/api/reports' },
  { name: 'subjects', file: 'subjects.js', mount: '/api/subjects' },
  { name: 'sessions', file: 'sessions.js', mount: '/api/sessions' }
];

console.log('🚀 Loading application routes...');
routes.forEach(({ name, file, mount }) => {
  try {
    console.log(`📂 Loading ${name} routes...`);
    const routePath = path.join(__dirname, 'routes', file);
    if (!fs.existsSync(routePath)) {
      console.warn(`⚠️ Route file not found: ${routePath}`);
      return;
    }
    const routeModule = require(`./routes/${file}`);
    if (!routeModule || (typeof routeModule !== 'function' && typeof routeModule !== 'object')) {
      throw new Error(`Invalid route export in ${file}`);
    }
    if (name === 'questions') {
      app.use(mount, formDataUpload.any(), routeModule);
    } else {
      app.use(mount, routeModule);
    }
    console.log(`✅ ${name} routes loaded successfully at ${mount}`);
  } catch (error) {
    console.error(`❌ Failed to load ${name} routes:`, error.message);
    if (process.env.NODE_ENV === 'production') {
      console.error('Continuing despite route load failure...');
    } else {
      console.error('Stack trace:', error.stack);
    }
  }
});
console.log('📋 All routes processed');

app.post('/api/signatures/upload', auth, (req, res, next) => {
  signatureUpload.fields([
    { name: 'classTeacherSignature', maxCount: 1 },
    { name: 'principalSignature', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      console.error('File upload error:', err.message);
      return res.status(400).json({ error: `Upload failed: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { className } = req.body;
    const { files } = req;
    if (!className && !files?.principalSignature) {
      return res.status(400).json({ error: 'Please select a class or upload a principal signature.' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Administrative privileges required' });
    }
    const operations = [];
    if (files?.principalSignature) {
      const file = files.principalSignature[0];
      operations.push(Signature.findOneAndUpdate(
        { class: null },
        { class: null, principalSignature: file.filename, updatedBy: req.user.userId, updatedAt: new Date() },
        { upsert: true, new: true }
      ));
    }
    if (className && files?.classTeacherSignature) {
      const file = files.classTeacherSignature[0];
      operations.push(Signature.findOneAndUpdate(
        { class: className },
        { class: className, classTeacherSignature: file.filename, updatedBy: req.user.userId, updatedAt: new Date() },
        { upsert: true, new: true }
      ));
    }
    await Promise.all(operations);
    res.status(201).json({ message: 'Signatures uploaded successfully', uploadCount: operations.length });
  } catch (error) {
    console.error('Signature upload error:', error.message);
    res.status(500).json({ error: 'Failed to save signatures. Please try again.' });
  }
});

app.get('/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const uploadDir = path.join(__dirname, 'Uploads');
    const uploadDirExists = fs.existsSync(uploadDir);
    const buildPath = path.join(__dirname, '../build');
    const buildExists = fs.existsSync(buildPath);
    const indexExists = fs.existsSync(path.join(buildPath, 'index.html'));
    res.status(200).json({
      status: 'OK',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      uploadDirectory: uploadDirExists ? 'available' : 'missing',
      buildDirectory: buildExists ? 'available' : 'missing',
      indexFile: indexExists ? 'available' : 'missing'
    });
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(503).json({ status: 'ERROR', message: 'Service temporarily unavailable' });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    availableRoutes: routes.map(r => r.mount)
  });
});

if (process.env.NODE_ENV === 'production') {
  console.log('🏗️ Setting up production static file serving...');
  const buildPath = path.join(__dirname, '../build');
  console.log(`🔍 Checking build directory: ${buildPath}`);
  if (fs.existsSync(buildPath)) {
    console.log(`✅ Build directory found: ${buildPath}`);
    const indexPath = path.join(buildPath, 'index.html');
    console.log(`🔍 Checking index.html: ${indexPath}`);
    console.log(`✅ index.html exists: ${fs.existsSync(indexPath)}`);
    app.use(express.static(buildPath, { maxAge: '1d', etag: false }));
    app.get('*', (req, res) => {
      console.log(`📄 Serving React app for route: ${req.path}`);
      const indexFile = path.join(buildPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        console.error('❌ index.html not found at:', indexFile);
        res.status(404).send('Application not available');
      }
    });
    console.log('✅ React Router catch-all configured');
  } else {
    console.error(`❌ Build directory not found: ${buildPath}`);
    console.error('Make sure your React app is built into build/ before deployment');
  }
}

app.use((req, res) => {
  console.log(`🔍 404 - Not found: ${req.method} ${req.path}`);
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.status(404).send('Page not found');
  }
});

app.use((err, req, res, next) => {
  const errorId = Math.random().toString(36).substr(2, 9);
  console.error(`🚨 [Error ${errorId}] Global error:`, {
    message: err.message,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.message, errorId });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid data format', errorId });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate entry', errorId });
  }
  const message = process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message;
  res.status(500).json({ error: message, errorId });
});

const connectDB = async (retryCount = 0) => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI environment variable is required');
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });
    console.log('✅ MongoDB connected successfully');
    mongoose.connection.on('error', (err) => console.error('🔥 MongoDB connection error:', err.message));
    mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB disconnected'));
    mongoose.connection.on('reconnected', () => console.log('🔄 MongoDB reconnected'));
  } catch (error) {
    console.error(`❌ MongoDB connection failed (attempt ${retryCount + 1}):`, error.message);
    if (retryCount < 5) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      console.log(`🔄 Retrying connection in ${delay}ms...`);
      setTimeout(() => connectDB(retryCount + 1), delay);
    } else {
      console.error('💀 Max retry attempts reached. Exiting...');
      process.exit(1);
    }
  }
};

const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    console.log('👋 Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const startServer = async () => {
  try {
    validateEnvironment();
    ensureUploadDir();
    await connectDB();
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🎉 Server startup complete!');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏰ Timezone: ${process.env.TZ}`);
      console.log(`📅 Started at: ${new Date().toISOString()}`);
    });
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error.message);
      }
      process.exit(1);
    });
    return server;
  } catch (error) {
    console.error('💀 Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;