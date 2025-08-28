require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Import models and middleware
const Signature = require('./models/Signature');
const { auth } = require('./middleware/auth');

// Initialize Express app
const app = express();

// Set timezone to WAT (West Africa Time)
process.env.TZ = 'Africa/Lagos';

// ================================
// UTILITY FUNCTIONS
// ================================

// Ensure upload directory exists
const ensureUploadDir = () => {
  const uploadDir = path.join(__dirname, 'Uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created uploads directory:', uploadDir);
  }
  return uploadDir;
};

// Validate environment variables
const validateEnvironment = () => {
  const required = ['MONGODB_URI'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// ================================
// MULTER CONFIGURATION
// ================================

// File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  },
});

// File upload configuration for signatures
const signatureUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 2 // Maximum 2 files
  },
  fileFilter: (req, file, cb) => {
    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Check MIME type
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    const isValidMime = allowedMimes.includes(file.mimetype);
    const isValidExt = allowedExtensions.includes(ext);
    
    if (isValidExt && isValidMime) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, and PNG image files are allowed'), false);
    }
  },
});

// Form data upload configuration (no files)
const formDataUpload = multer({
  limits: {
    fieldSize: 1024 * 1024 // 1MB limit for form fields
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

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL || 'https://your-app-name.onrender.com']
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];
    
    // Allow requests with no origin (mobile apps, etc.)
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
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'Uploads'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '1h'
}));

// Request logging and validation middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} | IP: ${req.ip}`);
  
  // Enhanced URL validation
  const suspiciousPatterns = ['://', '(', ')', '<', '>', '"', "'", '\\'];
  const hasSuspiciousChars = suspiciousPatterns.some(pattern => req.url.includes(pattern));
  
  if (hasSuspiciousChars) {
    console.error('Potentially malicious URL detected:', req.url);
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  
  next();
});

// ================================
// ROUTE CONFIGURATION
// ================================

// Routes to load
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

// Load routes with comprehensive error handling
console.log('🚀 Loading application routes...');

routes.forEach(({ name, file, mount }) => {
  try {
    console.log(`📂 Loading ${name} routes...`);
    
    const routePath = path.join(__dirname, 'routes', file);
    
    // Check if route file exists
    if (!fs.existsSync(routePath)) {
      console.warn(`⚠️  Route file not found: ${routePath}`);
      return;
    }
    
    // Load the route module
    const routeModule = require(`./routes/${file}`);
    
    // Validate route module
    if (!routeModule || (typeof routeModule !== 'function' && typeof routeModule !== 'object')) {
      throw new Error(`Invalid route export in ${file}`);
    }
    
    // Mount routes with appropriate middleware
    if (name === 'questions') {
      // Questions route needs form data middleware
      app.use(mount, formDataUpload.any(), routeModule);
    } else {
      app.use(mount, routeModule);
    }
    
    console.log(`✅ ${name} routes loaded successfully at ${mount}`);
    
  } catch (error) {
    console.error(`❌ Failed to load ${name} routes:`, error.message);
    
    // In production, log error but continue
    if (process.env.NODE_ENV === 'production') {
      console.error('Continuing despite route load failure...');
    } else {
      console.error('Stack trace:', error.stack);
    }
  }
});

console.log('📋 All routes processed');

// ================================
// SIGNATURE UPLOAD ENDPOINT
// ================================

app.post('/api/signatures/upload', 
  auth,
  (req, res, next) => {
    // Handle multer errors gracefully
    signatureUpload.fields([
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
      const { files } = req;
      
      // Validation
      if (!className && !files?.principalSignature) {
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

      // Handle principal signature
      if (files?.principalSignature) {
        const file = files.principalSignature[0];
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

      // Handle class teacher signature
      if (className && files?.classTeacherSignature) {
        const file = files.classTeacherSignature[0];
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

      // Execute all database operations
      await Promise.all(operations);

      res.status(201).json({ 
        message: 'Signatures uploaded successfully',
        uploadCount: operations.length
      });
      
    } catch (error) {
      console.error('Signature upload error:', error.message);
      res.status(500).json({ 
        error: 'Failed to save signatures. Please try again.' 
      });
    }
  }
);

// ================================
// HEALTH CHECK ENDPOINT
// ================================

app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check upload directory
    const uploadDir = path.join(__dirname, 'Uploads');
    const uploadDirExists = fs.existsSync(uploadDir);
    
    res.status(200).json({
      status: 'OK',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      uploadDirectory: uploadDirExists ? 'available' : 'missing'
    });
    
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(503).json({
      status: 'ERROR',
      message: 'Service temporarily unavailable'
    });
  }
});

// ================================
// API 404 HANDLER
// ================================

// Handle 404 for API routes before static file serving
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    availableRoutes: routes.map(r => r.mount)
  });
});

// ================================
// PRODUCTION STATIC FILE SERVING
// ================================

if (process.env.NODE_ENV === 'production') {
  console.log('🏗️  Setting up production static file serving...');
  
  const buildPath = path.join(__dirname, '../../build');
  
  // Check if build directory exists
  if (fs.existsSync(buildPath)) {
    // Serve static files
    app.use(express.static(buildPath, {
      maxAge: '1d',
      etag: false,
      index: false // Prevent automatic index.html serving
    }));
    
    console.log(`📁 Static files served from: ${buildPath}`);
    
    // React Router catch-all handler using middleware (safer than route patterns)
    app.use((req, res, next) => {
      // Skip if it's an API request (already handled above)
      if (req.path.startsWith('/api')) {
        return next();
      }
      
      // Skip if it's a static file request
      if (req.path.includes('.')) {
        return next();
      }
      
      // Serve React app for all other routes
      const indexFile = path.join(buildPath, 'index.html');
      
      if (fs.existsSync(indexFile)) {
        console.log(`📄 Serving React app for route: ${req.path}`);
        res.sendFile(indexFile);
      } else {
        console.error('❌ React index.html not found');
        res.status(404).send('Application not available');
      }
    });
    
    console.log('✅ React Router catch-all configured');
    
  } else {
    console.error(`❌ Build directory not found: ${buildPath}`);
    console.error('Make sure your React app is built before deployment');
  }
}

// ================================
// ERROR HANDLING
// ================================

// Handle remaining 404s
app.use((req, res) => {
  console.log(`🔍 404 - Not found: ${req.method} ${req.path}`);
  
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.status(404).send('Page not found');
  }
});

// Global error handler
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

  // Handle specific error types
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
      error: 'Duplicate entry',
      errorId
    });
  }

  // Generic error response
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again later.'
    : err.message;
    
  res.status(500).json({
    error: message,
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
      bufferCommands: false,
    });
    
    console.log('✅ MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('🔥 MongoDB connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });
    
  } catch (error) {
    console.error(`❌ MongoDB connection failed (attempt ${retryCount + 1}):`, error.message);
    
    // Retry with exponential backoff
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

// ================================
// GRACEFUL SHUTDOWN
// ================================

const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
    // Exit process
    console.log('👋 Graceful shutdown complete');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  console.error(error.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// ================================
// SERVER STARTUP
// ================================

const startServer = async () => {
  try {
    // Validate environment
    validateEnvironment();
    
    // Ensure upload directory exists
    ensureUploadDir();
    
    // Connect to database
    await connectDB();
    
    // Start server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log('🎉 Server startup complete!');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏰ Timezone: ${process.env.TZ}`);
      console.log(`📅 Started at: ${new Date().toISOString()}`);
    });
    
    // Handle server errors
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

// Start the server
startServer();

// Export app for testing purposes
module.exports = app;