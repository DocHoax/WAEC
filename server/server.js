require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Signature = require('./models/Signature');
const { auth } = require('./middleware/auth');

// Import all routes
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const testRoutes = require('./routes/tests');
const analyticsRoutes = require('./routes/analytics');
const cheatLogRoutes = require('./routes/cheat-logs');
const classRoutes = require('./routes/classes');
const resultsRoutes = require('./routes/results');
const reportsRoutes = require('./routes/reports');
const subjectsRoutes = require('./routes/subjects');
const sessionsRoutes = require('./routes/sessions');

const app = express();

// Set timezone to West Africa Time
process.env.TZ = 'Africa/Lagos';

// ================================
// UTILITY FUNCTIONS
// ================================

// Ensure uploads directory exists
const ensureUploadDir = () => {
  const uploadsDir = path.join(__dirname, 'Uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory');
  }
  return uploadsDir;
};

// Find the correct build path - SIMPLIFIED
const findBuildPath = () => {
  // For Render.com deployment, the build is in the root directory
  const buildPath = path.join(__dirname, '../../build');
  
  if (fs.existsSync(buildPath) && fs.existsSync(path.join(buildPath, 'index.html'))) {
    console.log(`✅ Found build directory at: ${buildPath}`);
    return buildPath;
  }
  
  console.warn('⚠️  No build directory found at:', buildPath);
  return null;
};

// ================================
// MULTER CONFIGURATION
// ================================

// Ensure upload directory exists
const uploadDir = ensureUploadDir();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 2
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidExtension = allowedExtensions.includes(ext);
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    
    if (isValidExtension && isValidMimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, and PNG image files are allowed'), false);
    }
  },
});

// Configure multer for form data
const formDataUpload = multer({
  limits: {
    fieldSize: 1024 * 1024
  }
});

// ================================
// MIDDLEWARE SETUP
// ================================

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// CORS configuration - UPDATED FOR PRODUCTION
app.use(cors({
  origin: [
    'https://waec-gfv0.onrender.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(uploadDir, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '1h'
}));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} | IP: ${req.ip || req.connection.remoteAddress}`);
  next();
});

// ================================
// ROUTES MOUNTING
// ================================

console.log('🚀 Mounting application routes...');

// Mount all routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', formDataUpload.any(), questionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/cheat-logs', cheatLogRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/sessions', sessionsRoutes);

console.log('✅ All routes mounted successfully');

// ================================
// SIGNATURE UPLOAD ENDPOINT
// ================================

app.post('/api/signatures/upload', 
  auth, 
  (req, res, next) => {
    upload.fields([
      { name: 'classTeacherSignature', maxCount: 1 },
      { name: 'principalSignature', maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        console.error('File upload error:', err.message);
        return res.status(400).json({ 
          error: `Upload failed: ${err.message}` 
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { className } = req.body;
      
      if (!className && !req.files?.principalSignature) {
        return res.status(400).json({ 
          error: 'Please select a class or upload a principal signature.' 
        });
      }
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Administrative privileges required' 
        });
      }

      const operations = [];

      if (req.files?.principalSignature) {
        const file = req.files.principalSignature[0];
        const signatureData = {
          class: null,
          principalSignature: file.filename,
          updatedBy: req.user.userId,
          updatedAt: new Date(),
        };
        
        operations.push(
          Signature.findOneAndUpdate(
            { class: null },
            signatureData,
            { upsert: true, new: true }
          )
        );
      }

      if (className && req.files?.classTeacherSignature) {
        const file = req.files.classTeacherSignature[0];
        const signatureData = {
          class: className,
          classTeacherSignature: file.filename,
          updatedBy: req.user.userId,
          updatedAt: new Date(),
        };
        
        operations.push(
          Signature.findOneAndUpdate(
            { class: className },
            signatureData,
            { upsert: true, new: true }
          )
        );
      }

      await Promise.all(operations);

      res.status(201).json({ 
        message: 'Signatures uploaded successfully',
        uploadCount: operations.length
      });
      
    } catch (error) {
      console.error('Signature database error:', error.message);
      res.status(500).json({ 
        error: 'Failed to save signatures. Please try again.' 
      });
    }
  }
);

// ================================
// HEALTH CHECK ENDPOINT
// ================================

app.get('/api/health', (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const buildPath = findBuildPath();
    
    const healthData = {
      status: 'OK',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      buildDirectory: buildPath ? 'available' : 'missing',
      port: process.env.PORT || 5000,
      frontendUrl: 'https://waec-gfv0.onrender.com'
    };

    res.status(200).json(healthData);
    
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(503).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// ================================
// API 404 HANDLER
// ================================

app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found', 
    path: req.path, 
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ================================
// PRODUCTION STATIC FILE SERVING
// ================================

if (process.env.NODE_ENV === 'production') {
  console.log('🏗️  Setting up production static file serving...');
  
  const buildPath = findBuildPath();
  
  if (buildPath) {
    app.use(express.static(buildPath, {
      maxAge: '1d',
      etag: false,
      index: false
    }));
    
    console.log(`📁 Serving static files from: ${buildPath}`);
    
    // React Router catch-all handler
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      
      console.log(`📄 Serving React app for path: ${req.path}`);
      const indexPath = path.join(buildPath, 'index.html');
      
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error('❌ index.html not found at:', indexPath);
        res.status(404).send('Frontend application not available');
      }
    });
    
    console.log('✅ React Router configured successfully');
    
  } else {
    console.error('❌ No build directory found - React app will not be served');
  }
} else {
  console.log('🔧 Development mode - static file serving disabled');
}

// ================================
// ERROR HANDLING
// ================================

app.use((err, req, res, next) => {
  const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  console.error(`🚨 Global Error [${errorId}]:`, {
    message: err.message,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.message,
      errorId
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid data format',
      errorId
    });
  }
  
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate entry detected',
      errorId
    });
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please try again later.' 
      : err.message,
    errorId
  });
});

// ================================
// DATABASE CONNECTION
// ================================

const connectDB = async (retryCount = 0) => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB connected successfully');
    
    mongoose.connection.on('error', (err) => {
      console.error('🔥 MongoDB connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });
    
  } catch (error) {
    console.error(`❌ MongoDB connection failed (attempt ${retryCount + 1}):`, error.message);
    
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`🔄 Retrying connection in ${delay}ms...`);
      setTimeout(() => connectDB(retryCount + 1), delay);
    } else {
      console.error('💀 Max retry attempts reached. Exiting...');
      process.exit(1);
    }
  }
};

// ================================
// GRACEFUL SHUTDOWN
// ================================

const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    console.log('👋 Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ================================
// SERVER STARTUP
// ================================

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🎉 ================================');
  console.log('🎉 SERVER STARTED SUCCESSFULLY!');
  console.log('🎉 ================================');
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Timezone: ${process.env.TZ}`);
  console.log(`🔗 CORS Origin: https://waec-gfv0.onrender.com`);
  console.log(`📁 Build Path: ${findBuildPath() || 'Not found'}`);
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log('🎉 ================================');
  console.log('');
});

module.exports = app;