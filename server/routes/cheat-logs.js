const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const CheatLog = require('../models/CheatLog');
const Test = require('../models/Test');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Input validation middleware
const validateCheatLogInput = (req, res, next) => {
  const { testId, type, severity = 'medium', description } = req.body;

  if (!testId || !mongoose.Types.ObjectId.isValid(testId)) {
    return res.status(400).json({ error: 'Valid testId is required' });
  }

  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'Violation type is required' });
  }

  const validTypes = ['tab_switch', 'copy_paste', 'multiple_faces', 'fullscreen_exit', 'unauthorized_device', 'voice_detected', 'other'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid violation type' });
  }

  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (!validSeverities.includes(severity)) {
    return res.status(400).json({ error: 'Invalid severity level' });
  }

  // Sanitize description
  if (description && description.length > 500) {
    return res.status(400).json({ error: 'Description too long (max 500 characters)' });
  }

  next();
};

// Rate limiting for cheat log submissions
const submissionLimits = new Map();
const SUBMISSION_LIMIT = 10; // Max submissions per minute
const TIME_WINDOW = 60 * 1000; // 1 minute

const checkRateLimit = (req, res, next) => {
  const userId = req.user.id;
  const now = Date.now();
  
  if (!submissionLimits.has(userId)) {
    submissionLimits.set(userId, []);
  }
  
  const userSubmissions = submissionLimits.get(userId);
  const recentSubmissions = userSubmissions.filter(time => now - time < TIME_WINDOW);
  
  if (recentSubmissions.length >= SUBMISSION_LIMIT) {
    return res.status(429).json({ 
      error: 'Too many cheat log submissions. Please wait before submitting again.' 
    });
  }
  
  recentSubmissions.push(now);
  submissionLimits.set(userId, recentSubmissions);
  next();
};

