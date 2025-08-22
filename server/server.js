require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
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
const Signature = require('../models/Signature');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const app = express();

// Set timezone to WAT (Africa/Lagos)
process.env.TZ = 'Africa/Lagos';

// Configure Multer for signature uploads
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
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('Uploads'));
app.use(express.static(path.join(__dirname, '../src/build'))); // Serve frontend
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Routes
console.log('Mounting routes...');
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

// Catch-all for React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/build', 'index.html'));
});

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
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