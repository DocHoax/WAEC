const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: true
  },
  grantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  grantedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    description: 'Optional expiration date for temporary permissions'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique permission assignments
rolePermissionSchema.index({ userId: 1, permissionId: 1 }, { unique: true });

// Index for querying active permissions
rolePermissionSchema.index({ userId: 1, isActive: 1 });

// Static method to get user permissions
rolePermissionSchema.statics.getUserPermissions = function(userId) {
  return this.find({ 
    userId: userId,
    isActive: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }).populate('permissionId');
};

module.exports = mongoose.model('RolePermission', rolePermissionSchema);