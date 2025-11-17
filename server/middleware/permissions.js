const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');

// Cache for permissions to reduce database queries
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clear permission cache
const clearPermissionCache = () => {
  permissionCache.clear();
  console.log('Permission cache cleared');
};

// Get permission from cache or database
const getPermission = async (permissionName) => {
  const cached = permissionCache.get(permissionName);
 
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permission;
  }

  const permission = await Permission.findOne({
    name: permissionName,
    isActive: true
  });

  if (permission) {
    permissionCache.set(permissionName, {
      permission,
      timestamp: Date.now()
    });
  }

  return permission;
};

// UPDATED: Middleware to check if user has specific permission with admin permissions support
const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      // Super admin bypasses all permission checks
      if (req.user.role === 'super_admin') {
        console.log('Permission check - Super admin bypass', {
          userId: req.user.id,
          username: req.user.username,
          permission: permissionName,
          path: req.path
        });
        return next();
      }

      if (!req.user) {
        console.error('Permission check - No user in request', {
          permission: permissionName,
          path: req.path
        });
        return res.status(401).json({
          error: 'Authentication required for permission check.',
          code: 'AUTH_REQUIRED'
        });
      }

      console.log('Permission check - Processing', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        permission: permissionName,
        path: req.path
      });

      // Find the permission
      const permission = await getPermission(permissionName);
     
      if (!permission) {
        console.error('Permission check - Permission not found', {
          permission: permissionName,
          userId: req.user.id
        });
        return res.status(500).json({
          error: 'Permission configuration error.',
          code: 'PERMISSION_NOT_FOUND',
          details: `Permission '${permissionName}' is not configured in the system.`
        });
      }

      // Check if user's role meets the required role for this permission
      const roleHierarchy = {
        'super_admin': 4,
        'admin': 3,
        'teacher': 2,
        'student': 1
      };

      const userRoleLevel = roleHierarchy[req.user.role] || 0;
      const requiredRoleLevel = roleHierarchy[permission.requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        console.warn('Permission check - Role level insufficient', {
          userId: req.user.id,
          username: req.user.username,
          userRole: req.user.role,
          userRoleLevel: userRoleLevel,
          requiredRole: permission.requiredRole,
          requiredRoleLevel: requiredRoleLevel,
          permission: permissionName
        });
        return res.status(403).json({
          error: `Insufficient role level. Required role: ${permission.requiredRole}.`,
          code: 'ROLE_LEVEL_INSUFFICIENT',
          requiredRole: permission.requiredRole,
          userRole: req.user.role
        });
      }

      // NEW: Check admin-specific permissions for admin users
      if (req.user.role === 'admin') {
        // Check if admin has this specific admin permission
        if (req.user.adminPermissions && req.user.adminPermissions.includes(permissionName)) {
          console.log('Permission check - Admin permission granted', {
            userId: req.user.id,
            username: req.user.username,
            permission: permissionName,
            adminPermissions: req.user.adminPermissions
          });
          return next();
        }
      }

      // Check if user has explicit permission (for non-super_admin roles)
      if (req.user.role !== 'super_admin') {
        const hasExplicitPermission = req.user.permissions?.some(
          userPerm => userPerm.name === permissionName || userPerm._id.toString() === permission._id.toString()
        );

        if (!hasExplicitPermission) {
          console.warn('Permission check - Explicit permission denied', {
            userId: req.user.id,
            username: req.user.username,
            role: req.user.role,
            permission: permissionName,
            userPermissions: req.user.permissions?.map(p => p.name) || [],
            adminPermissions: req.user.adminPermissions || []
          });
          return res.status(403).json({
            error: 'Access denied. Insufficient permissions.',
            code: 'PERMISSION_DENIED',
            requiredPermission: permissionName,
            userPermissions: req.user.permissions?.map(p => p.name) || [],
            adminPermissions: req.user.adminPermissions || []
          });
        }
      }

      console.log('Permission check - Access granted', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        permission: permissionName,
        path: req.path
      });

      // Add permission context to request for logging
      req.permissionContext = {
        name: permissionName,
        description: permission.description,
        category: permission.category,
        module: permission.module
      };

      next();
    } catch (error) {
      console.error('Permission check - Server error', {
        error: error.message,
        permission: permissionName,
        userId: req.user?.id,
        stack: error.stack
      });
      res.status(500).json({
        error: 'Server error during permission verification.',
        code: 'PERMISSION_SERVER_ERROR'
      });
    }
  };
};

