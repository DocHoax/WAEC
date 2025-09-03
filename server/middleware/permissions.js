const RolePermission = require('../models/RolePermission');
const Permission = require('../models/Permission');

// Middleware to check if user has specific permission
const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      // Super admin bypasses all permission checks
      if (req.user.role === 'super_admin') {
        return next();
      }

      // Find the permission by name
      const permission = await Permission.findOne({ name: permissionName });
      if (!permission) {
        return res.status(403).json({ message: 'Permission not found' });
      }

      // Check if user's role has this permission
      const hasPermission = await RolePermission.findOne({
        role: req.user.role,
        permissionId: permission._id
      });

      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'Access denied. Insufficient permissions.' 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Server error during permission check' });
    }
  };
};

// Middleware to check if user has any of the provided permissions
const checkAnyPermission = (permissionNames) => {
  return async (req, res, next) => {
    try {
      // Super admin bypasses all permission checks
      if (req.user.role === 'super_admin') {
        return next();
      }

      // Find all specified permissions
      const permissions = await Permission.find({ 
        name: { $in: permissionNames } 
      });

      if (permissions.length === 0) {
        return res.status(403).json({ message: 'No valid permissions found' });
      }

      const permissionIds = permissions.map(p => p._id);

      // Check if user's role has any of these permissions
      const hasAnyPermission = await RolePermission.findOne({
        role: req.user.role,
        permissionId: { $in: permissionIds }
      });

      if (!hasAnyPermission) {
        return res.status(403).json({ 
          message: 'Access denied. Insufficient permissions.' 
        });
      }

      next();
    } catch (error) {
      console.error('Any permission check error:', error);
      res.status(500).json({ message: 'Server error during permission check' });
    }
  };
};

module.exports = {
  checkPermission,
  checkAnyPermission
};