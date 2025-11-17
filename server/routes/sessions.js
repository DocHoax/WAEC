const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Session = require('../models/Session');
const AcademicRecord = require('../models/AcademicRecord');
const Test = require('../models/Test');
const { auth, adminOnly } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Input validation middleware
const validateSessionInput = (req, res, next) => {
  const { sessionName, isActive, startDate, endDate } = req.body;

  // Session name validation
  if (!sessionName || typeof sessionName !== 'string') {
    return res.status(400).json({ 
      error: 'Session name is required and must be a string',
      field: 'sessionName'
    });
  }

  const sessionNameRegex = /^\d{4}\/\d{4} (First|Second|Third) Term$/;
  if (!sessionName.match(sessionNameRegex)) {
    return res.status(400).json({ 
      error: 'Session must be in format: YYYY/YYYY First|Second|Third Term',
      example: '2024/2025 First Term',
      field: 'sessionName'
    });
  }

  // Date validation
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use ISO format (YYYY-MM-DD)',
        field: 'startDate|endDate'
      });
    }

    if (start >= end) {
      return res.status(400).json({ 
        error: 'Start date must be before end date',
        field: 'startDate|endDate'
      });
    }
  }

  // Sanitize inputs
  req.body.sessionName = sessionName.trim();
  if (typeof isActive === 'string') {
    req.body.isActive = isActive === 'true';
  }

  next();
};

// Check for duplicate sessions
const checkDuplicateSession = async (req, res, next) => {
  try {
    const { sessionName } = req.body;
    const { id } = req.params; // For update operations

    const query = { sessionName: sessionName.trim() };
    if (id) {
      query._id = { $ne: id }; // Exclude current session for updates
    }

    const existingSession = await Session.findOne(query);
    if (existingSession) {
      return res.status(409).json({ 
        error: 'Session with this name already exists',
        existingSessionId: existingSession._id,
        field: 'sessionName'
      });
    }

    next();
  } catch (error) {
    console.error('Duplicate session check error:', error);
    res.status(500).json({ error: 'Server error during validation' });
  }
};

// Get all sessions with pagination and filtering
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      isActive, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search 
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    if (search) {
      filter.sessionName = { $regex: search, $options: 'i' };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    console.log('GET /api/sessions - Request:', { 
      filters: filter,
      pagination: { page, limit },
      sort,
      user: req.user.username 
    });

    const [sessions, total, activeCount, inactiveCount] = await Promise.all([
      Session.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v')
        .lean(),
      Session.countDocuments(filter),
      Session.countDocuments({ isActive: true }),
      Session.countDocuments({ isActive: false })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      sessions,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalSessions: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        activeCount,
        inactiveCount
      },
      filters: {
        isActive: isActive || 'all',
        search: search || '',
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('GET /api/sessions - Error:', { 
      message: error.message, 
      stack: error.stack, 
      user: req.user.username 
    });
    res.status(500).json({ 
      error: 'Server error fetching sessions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get active session
router.get('/active', auth, async (req, res) => {
  try {
    console.log('GET /api/sessions/active - Request:', { 
      user: req.user.username 
    });

    const activeSession = await Session.findOne({ isActive: true });
    
    if (!activeSession) {
      return res.status(404).json({ 
        error: 'No active session found',
        suggestion: 'Please set a session as active in the system'
      });
    }

    res.json({
      session: activeSession,
      message: 'Active session retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/sessions/active - Error:', error);
    res.status(500).json({ error: 'Server error fetching active session' });
  }
});

// Get session by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: 'Invalid session ID format',
        field: 'id'
      });
    }

    console.log('GET /api/sessions/:id - Request:', { 
      id, 
      user: req.user.username 
    });

    const session = await Session.findById(id);
    
    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found',
        sessionId: id
      });
    }

    // Get session statistics
    const [academicRecordsCount, testsCount] = await Promise.all([
      AcademicRecord.countDocuments({ session: session.sessionName }),
      Test.countDocuments({ session: session.sessionName })
    ]);

    const sessionWithStats = {
      ...session.toObject(),
      statistics: {
        academicRecords: academicRecordsCount,
        tests: testsCount,
        isDeletable: academicRecordsCount === 0 && testsCount === 0
      }
    };

    res.json({
      session: sessionWithStats,
      message: 'Session retrieved successfully'
    });

  } catch (error) {
    console.error('GET /api/sessions/:id - Error:', { 
      message: error.message, 
      id: req.params.id 
    });
    res.status(500).json({ error: 'Server error fetching session' });
  }
});

