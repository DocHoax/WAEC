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
  if (req.url.includes('://') || req.url.includes('(') || req.url.includes(':')) {
    console.error('Malformed URL detected:', req.url);
    return res.status(400).json({ error: 'Invalid URL' });
  }
  next();
});

// Function to validate route patterns in a router
function validateRouterRoutes(router, routeName) {
  console.log(`🔍 Analyzing routes in ${routeName}...`);
  
  if (!router || !router.stack) {
    console.log(`⚠️  No routes found in ${routeName}`);
    return [];
  }
  
  const problematicRoutes = [];
  
  router.stack.forEach((layer, index) => {
    try {
      const route = layer.route;
      if (route) {
        console.log(`  📍 Route ${index}: ${Object.keys(route.methods).join(',')} ${route.path}`);
        
        // Check for common malformed patterns
        if (route.path) {
          // Check for empty parameters (:)
          if (route.path.includes('/:') && route.path.match(/:\s*[^a-zA-Z_]/)) {
            console.error(`  ❌ MALFORMED: Empty parameter in route: ${route.path}`);
            problematicRoutes.push(route.path);
          }
          
          // Check for parameters ending with nothing
          if (route.path.match(/:[^\/\s]*$/)) {
            const paramMatch = route.path.match(/:([^\/\s]*)$/);
            if (paramMatch && paramMatch[1] === '') {
              console.error(`  ❌ MALFORMED: Empty parameter name in route: ${route.path}`);
              problematicRoutes.push(route.path);
            }
          }
          
          // Check for double colons or other suspicious patterns
          if (route.path.includes('::') || route.path.includes(':/')) {
            console.error(`  ❌ MALFORMED: Suspicious pattern in route: ${route.path}`);
            problematicRoutes.push(route.path);
          }
        }
      } else if (layer.name === 'router') {
        // Nested router
        console.log(`  📁 Nested router at layer ${index}`);
        if (layer.handle && layer.handle.stack) {
          const nestedProblematic = validateRouterRoutes(layer.handle, `${routeName} (nested)`);
          problematicRoutes.push(...nestedProblematic);
        }
      }
    } catch (error) {
      console.error(`  ❌ Error analyzing route ${index} in ${routeName}:`, error.message);
      problematicRoutes.push(`Route ${index} (error: ${error.message})`);
    }
  });
  
  return problematicRoutes;
}

// Enhanced route loading with better error isolation
console.log('Mounting routes...');
const routesToLoad = [
  { name: 'auth', path: './routes/auth.js', mount: '/api/auth' },
  { name: 'questions', path: './routes/questions.js', mount: '/api/questions' },
  { name: 'tests', path: './routes/tests.js', mount: '/api/tests' },
  { name: 'analytics', path: './routes/analytics.js', mount: '/api/analytics' },
  { name: 'cheat-logs', path: './routes/cheat-logs.js', mount: '/api/cheat-logs' },
  { name: 'classes', path: './routes/classes.js', mount: '/api/classes' },
  { name: 'results', path: './routes/results.js', mount: '/api/results' },
  { name: 'reports', path: './routes/reports.js', mount: '/api/reports' },
  { name: 'subjects', path: './routes/subjects.js', mount: '/api/subjects' },
  { name: 'sessions', path: './routes/sessions.js', mount: '/api/sessions' }
];

// Load and mount routes one by one with detailed debugging
const successfullyMountedRoutes = [];
const failedRoutes = [];

for (const { name, path: routePath, mount } of routesToLoad) {
  try {
    console.log(`\n🔧 Loading ${name} routes from ${routePath} at ${mount}`);
    
    // Clear require cache to avoid stale modules
    delete require.cache[require.resolve(routePath)];
    const routeModule = require(routePath);
    
    // Validate the route module before mounting
    if (typeof routeModule !== 'function' && typeof routeModule !== 'object') {
      throw new Error(`Invalid route module: expected function or router object, got ${typeof routeModule}`);
    }
    
    // Analyze routes before mounting
    console.log(`🔍 Pre-mount analysis of ${name}:`);
    const problematicRoutes = validateRouterRoutes(routeModule, name);
    
    if (problematicRoutes.length > 0) {
      console.error(`❌ Found ${problematicRoutes.length} problematic routes in ${name}:`);
      problematicRoutes.forEach(route => console.error(`   - ${route}`));
      
      // In production, skip problematic routes; in development, continue for debugging
      if (process.env.NODE_ENV === 'production') {
        console.error(`⏭️  Skipping ${name} routes due to malformed patterns`);
        failedRoutes.push({ name, reason: 'Malformed route patterns', routes: problematicRoutes });
        continue;
      }
    }
    
    // Wrap route mounting in try-catch to isolate path-to-regexp errors
    console.log(`🚀 Attempting to mount ${name} routes...`);
    try {
      if (name === 'questions') {
        app.use(mount, formDataUpload.any(), routeModule);
      } else {
        app.use(mount, routeModule);
      }
      console.log(`✅ Successfully loaded and mounted ${name} routes`);
      successfullyMountedRoutes.push(name);
    } catch (mountError) {
      console.error(`❌ Error mounting ${name} routes:`, mountError.message);
      console.error('This route file likely contains a malformed route pattern');
      
      failedRoutes.push({ name, reason: mountError.message, error: mountError });
      
      // Skip this route and continue with others
      if (process.env.NODE_ENV !== 'production') {
        console.error('Mount error stack:', mountError.stack);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error loading ${name} routes:`, error.message);
    console.error(`Stack trace:`, error.stack);
    failedRoutes.push({ name, reason: error.message, error });
  }
}

// Summary
console.log('\n📊 ROUTE LOADING SUMMARY:');
console.log(`✅ Successfully mounted: ${successfullyMountedRoutes.join(', ')}`);
if (failedRoutes.length > 0) {
  console.error(`❌ Failed to mount: ${failedRoutes.map(r => r.name).join(', ')}`);
  console.error('Failed routes details:', failedRoutes.map(r => `${r.name}: ${r.reason}`).join('\n'));
}

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

// Handle API 404s before the catch-all route
app.use('/api*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../build')));
  console.log('Setting up React frontend serving...');
  
  // ✅ ALTERNATIVE: Use a more specific pattern instead of '*'
  // This avoids potential issues with path-to-regexp parsing '*'
  try {
    console.log('🚀 Attempting to mount catch-all route for React frontend...');
    
    // Method 1: Use a regex pattern instead of '*'
    app.get(/^\/(?!api).*/, (req, res) => {
      console.log(`Serving React app for path: ${req.path}`);
      
      const indexPath = path.join(__dirname, '../../build', 'index.html');
      
      // Verify the file exists before serving
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Frontend build not found');
      }
    });
    
    console.log('✅ Successfully mounted React frontend catch-all route');
  } catch (catchAllError) {
    console.error('❌ Error mounting catch-all route:', catchAllError.message);
    console.error('Fallback: Using individual route handlers instead');
    
    // Fallback: Define specific routes that might be needed
    const commonReactRoutes = ['/', '/login', '/dashboard', '/admin', '/teacher', '/student'];
    commonReactRoutes.forEach(route => {
      app.get(route, (req, res) => {
        const indexPath = path.join(__dirname, '../../build', 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Frontend build not found');
        }
      });
    });
  }
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