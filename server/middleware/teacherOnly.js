const { teacherOnly } = require('./auth');

// Enhanced teacherOnly middleware with backward compatibility
module.exports = (req, res, next) => {
  // Use the enhanced teacherOnly middleware from auth.js
  teacherOnly(req, res, (error) => {
    if (error) {
      // Handle the error from the enhanced middleware
      console.error('TeacherOnly middleware - Access denied:', {
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
        error: error.message || 'Teacher access required',
        code: error.code || 'TEACHER_ACCESS_DENIED',
        userRole: req.user?.role
      });
    }
    
    // Log successful access
    console.log('TeacherOnly middleware - Access granted:', {
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

// Teacher subject validation middleware
module.exports.validateTeacherSubject = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return next();
  }

  const { subject, class: classId } = req.body;
  
  // Skip validation if no subject/class in request
  if (!subject && !classId) {
    return next();
  }

  const hasAccess = req.user.subjects?.some(sub => {
    const subjectMatch = !subject || sub.subject === subject;
    const classMatch = !classId || sub.class.toString() === classId.toString();
    return subjectMatch && classMatch;
  });

  if (!hasAccess) {
    console.warn('Teacher subject validation - Access denied:', {
      teacherId: req.user.id,
      teacherName: req.user.name,
      requestedSubject: subject,
      requestedClass: classId,
      assignedSubjects: req.user.subjects || [],
      path: req.path
    });

    return res.status(403).json({
      error: 'You are not assigned to teach this subject in the specified class',
      code: 'TEACHER_SUBJECT_ACCESS_DENIED',
      requestedSubject: subject,
      requestedClass: classId,
      assignedSubjects: req.user.subjects || []
    });
  }

  console.log('Teacher subject validation - Access granted:', {
    teacherId: req.user.id,
    teacherName: req.user.name,
    subject: subject,
    class: classId,
    path: req.path
  });

  next();
};

// Teacher class validation middleware
module.exports.validateTeacherClass = (req, res, next) => {
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
    console.warn('Teacher class validation - Access denied:', {
      teacherId: req.user.id,
      teacherName: req.user.name,
      requestedClass: classId,
      assignedClasses: req.user.subjects?.map(sub => sub.class) || [],
      path: req.path
    });

    return res.status(403).json({
      error: 'You are not assigned to teach in this class',
      code: 'TEACHER_CLASS_ACCESS_DENIED',
      requestedClass: classId,
      assignedClasses: req.user.subjects?.map(sub => sub.class) || []
    });
  }

  console.log('Teacher class validation - Access granted:', {
    teacherId: req.user.id,
    teacherName: req.user.name,
    class: classId,
    path: req.path
  });

  next();
};

// Middleware to validate teacher owns the resource
module.exports.validateTeacherOwnership = (resourceType) => {
  return async (req, res, next) => {
    if (req.user.role !== 'teacher') {
      return next();
    }

    try {
      let isOwner = false;
      const resourceId = req.params.id || req.params.testId || req.params.questionId;

      if (!resourceId) {
        return next();
      }

      // Check ownership based on resource type
      switch (resourceType) {
        case 'test':
          const Test = require('../models/Test');
          const test = await Test.findById(resourceId);
          isOwner = test && test.createdBy.toString() === req.user.id;
          break;

        case 'question':
          const Question = require('../models/Question');
          const question = await Question.findById(resourceId);
          isOwner = question && question.createdBy.toString() === req.user.id;
          break;

        case 'exam':
          const Exam = require('../models/Exam');
          const exam = await Exam.findById(resourceId);
          isOwner = exam && (exam.createdBy.toString() === req.user.id || exam.supervisor.toString() === req.user.id);
          break;

        default:
          // For unknown resource types, allow access
          isOwner = true;
      }

      if (!isOwner) {
        console.warn('Teacher ownership validation - Access denied:', {
          teacherId: req.user.id,
          teacherName: req.user.name,
          resourceType: resourceType,
          resourceId: resourceId,
          path: req.path
        });

        return res.status(403).json({
          error: `You do not have ownership rights to this ${resourceType}`,
          code: 'TEACHER_OWNERSHIP_DENIED',
          resourceType: resourceType,
          resourceId: resourceId
        });
      }

      console.log('Teacher ownership validation - Access granted:', {
        teacherId: req.user.id,
        teacherName: req.user.name,
        resourceType: resourceType,
        resourceId: resourceId,
        path: req.path
      });

      next();
    } catch (error) {
      console.error('Teacher ownership validation - Error:', {
        error: error.message,
        teacherId: req.user.id,
        resourceType: resourceType,
        resourceId: req.params.id
      });

      res.status(500).json({
        error: 'Server error during ownership validation',
        code: 'OWNERSHIP_VALIDATION_ERROR'
      });
    }
  };
};

// Middleware for teacher operations that require confirmation
module.exports.confirmTeacherAction = (req, res, next) => {
  const dangerousActions = [
    'DELETE', // Teacher deletion operations
    'PUT',    // Major updates
    'PATCH'   // Significant modifications
  ];

  const requiresConfirmation = dangerousActions.includes(req.method) && 
                              req.headers['x-teacher-action-confirmed'] !== 'true';

  if (requiresConfirmation) {
    console.warn('Teacher action requires confirmation:', {
      teacherId: req.user.id,
      teacherName: req.user.name,
      method: req.method,
      path: req.path,
      action: 'Dangerous operation attempted without confirmation'
    });

    return res.status(428).json({
      error: 'This teacher operation requires explicit confirmation',
      code: 'TEACHER_ACTION_CONFIRMATION_REQUIRED',
      message: 'Please confirm this action by including x-teacher-action-confirmed: true header',
      requiredHeader: 'x-teacher-action-confirmed',
      dangerousOperation: true
    });
  }

  if (req.headers['x-teacher-action-confirmed'] === 'true') {
    console.log('Teacher action confirmed:', {
      teacherId: req.user.id,
      teacherName: req.user.name,
      method: req.method,
      path: req.path,
      confirmedAt: new Date().toISOString()
    });
  }

  next();
};

// Middleware to add teacher context to request
module.exports.addTeacherContext = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return next();
  }

  req.teacherContext = {
    isTeacher: true,
    teacherId: req.user.id,
    teacherName: req.user.name,
    assignedSubjects: req.user.subjects || [],
    assignedClasses: [...new Set(req.user.subjects?.map(sub => sub.class) || [])],
    permissions: req.user.permissions || [],
    accessTime: new Date()
  };

  console.log('Teacher context added:', {
    teacherId: req.user.id,
    teacherName: req.user.name,
    subjectsCount: req.user.subjects?.length || 0,
    classesCount: req.teacherContext.assignedClasses.length,
    path: req.path
  });

  next();
};