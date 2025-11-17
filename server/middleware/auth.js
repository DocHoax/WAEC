const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('Auth middleware - No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(401).json({ 
        error: 'Access denied. No authentication token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('permissions', 'name description')
      .lean();

    if (!user) {
      console.log('Auth middleware - User not found', {
        userId: decoded.id,
        tokenIssuedAt: new Date(decoded.iat * 1000)
      });
      return res.status(401).json({ 
        error: 'User account no longer exists.',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.active) {
      console.log('Auth middleware - User account inactive', {
        userId: user._id,
        username: user.username
      });
      return res.status(401).json({ 
        error: 'Account has been deactivated. Please contact administrator.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    if (user.blocked) {
      console.log('Auth middleware - User account blocked', {
        userId: user._id,
        username: user.username
      });
      return res.status(401).json({ 
        error: 'Account has been blocked. Please contact administrator.',
        code: 'ACCOUNT_BLOCKED'
      });
    }

    // NEW: Enhanced super_admin validation
    if (user.role === 'super_admin') {
      console.log('Auth middleware - Super admin access detected', {
        userId: user._id,
        username: user.username,
        ip: req.ip
      });
      
      // Additional security checks for super_admin
      const superAdminCheck = await User.findOne({
        _id: user._id,
        role: 'super_admin',
        active: true,
        blocked: false
      }).select('_id role active blocked');

      if (!superAdminCheck) {
        console.error('Auth middleware - Super admin validation failed', {
          userId: user._id,
          username: user.username
        });
        return res.status(401).json({ 
          error: 'Super admin account validation failed.',
          code: 'SUPER_ADMIN_VALIDATION_FAILED'
        });
      }
    }

    // Add user to request object with enhanced information
    req.user = {
      id: user._id,
      userId: user._id, // Maintain compatibility
      username: user.username,
      email: user.email,
      name: user.name,
      surname: user.surname,
      role: user.role,
      studentId: user.studentId,
      class: user.class,
      subjects: user.subjects,
      enrolledSubjects: user.enrolledSubjects,
      permissions: user.permissions || [],
      adminPermissions: user.adminPermissions || [], // NEW: Include admin permissions
      lastLogin: user.lastLogin,
      isLocked: user.isLocked || false
    };

    console.log('Auth middleware - Authentication successful', {
      userId: user._id,
      username: user.username,
      role: user.role,
      permissions: user.permissions?.length || 0,
      adminPermissions: user.adminPermissions?.length || 0, // NEW: Log admin permissions
      ip: req.ip,
      path: req.path
    });

    next();
  } catch (error) {
    console.error('Auth middleware - Token verification failed', {
      error: error.message,
      token: req.header('Authorization') ? 'Present' : 'Missing',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid authentication token.',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Authentication token has expired.',
        code: 'TOKEN_EXPIRED'
      });
    }

    res.status(500).json({ 
      error: 'Authentication failed due to server error.',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

// Role-based middleware with enhanced logging and validation
const createRoleMiddleware = (allowedRoles, middlewareName) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    console.log(`Role middleware (${middlewareName}) - Checking access`, {
      userId: req.user?.id,
      username: req.user?.username,
      userRole: userRole,
      allowedRoles: allowedRoles,
      path: req.path,
      method: req.method
    });

    if (!req.user) {
      console.error(`Role middleware (${middlewareName}) - No user in request`);
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    const roleArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    // NEW: Enhanced super_admin access - super_admin bypasses all role checks
    if (userRole === 'super_admin') {
      console.log(`Role middleware (${middlewareName}) - Super admin bypass`, {
        userId: req.user.id,
        username: req.user.username
      });
      return next();
    }
    
    if (!roleArray.includes(userRole)) {
      console.warn(`Role middleware (${middlewareName}) - Access denied`, {
        userId: req.user.id,
        username: req.user.username,
        userRole: userRole,
        requiredRoles: roleArray,
        path: req.path
      });

      const roleNames = roleArray.map(role => 
        role.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
      );

      return res.status(403).json({ 
        error: `Access restricted to ${roleNames.join(' or ')} only.`,
        code: 'ROLE_ACCESS_DENIED',
        requiredRoles: roleArray,
        userRole: userRole
      });
    }

    console.log(`Role middleware (${middlewareName}) - Access granted`, {
      userId: req.user.id,
      username: req.user.username,
      role: userRole
    });

    next();
  };
};

// Specific role middlewares
const superAdminOnly = createRoleMiddleware('super_admin', 'SuperAdminOnly');
const adminOnly = createRoleMiddleware('admin', 'AdminOnly');
const teacherOnly = createRoleMiddleware('teacher', 'TeacherOnly');
const studentOnly = createRoleMiddleware('student', 'StudentOnly');

// Combined role middlewares
const adminOrTeacher = createRoleMiddleware(['admin', 'teacher'], 'AdminOrTeacher');
const teacherOrStudent = createRoleMiddleware(['teacher', 'student'], 'TeacherOrStudent');
const adminOrSuperAdmin = createRoleMiddleware(['admin', 'super_admin'], 'AdminOrSuperAdmin');

// NEW: Admin with specific permission middleware
const adminWithPermission = (permissionName) => {
  return (req, res, next) => {
    console.log('Admin permission middleware - Checking:', {
      userId: req.user?.id,
      username: req.user?.username,
      role: req.user?.role,
      permission: permissionName,
      adminPermissions: req.user?.adminPermissions
    });

    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    // Super admin bypasses all permission checks
    if (req.user.role === 'super_admin') {
      console.log('Admin permission middleware - Super admin bypass', {
        userId: req.user.id,
        username: req.user.username
      });
      return next();
    }

    // Check if user is admin and has the specific permission
    if (req.user.role !== 'admin') {
      console.warn('Admin permission middleware - Not an admin', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role
      });
      return res.status(403).json({ 
        error: 'Admin access required.',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    if (!req.user.adminPermissions || !req.user.adminPermissions.includes(permissionName)) {
      console.warn('Admin permission middleware - Permission denied', {
        userId: req.user.id,
        username: req.user.username,
        requiredPermission: permissionName,
        userPermissions: req.user.adminPermissions
      });
      return res.status(403).json({ 
        error: `Admin permission '${permissionName}' required.`,
        code: 'ADMIN_PERMISSION_DENIED',
        requiredPermission: permissionName
      });
    }

    console.log('Admin permission middleware - Access granted', {
      userId: req.user.id,
      username: req.user.username,
      permission: permissionName
    });

    next();
  };
};

// Subject assignment validation middleware
const validateTeacherSubject = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return next();
  }

  const { subject, class: classId } = req.body;
  
  if (!subject || !classId) {
    return next();
  }

  const hasAccess = req.user.subjects?.some(sub => 
    sub.subject === subject && sub.class.toString() === classId.toString()
  );

  if (!hasAccess) {
    console.warn('Subject validation - Teacher not assigned to subject/class', {
      userId: req.user.id,
      username: req.user.username,
      requestedSubject: subject,
      requestedClass: classId,
      assignedSubjects: req.user.subjects
    });

    return res.status(403).json({ 
      error: 'You are not assigned to teach this subject in the specified class.',
      code: 'SUBJECT_ACCESS_DENIED'
    });
  }

  next();
};

// Class assignment validation middleware
const validateTeacherClass = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return next();
  }

  const classId = req.params.classId || req.body.class;
  
  if (!classId) {
    return next();
  }

  const hasAccess = req.user.subjects?.some(sub => 
    sub.class.toString() === classId.toString()
  );

  if (!hasAccess) {
    console.warn('Class validation - Teacher not assigned to class', {
      userId: req.user.id,
      username: req.user.username,
      requestedClass: classId,
      assignedClasses: req.user.subjects?.map(sub => sub.class) || []
    });

    return res.status(403).json({ 
      error: 'You are not assigned to teach in this class.',
      code: 'CLASS_ACCESS_DENIED'
    });
  }

  next();
};

// Student self-access validation
const validateStudentAccess = (req, res, next) => {
  if (req.user.role !== 'student') {
    return next();
  }

  const studentId = req.params.studentId || req.body.studentId;
  
  if (studentId && studentId !== req.user.id.toString()) {
    console.warn('Student access validation - Attempt to access other student data', {
      userId: req.user.id,
      username: req.user.username,
      attemptedAccess: studentId
    });

    return res.status(403).json({ 
      error: 'You can only access your own data.',
      code: 'SELF_ACCESS_ONLY'
    });
  }

  next();
};

module.exports = {
  auth,
  superAdminOnly,
  adminOnly,
  teacherOnly,
  studentOnly,
  adminOrTeacher,
  teacherOrStudent,
  adminOrSuperAdmin,
  adminWithPermission, // NEW: Export admin permission middleware
  validateTeacherSubject,
  validateTeacherClass,
  validateStudentAccess,
  createRoleMiddleware
};