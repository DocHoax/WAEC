const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Permission name is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z_]+$/, 'Permission name can only contain uppercase letters and underscores']
  },
  description: {
    type: String,
    required: [true, 'Permission description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  category: {
    type: String,
    required: [true, 'Permission category is required'],
    trim: true,
    enum: {
      values: ['user_management', 'academic_management', 'system_management', 'analytics', 'content_management', 'admin_management'],
      message: 'Category must be user_management, academic_management, system_management, analytics, content_management, or admin_management'
    }
  },
  module: {
    type: String,
    required: [true, 'Permission module is required'],
    trim: true,
    enum: {
      values: ['users', 'sessions', 'classes', 'subjects', 'tests', 'results', 'academic_records', 'analytics', 'permissions', 'system', 'admin'],
      message: 'Invalid module specified'
    }
  },
  isDangerous: {
    type: Boolean,
    default: false,
    description: 'Dangerous permissions require extra approval'
  },
  requiredRole: {
    type: String,
    enum: ['super_admin', 'admin', 'teacher', 'student'],
    default: 'admin'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Index for better query performance
permissionSchema.index({ category: 1, module: 1 });
permissionSchema.index({ name: 1 }, { unique: true });
permissionSchema.index({ isActive: 1 });

// Virtual for display name
permissionSchema.virtual('displayName').get(function() {
  return this.name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
});

// Static method to get permissions by role
permissionSchema.statics.getByRole = function(role) {
  const roleHierarchy = {
    'super_admin': ['super_admin', 'admin', 'teacher', 'student'],
    'admin': ['admin', 'teacher', 'student'],
    'teacher': ['teacher', 'student'],
    'student': ['student']
  };
 
  const allowedRoles = roleHierarchy[role] || ['student'];
  return this.find({
    requiredRole: { $in: allowedRoles },
    isActive: true
  }).sort({ category: 1, name: 1 });
};

// Static method to seed default permissions
permissionSchema.statics.seedDefaultPermissions = async function(createdBy) {
  const defaultPermissions = [
    // User Management
    { name: 'VIEW_USERS', description: 'View all users', category: 'user_management', module: 'users', requiredRole: 'admin' },
    { name: 'CREATE_USERS', description: 'Create new users', category: 'user_management', module: 'users', requiredRole: 'admin' },
    { name: 'EDIT_USERS', description: 'Edit existing users', category: 'user_management', module: 'users', requiredRole: 'admin' },
    { name: 'DELETE_USERS', description: 'Delete users', category: 'user_management', module: 'users', requiredRole: 'admin', isDangerous: true },
    { name: 'MANAGE_USER_PERMISSIONS', description: 'Manage user permissions', category: 'user_management', module: 'users', requiredRole: 'admin' },
   
    // Session Management
    { name: 'VIEW_SESSIONS', description: 'View academic sessions', category: 'academic_management', module: 'sessions', requiredRole: 'teacher' },
    { name: 'CREATE_SESSIONS', description: 'Create academic sessions', category: 'academic_management', module: 'sessions', requiredRole: 'admin' },
    { name: 'EDIT_SESSIONS', description: 'Edit academic sessions', category: 'academic_management', module: 'sessions', requiredRole: 'admin' },
    { name: 'DELETE_SESSIONS', description: 'Delete academic sessions', category: 'academic_management', module: 'sessions', requiredRole: 'admin', isDangerous: true },
    { name: 'MANAGE_ACTIVE_SESSION', description: 'Set active academic session', category: 'academic_management', module: 'sessions', requiredRole: 'admin' },
   
    // Results Management
    { name: 'VIEW_RESULTS', description: 'View test results', category: 'academic_management', module: 'results', requiredRole: 'teacher' },
    { name: 'MANAGE_RESULTS', description: 'Manage and edit results', category: 'academic_management', module: 'results', requiredRole: 'admin' },
   
    // Analytics
    { name: 'VIEW_ANALYTICS', description: 'View system analytics', category: 'analytics', module: 'analytics', requiredRole: 'teacher' },
    { name: 'MANAGE_ANALYTICS', description: 'Manage analytics settings', category: 'analytics', module: 'analytics', requiredRole: 'admin' },
   
    // Subjects
    { name: 'VIEW_SUBJECTS', description: 'View all subjects', category: 'academic_management', module: 'subjects', requiredRole: 'teacher' },
    { name: 'MANAGE_SUBJECTS', description: 'Manage subjects', category: 'academic_management', module: 'subjects', requiredRole: 'admin' },
   
    // Cheat Logs
    { name: 'VIEW_CHEAT_LOGS', description: 'View cheating violation logs', category: 'system_management', module: 'system', requiredRole: 'teacher' },
    { name: 'MANAGE_CHEAT_LOGS', description: 'Manage cheating violation logs', category: 'system_management', module: 'system', requiredRole: 'admin' },
   
    // Transcripts
    { name: 'VIEW_TRANSCRIPTS', description: 'View student transcripts', category: 'academic_management', module: 'academic_records', requiredRole: 'teacher' },
   
    // Promotion
    { name: 'VIEW_PROMOTION', description: 'View promotion candidates', category: 'academic_management', module: 'academic_records', requiredRole: 'teacher' },
    { name: 'PROMOTE_STUDENTS', description: 'Promote students to next class', category: 'academic_management', module: 'academic_records', requiredRole: 'admin' },
   
    // Permissions Management
    { name: 'VIEW_PERMISSIONS', description: 'View all permissions', category: 'system_management', module: 'permissions', requiredRole: 'super_admin' },
    { name: 'MANAGE_PERMISSIONS', description: 'Manage system permissions', category: 'system_management', module: 'permissions', requiredRole: 'super_admin', isDangerous: true },

    // ADMIN-SPECIFIC PERMISSIONS (NEW)
    { name: 'MANAGE_ADMINS', description: 'Create and manage administrators', category: 'admin_management', module: 'admin', requiredRole: 'super_admin', isDangerous: true },
    { name: 'APPROVE_TESTS', description: 'Approve tests for publication', category: 'academic_management', module: 'tests', requiredRole: 'admin' },
    { name: 'SYSTEM_CONFIG', description: 'Configure system settings', category: 'system_management', module: 'system', requiredRole: 'admin' }
  ];

  for (const permData of defaultPermissions) {
    const existingPerm = await this.findOne({ name: permData.name });
    if (!existingPerm) {
      await this.create({
        ...permData,
        createdBy: createdBy
      });
    }
  }
};

// Ensure virtual fields are serialized
permissionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Permission', permissionSchema);