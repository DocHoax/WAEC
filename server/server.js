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
const ensureUploadDir = () => {
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created uploads directory:', uploadDir);
  }
  return uploadDir;
};
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ensureUploadDir()),
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
    ? process.env.FRONTEND_URL || 'https://waec-gfv0.onrender.com'
    : 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Set up static serving for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Load routes
console.log('Mounting routes...');
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
    console.log(`Loading ${name} routes from ${routePath} at ${mount}`);
    const routeModule = require(routePath);
    if (name === 'questions') {
      app.use(mount, formDataUpload.any(), routeModule);
    } else {
      app.use(mount, routeModule);
    }
    console.log(`✅ Successfully loaded ${name} routes`);
  } catch (error) {
    console.error(`❌ Error loading ${name} routes:`, error.message);
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

// Handle API 404s (must be placed before the frontend catch-all)
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.path, method: req.method });
});

// Serve React frontend in production (MUST be the last route)
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', '..', 'build');
  console.log(`Checking for build directory at: ${buildPath}`);
  if (fs.existsSync(buildPath)) {
    console.log('✅ Build directory found. Serving static files.');
    app.use(express.static(buildPath));
    console.log('Mounting catch-all route for React frontend.');
    app.get('/*', (req, res) => {
      console.log(`Serving React frontend for path: ${req.path}`);
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  } else {
    console.error('❌ Frontend build directory not found. Please run `npm run build` in the frontend directory.');
  }
}


// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', {
    message: err.message,
    url: req.url,
    method: req.method,
    params: req.params,
    query: req.query,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    error: 'Internal server error',
    message: err.message
  });
});

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