// UPDATED: Middleware to check if user has any of the provided permissions with admin support
const checkAnyPermission = (permissionNames) => {
  return async (req, res, next) => {
    try {
      // Super admin bypasses all permission checks
      if (req.user.role === 'super_admin') {
        console.log('AnyPermission check - Super admin bypass', {
          userId: req.user.id,
          username: req.user.username,
          permissions: permissionNames,
          path: req.path
        });
        return next();
      }

      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required.',
          code: 'AUTH_REQUIRED'
        });
      }

      console.log('AnyPermission check - Processing', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        permissions: permissionNames,
        path: req.path
      });

      const permissions = await Promise.all(
        permissionNames.map(name => getPermission(name))
      );

      const validPermissions = permissions.filter(p => p !== null);
     
      if (validPermissions.length === 0) {
        console.error('AnyPermission check - No valid permissions found', {
          requestedPermissions: permissionNames,
          userId: req.user.id
        });
        return res.status(500).json({
          error: 'Permission configuration error.',
          code: 'NO_VALID_PERMISSIONS'
        });
      }

      // Check role level against the most permissive permission
      const roleHierarchy = {
        'super_admin': 4,
        'admin': 3,
        'teacher': 2,
        'student': 1
      };

      const userRoleLevel = roleHierarchy[req.user.role] || 0;
      const highestRequiredLevel = Math.min(
        ...validPermissions.map(p => roleHierarchy[p.requiredRole] || 0)
      );

      if (userRoleLevel < highestRequiredLevel) {
        console.warn('AnyPermission check - Role level insufficient', {
          userId: req.user.id,
          userRole: req.user.role,
          userRoleLevel: userRoleLevel,
          highestRequiredLevel: highestRequiredLevel,
          permissions: permissionNames
        });
        return res.status(403).json({
          error: 'Insufficient role level for any of the required permissions.',
          code: 'ROLE_LEVEL_INSUFFICIENT'
        });
      }

      // NEW: Check admin-specific permissions for admin users
      if (req.user.role === 'admin') {
        const hasAnyAdminPermission = permissionNames.some(permissionName =>
          req.user.adminPermissions?.includes(permissionName)
        );

        if (hasAnyAdminPermission) {
          console.log('AnyPermission check - Admin permission granted', {
            userId: req.user.id,
            username: req.user.username,
            grantedPermissions: permissionNames.filter(p => 
              req.user.adminPermissions?.includes(p)
            ),
            adminPermissions: req.user.adminPermissions
          });
          return next();
        }
      }

      // Check if user has any of the explicit permissions
      if (req.user.role !== 'super_admin') {
        const hasAnyPermission = validPermissions.some(permission =>
          req.user.permissions?.some(
            userPerm => userPerm.name === permission.name || userPerm._id.toString() === permission._id.toString()
          )
        );

        if (!hasAnyPermission) {
          console.warn('AnyPermission check - No explicit permissions granted', {
            userId: req.user.id,
            username: req.user.username,
            requestedPermissions: permissionNames,
            userPermissions: req.user.permissions?.map(p => p.name) || [],
            adminPermissions: req.user.adminPermissions || []
          });
          return res.status(403).json({
            error: 'Access denied. Insufficient permissions.',
            code: 'NO_PERMISSIONS_GRANTED',
            requiredPermissions: permissionNames,
            userPermissions: req.user.permissions?.map(p => p.name) || [],
            adminPermissions: req.user.adminPermissions || []
          });
        }
      }

      console.log('AnyPermission check - Access granted', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        grantedPermissions: permissionNames,
        path: req.path
      });

      next();
    } catch (error) {
      console.error('AnyPermission check - Server error', {
        error: error.message,
        permissions: permissionNames,
        userId: req.user?.id
      });
      res.status(500).json({
        error: 'Server error during permission verification.',
        code: 'PERMISSION_SERVER_ERROR'
      });
    }
  };
};

// Middleware to check if user has all of the provided permissions
const checkAllPermissions = (permissionNames) => {
  return async (req, res, next) => {
    try {
      // Super admin bypasses all permission checks
      if (req.user.role === 'super_admin') {
        return next();
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      const permissions = await Promise.all(
        permissionNames.map(name => getPermission(name))
      );

      const validPermissions = permissions.filter(p => p !== null);
     
      if (validPermissions.length !== permissionNames.length) {
        return res.status(500).json({
          error: 'Some permissions are not configured in the system.'
        });
      }

      // Check role level against the most restrictive permission
      const roleHierarchy = {
        'super_admin': 4,
        'admin': 3,
        'teacher': 2,
        'student': 1
      };

      const userRoleLevel = roleHierarchy[req.user.role] || 0;
      const highestRequiredLevel = Math.max(
        ...validPermissions.map(p => roleHierarchy[p.requiredRole] || 0)
      );

      if (userRoleLevel < highestRequiredLevel) {
        return res.status(403).json({
          error: 'Insufficient role level for all required permissions.'
        });
      }

      // NEW: Check admin-specific permissions for admin users
      if (req.user.role === 'admin') {
        const hasAllAdminPermissions = permissionNames.every(permissionName =>
          req.user.adminPermissions?.includes(permissionName)
        );

        if (hasAllAdminPermissions) {
          return next();
        }
      }

      // Check if user has all the explicit permissions
      if (req.user.role !== 'super_admin') {
        const hasAllPermissions = validPermissions.every(permission =>
          req.user.permissions?.some(
            userPerm => userPerm.name === permission.name || userPerm._id.toString() === permission._id.toString()
          )
        );

        if (!hasAllPermissions) {
          return res.status(403).json({
            error: 'Access denied. Missing some required permissions.',
            missingPermissions: permissionNames.filter(name =>
              !req.user.permissions?.some(userPerm => userPerm.name === name)
            )
          });
        }
      }

      next();
    } catch (error) {
      console.error('AllPermissions check error:', error);
      res.status(500).json({ error: 'Server error during permission verification.' });
    }
  };
};

// Permission validation for dangerous operations
const validateDangerousPermission = (req, res, next) => {
  const dangerousPermissions = req.user.permissions?.filter(p => p.isDangerous) || [];
 
  if (dangerousPermissions.length > 0 && !req.headers['x-dangerous-operation-confirmed']) {
    return res.status(403).json({
      error: 'Dangerous operation requires explicit confirmation.',
      code: 'DANGEROUS_OPERATION',
      dangerousPermissions: dangerousPermissions.map(p => p.name),
      confirmationHeader: 'x-dangerous-operation-confirmed'
    });
  }

  next();
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  validateDangerousPermission,
  clearPermissionCache,
  getPermission
};