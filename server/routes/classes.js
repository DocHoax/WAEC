const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Class = require('../models/Class');
const User = require('../models/User');
const Test = require('../models/Test');
const AcademicRecord = require('../models/AcademicRecord');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Middleware to validate ObjectId
const validateObjectId = (paramName) => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
    console.log(`Classes route - Invalid ${paramName}:`, req.params[paramName]);
    return res.status(400).json({ 
      error: `Invalid ${paramName} format`,
      field: paramName
    });
  }
  next();
};

// Validate class input
const validateClassInput = (req, res, next) => {
  const { name, level, grade, section, capacity, academicYear, subjects } = req.body;
  
  const errors = [];
  
  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push('Name is required and must be a non-empty string');
  }
  
  if (!level || !['primary', 'junior_secondary', 'senior_secondary', 'college'].includes(level)) {
    errors.push('Valid level is required (primary, junior_secondary, senior_secondary, college)');
  }
  
  if (!grade || typeof grade !== 'string' || grade.trim() === '') {
    errors.push('Grade is required and must be a non-empty string');
  }
  
  if (!academicYear || !academicYear.match(/^\d{4}\/\d{4}$/)) {
    errors.push('Academic year is required and must be in format YYYY/YYYY');
  }
  
  if (capacity && (isNaN(capacity) || capacity < 1 || capacity > 100)) {
    errors.push('Capacity must be a number between 1 and 100');
  }
  
  if (subjects && !Array.isArray(subjects)) {
    errors.push('Subjects must be an array');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors 
    });
  }
  
  next();
};

