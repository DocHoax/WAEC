const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = 'uploads/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create user-specific directory if user is authenticated
    let userDir = uploadsDir;
    if (req.user && req.user.id) {
      userDir = path.join(uploadsDir, req.user.id.toString());
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
    }
    
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExtension)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50); // Limit filename length
    
    const filename = `${baseName}-${uniqueSuffix}${fileExtension}`;
    
    console.log('Multer - File upload initiated', {
      userId: req.user?.id,
      originalName: file.originalname,
      generatedName: filename,
      mimeType: file.mimetype,
      size: file.size
    });
    
    cb(null, filename);
  }
});

// File filter configuration
const fileFilter = (req, file, cb) => {
  const allowedMimes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'text/plain': true,
    'application/vnd.ms-excel': true,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true
  };

  if (allowedMimes[file.mimetype]) {
    cb(null, true);
  } else {
    console.warn('Multer - File type rejected', {
      userId: req.user?.id,
      filename: file.originalname,
      mimeType: file.mimetype,
      allowedTypes: Object.keys(allowedMimes)
    });
    
    cb(new Error(`File type '${file.mimetype}' is not allowed. Allowed types: ${Object.keys(allowedMimes).join(', ')}`), false);
  }
};

// File size limits (5MB for images, 10MB for documents)
const limits = {
  fileSize: 10 * 1024 * 1024, // 10MB
  files: 5 // Maximum number of files
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits,
  onError: (error, next) => {
    console.error('Multer - Upload error', {
      error: error.message,
      code: error.code
    });
    next(error);
  }
});

// Custom middleware for different file types
const uploadImage = upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'questionImage', maxCount: 1 },
  { name: 'examDocument', maxCount: 1 }
]);

const uploadDocuments = upload.fields([
  { name: 'documents', maxCount: 5 },
  { name: 'bulkUpload', maxCount: 1 }
]);

const uploadSingleImage = upload.single('image');
const uploadSingleDocument = upload.single('document');

// Middleware to validate file uploads
const validateFileUpload = (req, res, next) => {
  if (!req.file && (!req.files || Object.keys(req.files).length === 0)) {
    return next(); // No files to validate
  }

  // Validate individual file
  const validateFile = (file) => {
    const maxSizes = {
      'image/': 5 * 1024 * 1024, // 5MB for images
      'application/pdf': 10 * 1024 * 1024, // 10MB for PDFs
      'application/msword': 10 * 1024 * 1024,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 10 * 1024 * 1024,
      'text/plain': 1 * 1024 * 1024, // 1MB for text files
      'application/vnd.ms-excel': 5 * 1024 * 1024,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 5 * 1024 * 1024
    };

    // Find matching file type
    const fileType = Object.keys(maxSizes).find(type => file.mimetype.startsWith(type));
    const maxSize = fileType ? maxSizes[fileType] : 5 * 1024 * 1024; // Default 5MB

    if (file.size > maxSize) {
      throw new Error(`File '${file.originalname}' exceeds maximum size of ${maxSize / (1024 * 1024)}MB`);
    }

    // Additional image validation
    if (file.mimetype.startsWith('image/')) {
      const allowedDimensions = {
        profilePicture: { width: 500, height: 500 },
        questionImage: { width: 800, height: 600 },
        default: { width: 1200, height: 1200 }
      };
      
      // Note: Actual dimension validation would require image processing
      console.log('File validation - Image uploaded', {
        filename: file.originalname,
        size: file.size,
        fieldname: file.fieldname
      });
    }
  };

  try {
    if (req.file) {
      validateFile(req.file);
    }

    if (req.files) {
      Object.values(req.files).flat().forEach(validateFile);
    }

    console.log('File validation - All files validated successfully', {
      userId: req.user?.id,
      fileCount: req.file ? 1 : (req.files ? Object.values(req.files).flat().length : 0)
    });

    next();
  } catch (error) {
    console.error('File validation - Validation failed', {
      error: error.message,
      userId: req.user?.id
    });

    // Clean up uploaded files on validation failure
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(400).json({ 
      error: error.message,
      code: 'FILE_VALIDATION_FAILED'
    });
  }
};

// Middleware to clean up files on error
const cleanupUploadedFiles = (req, res, next) => {
  const cleanup = () => {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('File cleanup - Removed file', { path: req.file.path });
    }

    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log('File cleanup - Removed file', { path: file.path });
        }
      });
    }
  };

  // Cleanup on response finish if there's an error
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode >= 400) {
      cleanup();
    }
    originalSend.call(this, data);
  };

  // Cleanup on request error
  req.on('error', cleanup);

  next();
};

module.exports = {
  upload,
  uploadImage,
  uploadDocuments,
  uploadSingleImage,
  uploadSingleDocument,
  validateFileUpload,
  cleanupUploadedFiles
};