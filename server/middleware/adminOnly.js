const { adminOnly } = require('./auth');

// Enhanced adminOnly middleware with backward compatibility
module.exports = (req, res, next) => {
  // Use the enhanced adminOnly middleware from auth.js
  adminOnly(req, res, (error) => {
    if (error) {
      // Handle the error from the enhanced middleware
      console.error('AdminOnly middleware - Access denied:', {
        userId: req.user?.id,
        username: req.user?.username,
        role: req.user?.role,
        path: req.path,
        method: req.method,
        ip: req.ip,
        error: error.message
      });
      
      // Return the error response from the enhanced middleware
      return res.status(error.status || 403).json({
        error: error.message || 'Admin access required',
        code: error.code || 'ADMIN_ACCESS_DENIED',
        userRole: req.user?.role
      });
    }
    
    // Log successful access
    console.log('AdminOnly middleware - Access granted:', {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    next();
  });
};

// Additional admin validation middleware
module.exports.validateAdminContext = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next();
  }

  // Add admin-specific context to the request
  req.adminContext = {
    isAdmin: true,
    adminId: req.user.id,
    adminName: req.user.name,
    permissions: req.user.permissions || [],
    accessTime: new Date()
  };

  console.log('Admin context validated:', {
    adminId: req.user.id,
    adminName: req.user.name,
    permissionsCount: req.user.permissions?.length || 0,
    path: req.path
  });

  next();
};

// Middleware for super admin only (highest privilege)
module.exports.superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    console.error('SuperAdminOnly middleware - Access denied:', {
      userId: req.user?.id,
      username: req.user?.username,
      role: req.user?.role,
      requiredRole: 'super_admin',
      path: req.path
    });
    
    return res.status(403).json({
      error: 'Super administrator access required',
      code: 'SUPER_ADMIN_ACCESS_DENIED',
      userRole: req.user?.role,
      requiredRole: 'super_admin'
    });
  }

  console.log('SuperAdminOnly middleware - Access granted:', {
    userId: req.user.id,
    username: req.user.username,
    role: req.user.role,
    path: req.path,
    timestamp: new Date().toISOString()
  });

  // Add super admin context
  req.superAdminContext = {
    isSuperAdmin: true,
    superAdminId: req.user.id,
    superAdminName: req.user.name,
    hasAllPermissions: true
  };

  next();
};

// Middleware for admin operations that require confirmation
module.exports.confirmAdminAction = (req, res, next) => {
  const dangerousActions = [
    'DELETE', 'PUT', 'PATCH' // Modify as needed based on your dangerous operations
  ];

  const requiresConfirmation = dangerousActions.includes(req.method) && 
                              req.headers['x-admin-action-confirmed'] !== 'true';

  if (requiresConfirmation) {
    console.warn('Admin action requires confirmation:', {
      adminId: req.user.id,
      username: req.user.username,
      method: req.method,
      path: req.path,
      action: 'Dangerous operation attempted without confirmation'
    });

    return res.status(428).json({
      error: 'Dangerous admin operation requires explicit confirmation',
      code: 'ADMIN_ACTION_CONFIRMATION_REQUIRED',
      message: 'Please confirm this action by including x-admin-action-confirmed: true header',
      requiredHeader: 'x-admin-action-confirmed',
      dangerousOperation: true
    });
  }

  if (req.headers['x-admin-action-confirmed'] === 'true') {
    console.log('Admin action confirmed:', {
      adminId: req.user.id,
      username: req.user.username,
      method: req.method,
      path: req.path,
      confirmedAt: new Date().toISOString()
    });
  }

  next();
};