// Get all classes with filtering and pagination
router.get('/', auth, checkPermission('view_classes'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      level, 
      grade, 
      academicYear,
      isActive = true,
      search 
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter = { isActive: isActive === 'true' };
    if (level) filter.level = level;
    if (grade) filter.grade = { $regex: grade, $options: 'i' };
    if (academicYear) filter.academicYear = academicYear;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { grade: { $regex: search, $options: 'i' } },
        { section: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('Classes route - Fetching classes:', { 
      filters: filter,
      pagination: { page, limit },
      user: req.user.username 
    });

    const [classes, total, activeCount, inactiveCount] = await Promise.all([
      Class.find(filter)
        .populate('classTeacher', 'name surname email')
        .populate('subjects.teacher', 'name surname email')
        .sort({ level: 1, grade: 1, section: 1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean(),
      Class.countDocuments(filter),
      Class.countDocuments({ isActive: true }),
      Class.countDocuments({ isActive: false })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      classes,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalClasses: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        activeCount,
        inactiveCount
      },
      filters: {
        level: level || 'all',
        grade: grade || 'all',
        academicYear: academicYear || 'all',
        isActive: isActive === 'true',
        search: search || ''
      }
    });

  } catch (error) {
    console.error('Classes route - Fetch error:', { 
      message: error.message, 
      user: req.user.username 
    });
    res.status(500).json({ 
      error: 'Server error fetching classes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get class by ID
router.get('/:id', auth, checkPermission('view_classes'), validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Classes route - Fetching class:', { 
      id, 
      user: req.user.username 
    });

    const classData = await Class.findById(id)
      .populate('classTeacher', 'name surname email phoneNumber')
      .populate('subjects.teacher', 'name surname email')
      .populate('createdBy', 'name surname')
      .populate('updatedBy', 'name surname');

    if (!classData) {
      return res.status(404).json({ 
        error: 'Class not found',
        classId: id
      });
    }

    // Get class statistics
    const [studentCount, testCount, academicRecordCount] = await Promise.all([
      User.countDocuments({ class: id, role: 'student', active: true }),
      Test.countDocuments({ class: id }),
      AcademicRecord.countDocuments({ classId: id })
    ]);

    const classWithStats = {
      ...classData.toObject(),
      statistics: {
        students: studentCount,
        tests: testCount,
        academicRecords: academicRecordCount,
        availableSeats: classData.capacity - studentCount
      }
    };

    res.json({
      class: classWithStats,
      message: 'Class retrieved successfully'
    });

  } catch (error) {
    console.error('Classes route - Fetch class error:', { 
      message: error.message, 
      id: req.params.id 
    });
    res.status(500).json({ error: 'Server error fetching class' });
  }
});

// Create new class
router.post('/', auth, checkPermission('manage_classes'), validateClassInput, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      name, 
      level, 
      grade, 
      section = 'A', 
      capacity = 30, 
      academicYear,
      subjects = [],
      classTeacher,
      room,
      schedule,
      description 
    } = req.body;

    console.log('Classes route - Creating class:', { 
      name, level, grade, section, academicYear,
      user: req.user.username 
    });

    // Check if class already exists
    const existingClass = await Class.findOne({
      level,
      grade: grade.trim().toUpperCase(),
      section: section.trim().toUpperCase(),
      academicYear
    }).session(session);

    if (existingClass) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ 
        error: 'Class already exists',
        existingClass: {
          id: existingClass._id,
          name: existingClass.name,
          level: existingClass.level,
          grade: existingClass.grade,
          section: existingClass.section
        }
      });
    }

    // Validate class teacher if provided
    if (classTeacher) {
      const teacher = await User.findOne({
        _id: classTeacher,
        role: 'teacher',
        active: true
      }).session(session);

      if (!teacher) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: 'Invalid class teacher' });
      }
    }

    // Create new class
    const newClass = new Class({
      name: name.trim().toUpperCase(),
      level,
      grade: grade.trim().toUpperCase(),
      section: section.trim().toUpperCase(),
      capacity: parseInt(capacity),
      academicYear,
      subjects: subjects.map(subject => ({
        name: subject.name.trim(),
        code: subject.code ? subject.code.trim().toUpperCase() : undefined,
        isCompulsory: subject.isCompulsory !== false,
        teacher: subject.teacher,
        credits: subject.credits || 1
      })),
      classTeacher,
      room: room ? room.trim().toUpperCase() : undefined,
      schedule,
      description,
      createdBy: req.user.id
    });

    await newClass.save({ session });
    await session.commitTransaction();
    session.endSession();

    console.log('Classes route - Class created:', { 
      classId: newClass._id,
      name: newClass.name 
    });

    // Populate the response
    const populatedClass = await Class.findById(newClass._id)
      .populate('classTeacher', 'name surname email')
      .populate('subjects.teacher', 'name surname email');

    res.status(201).json({
      message: 'Class created successfully',
      class: populatedClass
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Classes route - Create error:', { 
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
      error: 'Server error creating class',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update class
router.put('/:id', auth, checkPermission('manage_classes'), validateObjectId('id'), validateClassInput, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { 
      name, 
      level, 
      grade, 
      section, 
      capacity, 
      academicYear,
      subjects,
      classTeacher,
      room,
      schedule,
      description,
      isActive 
    } = req.body;

    console.log('Classes route - Updating class:', { 
      id, 
      updates: req.body,
      user: req.user.username 
    });

    const classData = await Class.findById(id).session(session);
    
    if (!classData) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        error: 'Class not found',
        classId: id
      });
    }

    // Check for duplicate class
    if (level || grade || section || academicYear) {
      const duplicateQuery = {
        level: level || classData.level,
        grade: (grade || classData.grade).trim().toUpperCase(),
        section: (section || classData.section).trim().toUpperCase(),
        academicYear: academicYear || classData.academicYear,
        _id: { $ne: id }
      };

      const duplicateClass = await Class.findOne(duplicateQuery).session(session);
      if (duplicateClass) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({ 
          error: 'Class with these details already exists',
          duplicateClass: {
            id: duplicateClass._id,
            name: duplicateClass.name
          }
        });
      }
    }

    // Validate class teacher if provided
    if (classTeacher) {
      const teacher = await User.findOne({
        _id: classTeacher,
        role: 'teacher',
        active: true
      }).session(session);

      if (!teacher) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: 'Invalid class teacher' });
      }
    }

    // Update class fields
    const updateFields = [
      'name', 'level', 'grade', 'section', 'capacity', 'academicYear',
      'subjects', 'classTeacher', 'room', 'schedule', 'description', 'isActive'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        classData[field] = req.body[field];
      }
    });

    classData.updatedBy = req.user.id;
    await classData.save({ session });
    await session.commitTransaction();
    session.endSession();

    console.log('Classes route - Class updated:', { 
      id, 
      name: classData.name 
    });

    // Populate the response
    const populatedClass = await Class.findById(id)
      .populate('classTeacher', 'name surname email')
      .populate('subjects.teacher', 'name surname email');

    res.json({
      message: 'Class updated successfully',
      class: populatedClass
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Classes route - Update error:', { 
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
      error: 'Server error updating class',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete class (with dependency check)
router.delete('/:id', auth, checkPermission('manage_classes'), validateObjectId('id'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { force = false } = req.query;

    console.log('Classes route - Deleting class:', { 
      id, 
      force,
      user: req.user.username 
    });

    const classData = await Class.findById(id).session(session);
    
    if (!classData) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        error: 'Class not found',
        classId: id
      });
    }

    // Check dependencies
    const canDelete = await classData.canDelete();
    
    if (!canDelete.canDelete && !force) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(409).json({
        error: 'Cannot delete class with existing dependencies',
        dependencies: canDelete.dependencies,
        message: 'Class has students, tests, or academic records. Use force=true to delete anyway.',
        forceDeleteAvailable: true
      });
    }

    if (canDelete.canDelete || force) {
      // Soft delete by setting isActive to false
      classData.isActive = false;
      await classData.save({ session });
      
      console.log('Classes route - Class soft deleted:', { 
        id,
        dependencies: canDelete.dependencies 
      });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: 'Class deleted successfully',
      deletedClass: {
        id: classData._id,
        name: classData.name,
        level: classData.level,
        grade: classData.grade
      },
      dependenciesRemoved: canDelete.dependencies,
      forceDeleted: !canDelete.canDelete
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Classes route - Delete error:', { 
      message: error.message, 
      id: req.params.id 
    });
    res.status(500).json({ error: 'Server error deleting class' });
  }
});

