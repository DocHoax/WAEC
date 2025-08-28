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
    if (allowedExtensions.includes(ext) && allowedMimes.includes(file.mimes)) {
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
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : '0',
}));


// ============================================
// BEGIN ADDED CODE FOR SERVING REACT APP
// ============================================

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', 'build');
  console.log(`🔍 Checking build directory: ${buildPath}`);
  if (fs.existsSync(buildPath)) {
    console.log(`✅ Build directory found: ${buildPath}`);
    app.use(express.static(buildPath));
  } else {
    console.error(`❌ Build directory not found: ${buildPath}`);
    console.error("Make sure your React app is built into the 'build/' directory relative to the server folder before deployment.");
  }

  // Catch-all route to serve the index.html for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  console.log("Serving in development mode. No static build files served.");
}

// ============================================
// END ADDED CODE FOR SERVING REACT APP
// ============================================


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    if (process.env.NODE_ENV === 'production') process.exit(1);
  });

const setupRoutes = () => {
  console.log('🚀 Loading application routes...');
  const routeDir = path.join(__dirname, 'routes');
  fs.readdirSync(routeDir).forEach(file => {
    if (file.endsWith('.js')) {
      try {
        const routeName = file.split('.')[0];
        const routePath = `/api/${routeName}`;
        const router = require(path.join(routeDir, file));
        app.use(routePath, router);
        console.log(`✅ ${routeName} routes loaded successfully at ${routePath}`);
      } catch (err) {
        console.error(`❌ Error loading route file ${file}:`, err);
      }
    }
  });
  console.log('📋 All routes processed');
};

const setupServer = () => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🎉 Server startup complete!`);
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`⏰ Timezone: ${process.env.TZ}`);
    console.log(`📅 Started at: ${new Date().toISOString()}`);
  });
};

validateEnvironment();
ensureUploadDir();
setupRoutes();
setupServer();
