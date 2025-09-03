const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['super_admin', 'admin', 'teacher', 'student'],
    index: true
  },
  permissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: true
  }
}, {
  timestamps: true
});

// Create a compound index to ensure unique role-permission combinations
rolePermissionSchema.index({ role: 1, permissionId: 1 }, { unique: true });

module.exports = mongoose.model('RolePermission', rolePermissionSchema);