// Add subject to class
router.post('/:id/subjects', auth, checkPermission('manage_classes'), validateObjectId('id'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { name, code, isCompulsory = true, teacher, credits = 1 } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Subject name is required' });
    }

    console.log('Classes route - Adding subject:', { 
      classId: id, 
      subject: name,
      user: req.user.username 
    });

    const classData = await Class.findById(id).session(session);
    
    if (!classData) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Class not found' });
    }

    // Validate teacher if provided
    if (teacher) {
      const teacherUser = await User.findOne({
        _id: teacher,
        role: 'teacher',
        active: true
      }).session(session);

      if (!teacherUser) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: 'Invalid teacher' });
      }
    }

    // Add subject
    const subjectData = {
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : undefined,
      isCompulsory,
      teacher,
      credits: parseInt(credits)
    };

    await classData.addSubject(subjectData);
    await session.commitTransaction();
    session.endSession();

    console.log('Classes route - Subject added:', { 
      classId: id, 
      subject: name 
    });

    // Populate the response
    const updatedClass = await Class.findById(id)
      .populate('subjects.teacher', 'name surname email');

    res.json({
      message: 'Subject added successfully',
      class: updatedClass
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Classes route - Add subject error:', { 
      message: error.message, 
      classId: req.params.id 
    });
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Server error adding subject' });
  }
});

// Remove subject from class
router.delete('/:id/subjects/:subjectName', auth, checkPermission('manage_classes'), validateObjectId('id'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id, subjectName } = req.params;

    console.log('Classes route - Removing subject:', { 
      classId: id, 
      subject: subjectName,
      user: req.user.username 
    });

    const classData = await Class.findById(id).session(session);
    
    if (!classData) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Class not found' });
    }

    // Remove subject
    await classData.removeSubject(subjectName);
    await session.commitTransaction();
    session.endSession();

    console.log('Classes route - Subject removed:', { 
      classId: id, 
      subject: subjectName 
    });

    // Populate the response
    const updatedClass = await Class.findById(id)
      .populate('subjects.teacher', 'name surname email');

    res.json({
      message: 'Subject removed successfully',
      class: updatedClass
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Classes route - Remove subject error:', { 
      message: error.message, 
      classId: req.params.id,
      subject: req.params.subjectName 
    });
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Server error removing subject' });
  }
});

// Get class statistics
router.get('/:id/statistics', auth, checkPermission('view_classes'), validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await Class.findById(id);
    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const [studentStats, testStats, academicStats] = await Promise.all([
      // Student statistics
      User.aggregate([
        { $match: { class: new mongoose.Types.ObjectId(id), role: 'student' } },
        {
          $group: {
            _id: '$active',
            count: { $sum: 1 }
          }
        }
      ]),
      // Test statistics
      Test.aggregate([
        { $match: { class: new mongoose.Types.ObjectId(id) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      // Academic record statistics
      AcademicRecord.aggregate([
        { $match: { classId: new mongoose.Types.ObjectId(id) } },
        {
          $group: {
            _id: '$promoted',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const statistics = {
      students: {
        total: studentStats.reduce((sum, stat) => sum + stat.count, 0),
        active: studentStats.find(stat => stat._id === true)?.count || 0,
        inactive: studentStats.find(stat => stat._id === false)?.count || 0
      },
      tests: {
        total: testStats.reduce((sum, stat) => sum + stat.count, 0),
        byStatus: testStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      },
      academicRecords: {
        promoted: academicStats.find(stat => stat._id === true)?.count || 0,
        notPromoted: academicStats.find(stat => stat._id === false)?.count || 0
      },
      capacity: {
        total: classData.capacity,
        current: classData.currentStudents,
        available: classData.capacity - classData.currentStudents,
        utilization: ((classData.currentStudents / classData.capacity) * 100).toFixed(2)
      }
    };

    res.json({
      class: {
        id: classData._id,
        name: classData.name,
        level: classData.level,
        grade: classData.grade
      },
      statistics,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Classes route - Statistics error:', error);
    res.status(500).json({ error: 'Server error fetching class statistics' });
  }
});

// Get classes by level
router.get('/level/:level', auth, checkPermission('view_classes'), async (req, res) => {
  try {
    const { level } = req.params;
    const { academicYear } = req.query;

    if (!['primary', 'junior_secondary', 'senior_secondary', 'college'].includes(level)) {
      return res.status(400).json({ error: 'Invalid level' });
    }

    const classes = await Class.getByLevel(level, academicYear);
    
    res.json({
      level,
      academicYear: academicYear || 'current',
      classes,
      count: classes.length
    });

  } catch (error) {
    console.error('Classes route - Level fetch error:', error);
    res.status(500).json({ error: 'Server error fetching classes by level' });
  }
});

module.exports = router;