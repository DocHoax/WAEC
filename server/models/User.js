const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [50, 'Username cannot exceed 50 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  surname: {
    type: String,
    required: [true, 'Surname is required'],
    trim: true,
    maxlength: [100, 'Surname cannot exceed 100 characters']
  },
  studentId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple nulls but only one of each value
    trim: true,
    uppercase: true
  },
  role: {
    type: String,
    enum: {
      values: ['super_admin', 'admin', 'teacher', 'student'],
      message: 'Role must be super_admin, admin, teacher, or student'
    },
    required: [true, 'Role is required'],
    default: 'student'
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    validate: {
      validator: function(classId) {
        // Students must have a class, others may not
        if (this.role === 'student') {
          return classId != null;
        }
        return true;
      },
      message: 'Students must be assigned to a class'
    }
  },
  subjects: [{
    subject: {
      type: String,
      required: true,
      trim: true
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    }
  }],
  enrolledSubjects: [{
    subject: {
      type: String,
      required: true,
      trim: true
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    }
  }],
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  // NEW: Admin-specific permissions for granular admin access
  adminPermissions: [{
    type: String,
    enum: [
      'MANAGE_USERS',
      'APPROVE_TESTS', 
      'MANAGE_RESULTS',
      'SYSTEM_CONFIG',
      'VIEW_ANALYTICS',
      'MANAGE_ADMINS'
    ]
  }],
  blocked: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  picture: {
    type: String,
    default: ''
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(date) {
        return !date || date < new Date();
      },
      message: 'Date of birth cannot be in the future'
    }
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number']
  },
  sex: {
    type: String,
    enum: {
      values: ['male', 'female', 'other'],
      message: 'Sex must be male, female, or other'
    }
  },
  age: {
    type: Number,
    min: [3, 'Age must be at least 3'],
    max: [120, 'Age cannot exceed 120']
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ role: 1, active: 1 });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ studentId: 1 }, { unique: true, sparse: true });
userSchema.index({ adminPermissions: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.name} ${this.surname}`.trim();
});

// Virtual for isLocked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
 
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(12);
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!candidatePassword || !this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// UPDATED: Method to check permission with admin permissions support
userSchema.methods.hasPermission = function(permissionName) {
  if (this.role === 'super_admin') {
    return true; // Super admin has all permissions
  }

  // Check admin-specific permissions for admin users
  if (this.role === 'admin' && this.adminPermissions && this.adminPermissions.includes(permissionName)) {
    return true;
  }
 
  if (!this.permissions || !Array.isArray(this.permissions)) {
    return false;
  }
 
  // Check if user has the specific permission
  return this.permissions.some(perm =>
    perm.name === permissionName || perm._id.toString() === permissionName
  );
};

// NEW: Method to check admin permission specifically
userSchema.methods.hasAdminPermission = function(adminPermission) {
  if (this.role === 'super_admin') {
    return true;
  }
  
  if (this.role === 'admin' && this.adminPermissions) {
    return this.adminPermissions.includes(adminPermission);
  }
  
  return false;
};

// Method to check role
userSchema.methods.isInRole = function(roles) {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return roleArray.includes(this.role);
};

// Static method for authentication
userSchema.statics.authenticate = async function(username, password) {
  const user = await this.findOne({
    username: username.toLowerCase(),
    active: true,
    blocked: false
  }).populate('permissions');
 
  if (!user) {
    return null;
  }
 
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return null;
  }
 
  // Update last login
  user.lastLogin = new Date();
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
 
  return user;
};

// Instance method to get user profile (without sensitive info)
userSchema.methods.getProfile = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    name: this.name,
    surname: this.surname,
    fullName: this.fullName,
    role: this.role,
    class: this.class,
    subjects: this.subjects,
    enrolledSubjects: this.enrolledSubjects,
    adminPermissions: this.adminPermissions, // NEW: Include admin permissions
    picture: this.picture,
    dateOfBirth: this.dateOfBirth,
    address: this.address,
    phoneNumber: this.phoneNumber,
    sex: this.sex,
    age: this.age,
    active: this.active,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive information
    delete ret.password;
    delete ret.loginAttempts;
    delete ret.lockUntil;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);