// Student submits a cheat violation log
router.post('/', auth, checkRateLimit, validateCheatLogInput, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Only students can submit cheat logs (self-reporting or system detection)
    if (req.user.role !== 'student') {
      console.log('CheatLogs - Access denied for non-student:', { 
        userId: req.user.id, 
        username: req.user.username,
        role: req.user.role 
      });
      return res.status(403).json({ error: 'Access restricted to students' });
    }

    const { testId, type, severity, description, evidence, automated = false } = req.body;
    const userId = req.user.id;

    console.log('CheatLogs - Logging violation:', { 
      testId, 
      userId, 
      type, 
      severity,
      automated 
    });

    // Verify test exists and is active
    const test = await Test.findById(testId).session(session);
    if (!test) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Test not found' });
    }

    // Check if test is currently active (optional - based on your requirements)
    const now = new Date();
    if (now < test.startTime || now > test.endTime) {
      console.warn('CheatLogs - Test not active:', { testId, currentTime: now, testTiming: { start: test.startTime, end: test.endTime } });
      // You might still want to log it, but with a warning
    }

    // Create cheat log entry
    const log = new CheatLog({
      testId,
      userId,
      type,
      severity,
      description: description || `Automated ${type} violation detection`,
      evidence: evidence || (automated ? 'system_automated' : 'student_reported'),
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      automated: automated || false,
      status: 'reported'
    });

    await log.save({ session });

    // If this is a high severity violation, you might want to take immediate action
    if (severity === 'high' || severity === 'critical') {
      // Example: Flag the test for review, notify admin, etc.
      console.log('CheatLogs - High severity violation detected:', {
        logId: log._id,
        testId,
        userId,
        type,
        severity
      });
      
      // You could add additional actions here:
      // - Notify administrators
      // - Flag the student's test for review
      // - Automatically submit the test
    }

    await session.commitTransaction();
    session.endSession();

    console.log('CheatLogs - Success:', { 
      logId: log._id, 
      testId, 
      userId,
      severity 
    });

    res.status(201).json({ 
      message: 'Violation logged successfully',
      logId: log._id,
      severity,
      timestamp: log.timestamp
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('CheatLogs - Error:', { 
      message: error.message,
      testId: req.body.testId,
      userId: req.user.id 
    });
    
    res.status(500).json({ 
      error: 'Server error logging violation',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get cheat logs (admin/teacher only)
router.get('/', auth, checkPermission('view_cheat_logs'), async (req, res) => {
  try {
    const { 
      testId, 
      userId, 
      type, 
      severity, 
      status = 'reported',
      startDate, 
      endDate,
      page = 1, 
      limit = 20 
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter = {};
    if (testId) filter.testId = testId;
    if (userId) filter.userId = userId;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    
    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // For teachers, only show logs for their tests
    if (req.user.role === 'teacher' && req.user.subjects) {
      const teacherTests = await Test.find({
        $or: req.user.subjects.map(sub => ({
          subject: sub.subject,
          class: sub.class
        }))
      }).select('_id').lean();
      
      filter.testId = { $in: teacherTests.map(t => t._id) };
    }

    const [logs, total] = await Promise.all([
      CheatLog.find(filter)
        .populate('testId', 'title subject class session')
        .populate('userId', 'username name surname studentId')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CheatLog.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalLogs: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        testId,
        userId,
        type,
        severity,
        status,
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('CheatLogs - Get logs error:', error);
    res.status(500).json({ error: 'Server error fetching cheat logs' });
  }
});

// Update cheat log status (admin/teacher only)
router.patch('/:logId/status', auth, checkPermission('manage_cheat_logs'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { logId } = req.params;
    const { status, resolutionNotes, actionTaken } = req.body;

    const validStatuses = ['reported', 'under_review', 'resolved', 'dismissed', 'escalated'];
    if (!validStatuses.includes(status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Invalid status' });
    }

    const log = await CheatLog.findById(logId).session(session);
    if (!log) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Cheat log not found' });
    }

    // Update log
    log.status = status;
    log.resolutionNotes = resolutionNotes;
    log.actionTaken = actionTaken;
    log.resolvedAt = status === 'resolved' || status === 'dismissed' ? new Date() : null;
    log.resolvedBy = req.user.id;

    await log.save({ session });
    await session.commitTransaction();
    session.endSession();

    console.log('CheatLogs - Status updated:', { 
      logId, 
      newStatus: status,
      updatedBy: req.user.username 
    });

    res.json({ 
      message: 'Cheat log status updated successfully',
      log: {
        id: log._id,
        status: log.status,
        resolvedAt: log.resolvedAt,
        resolutionNotes: log.resolutionNotes
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('CheatLogs - Update status error:', error);
    res.status(500).json({ error: 'Server error updating cheat log status' });
  }
});

// Get cheat statistics
router.get('/statistics', auth, checkPermission('view_cheat_logs'), async (req, res) => {
  try {
    const { testId, startDate, endDate } = req.query;

    const filter = {};
    if (testId) filter.testId = testId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const stats = await CheatLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalViolations: { $sum: 1 },
          byType: { $push: '$type' },
          bySeverity: { $push: '$severity' },
          byStatus: { $push: '$status' },
          uniqueStudents: { $addToSet: '$userId' },
          uniqueTests: { $addToSet: '$testId' }
        }
      },
      {
        $project: {
          totalViolations: 1,
          typeDistribution: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$byType', []] },
                as: 'type',
                in: {
                  k: '$$type',
                  v: {
                    $size: {
                      $filter: {
                        input: '$byType',
                        as: 't',
                        cond: { $eq: ['$$t', '$$type'] }
                      }
                    }
                  }
                }
              }
            }
          },
          severityDistribution: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$bySeverity', []] },
                as: 'severity',
                in: {
                  k: '$$severity',
                  v: {
                    $size: {
                      $filter: {
                        input: '$bySeverity',
                        as: 's',
                        cond: { $eq: ['$$s', '$$severity'] }
                      }
                    }
                  }
                }
              }
            }
          },
          statusDistribution: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$byStatus', []] },
                as: 'status',
                in: {
                  k: '$$status',
                  v: {
                    $size: {
                      $filter: {
                        input: '$byStatus',
                        as: 'st',
                        cond: { $eq: ['$$st', '$$status'] }
                      }
                    }
                  }
                }
              }
            }
          },
          uniqueStudentsCount: { $size: '$uniqueStudents' },
          uniqueTestsCount: { $size: '$uniqueTests' }
        }
      }
    ]);

    const result = stats[0] || {
      totalViolations: 0,
      typeDistribution: {},
      severityDistribution: {},
      statusDistribution: {},
      uniqueStudentsCount: 0,
      uniqueTestsCount: 0
    };

    res.json({
      statistics: result,
      period: {
        startDate: startDate || 'all',
        endDate: endDate || 'all',
        testId: testId || 'all'
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('CheatLogs - Statistics error:', error);
    res.status(500).json({ error: 'Server error generating statistics' });
  }
});

// Get frequent violators
router.get('/frequent-violators', auth, checkPermission('view_cheat_logs'), async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
      if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
    }

    const frequentViolators = await CheatLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$userId',
          violationCount: { $sum: 1 },
          lastViolation: { $max: '$timestamp' },
          severityBreakdown: {
            $push: '$severity'
          },
          testIds: { $addToSet: '$testId' }
        }
      },
      { $sort: { violationCount: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $project: {
          userId: '$_id',
          violationCount: 1,
          lastViolation: 1,
          userDetails: { $arrayElemAt: ['$userDetails', 0] },
          severityBreakdown: 1,
          testCount: { $size: '$testIds' },
          criticalCount: {
            $size: {
              $filter: {
                input: '$severityBreakdown',
                as: 'severity',
                cond: { $eq: ['$$severity', 'critical'] }
              }
            }
          }
        }
      }
    ]);

    res.json({
      frequentViolators,
      limit: parseInt(limit),
      period: {
        startDate: startDate || 'all',
        endDate: endDate || 'all'
      }
    });

  } catch (error) {
    console.error('CheatLogs - Frequent violators error:', error);
    res.status(500).json({ error: 'Server error fetching frequent violators' });
  }
});

module.exports = router;