// Create new session
router.post('/', auth, adminOnly, validateSessionInput, checkDuplicateSession, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { sessionName, isActive = false, startDate, endDate, description } = req.body;

    console.log('POST /api/sessions - Request:', { 
      body: req.body, 
      user: req.user.username 
    });

    // If setting as active, deactivate all other sessions
    if (isActive) {
      await Session.updateMany(
        { isActive: true },
        { isActive: false },
        { session }
      );
    }

    // Create new session
    const newSession = new Session({
      sessionName,
      isActive,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      description,
      createdBy: req.user.id
    });

    await newSession.save({ session });
    await session.commitTransaction();
    session.endSession();

    console.log('POST /api/sessions - Success:', { 
      sessionId: newSession._id,
      sessionName: newSession.sessionName 
    });

    res.status(201).json({
      message: 'Session created successfully',
      session: newSession,
      action: isActive ? 'New session set as active' : 'Session created'
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('POST /api/sessions - Error:', { 
      message: error.message, 
      body: req.body 
    });

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors 
      });
    }

    res.status(500).json({ 
      error: 'Server error creating session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update session
router.put('/:id', auth, adminOnly, validateSessionInput, checkDuplicateSession, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { sessionName, isActive, startDate, endDate, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        error: 'Invalid session ID format',
        field: 'id'
      });
    }

    console.log('PUT /api/sessions/:id - Request:', { 
      id, 
      body: req.body, 
      user: req.user.username 
    });

    const existingSession = await Session.findById(id).session(session);
    
    if (!existingSession) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        error: 'Session not found',
        sessionId: id
      });
    }

    // If setting as active, deactivate all other sessions
    if (isActive && !existingSession.isActive) {
      await Session.updateMany(
        { _id: { $ne: id }, isActive: true },
        { isActive: false },
        { session }
      );
    }

    // Update session fields
    existingSession.sessionName = sessionName;
    existingSession.isActive = isActive;
    if (startDate) existingSession.startDate = new Date(startDate);
    if (endDate) existingSession.endDate = new Date(endDate);
    if (description !== undefined) existingSession.description = description;
    existingSession.updatedBy = req.user.id;
    existingSession.updatedAt = new Date();

    await existingSession.save({ session });
    await session.commitTransaction();
    session.endSession();

    console.log('PUT /api/sessions/:id - Success:', { 
      id, 
      sessionName: existingSession.sessionName 
    });

    res.json({
      message: 'Session updated successfully',
      session: existingSession,
      action: isActive ? 'Session set as active' : 'Session updated'
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('PUT /api/sessions/:id - Error:', { 
      message: error.message, 
      id: req.params.id 
    });

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors 
      });
    }

    res.status(500).json({ 
      error: 'Server error updating session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Set session as active
router.patch('/:id/activate', auth, adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    console.log('PATCH /api/sessions/:id/activate - Request:', { 
      id, 
      user: req.user.username 
    });

    const targetSession = await Session.findById(id).session(session);
    
    if (!targetSession) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Session not found' });
    }

    if (targetSession.isActive) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Session is already active' });
    }

    // Deactivate all other sessions
    await Session.updateMany(
      { _id: { $ne: id }, isActive: true },
      { isActive: false },
      { session }
    );

    // Activate target session
    targetSession.isActive = true;
    targetSession.updatedBy = req.user.id;
    targetSession.updatedAt = new Date();

    await targetSession.save({ session });
    await session.commitTransaction();
    session.endSession();

    console.log('PATCH /api/sessions/:id/activate - Success:', { 
      id, 
      sessionName: targetSession.sessionName 
    });

    res.json({
      message: 'Session activated successfully',
      session: targetSession,
      previousActiveSessionsDeactivated: true
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('PATCH /api/sessions/:id/activate - Error:', error);
    res.status(500).json({ error: 'Server error activating session' });
  }
});

// Delete session (with dependency check)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { force = false } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    console.log('DELETE /api/sessions/:id - Request:', { 
      id, 
      force, 
      user: req.user.username 
    });

    const targetSession = await Session.findById(id).session(session);
    
    if (!targetSession) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if session has dependencies
    const [academicRecordsCount, testsCount] = await Promise.all([
      AcademicRecord.countDocuments({ session: targetSession.sessionName }).session(session),
      Test.countDocuments({ session: targetSession.sessionName }).session(session)
    ]);

    const hasDependencies = academicRecordsCount > 0 || testsCount > 0;

    if (hasDependencies && !force) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(409).json({
        error: 'Cannot delete session with existing data',
        dependencies: {
          academicRecords: academicRecordsCount,
          tests: testsCount
        },
        message: 'Session has associated academic records and/or tests. Use force=true to delete anyway.',
        forceDeleteAvailable: true
      });
    }

    // If force delete, we might want to handle dependencies
    if (hasDependencies && force) {
      console.warn('Force deleting session with dependencies:', {
        sessionId: id,
        academicRecords: academicRecordsCount,
        tests: testsCount
      });
      // Here you could add logic to handle dependent data
      // For example: archive, reassign, or delete dependent records
    }

    await Session.findByIdAndDelete(id).session(session);
    await session.commitTransaction();
    session.endSession();

    console.log('DELETE /api/sessions/:id - Success:', { 
      id, 
      sessionName: targetSession.sessionName,
      forceDeleted: hasDependencies 
    });

    res.json({
      message: 'Session deleted successfully',
      deletedSession: {
        id: targetSession._id,
        sessionName: targetSession.sessionName
      },
      dependenciesRemoved: hasDependencies ? {
        academicRecords: academicRecordsCount,
        tests: testsCount
      } : null,
      forceDeleted: hasDependencies
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('DELETE /api/sessions/:id - Error:', { 
      message: error.message, 
      id: req.params.id 
    });
    res.status(500).json({ error: 'Server error deleting session' });
  }
});

// Get session statistics
router.get('/:id/statistics', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const statistics = await Promise.all([
      AcademicRecord.countDocuments({ session: session.sessionName }),
      Test.countDocuments({ session: session.sessionName }),
      AcademicRecord.aggregate([
        { $match: { session: session.sessionName } },
        { $group: { _id: '$term', count: { $sum: 1 } } }
      ]),
      Test.aggregate([
        { $match: { session: session.sessionName } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    const [academicRecordsCount, testsCount, recordsByTerm, testsByType] = statistics;

    res.json({
      session: {
        id: session._id,
        sessionName: session.sessionName,
        isActive: session.isActive
      },
      statistics: {
        academicRecords: {
          total: academicRecordsCount,
          byTerm: recordsByTerm.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
          }, {})
        },
        tests: {
          total: testsCount,
          byType: testsByType.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
          }, {})
        }
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('GET /api/sessions/:id/statistics - Error:', error);
    res.status(500).json({ error: 'Server error fetching session statistics' });
  }
});

module.exports = router;