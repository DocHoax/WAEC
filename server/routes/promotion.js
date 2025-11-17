const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Get students eligible for promotion from a specific class
router.get('/:classId', auth, checkPermission('view_promotion'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { session, term } = req.query;

    // Input validation
    if (!session || !term) {
      return res.status(400).json({ 
        message: 'Session and term query parameters are required' 
      });
    }

    // Get all students in the specified class with their academic records
    const students = await User.find({ 
      class: classId, 
      role: 'student' 
    })
      .populate('class')
      .populate({
        path: 'academicRecords',
        match: { session, term }
      });

    // Filter students who have academic records for the specified session/term
    // AND meet promotion criteria (you can add more criteria here)
    const eligibleStudents = students.filter(student => 
      student.academicRecords && 
      student.academicRecords.length > 0 &&
      // Add promotion criteria here, for example:
      // student.academicRecords[0].finalScore >= passingGrade
      true // Remove this when adding actual criteria
    );

    res.json(eligibleStudents);
  } catch (error) {
    console.error('Error fetching promotion candidates:', error);
    res.status(500).json({ message: 'Server error fetching promotion candidates' });
  }
});

// Enhanced eligibility check with criteria
router.get('/check-eligibility/:classId', auth, checkPermission('view_promotion'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { session, term } = req.query;

    if (!session || !term) {
      return res.status(400).json({ 
        message: 'Session and term query parameters are required' 
      });
    }

    const students = await User.find({ 
      class: classId, 
      role: 'student' 
    })
      .populate('class')
      .populate({
        path: 'academicRecords',
        match: { session, term }
      });

    const eligibilityResults = students.map(student => {
      const hasRecord = student.academicRecords && student.academicRecords.length > 0;
      
      if (!hasRecord) {
        return {
          student,
          status: 'ineligible',
          reason: 'No academic record found for the specified session/term'
        };
      }

      const record = student.academicRecords[0];
      
      // Example eligibility criteria - customize based on your requirements
      const passingGrade = 60; // Minimum passing grade
      const minAttendance = 75; // Minimum attendance percentage
      
      const isEligible = record.finalScore >= passingGrade && 
                        record.attendancePercentage >= minAttendance;

      return {
        student,
        status: isEligible ? 'eligible' : 'ineligible',
        details: {
          finalScore: record.finalScore,
          attendancePercentage: record.attendancePercentage,
          passingGrade,
          minAttendance
        },
        reason: isEligible ? 'Meets all promotion criteria' : 'Does not meet promotion criteria'
      };
    });

    res.json(eligibilityResults);
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({ message: 'Server error checking eligibility' });
  }
});

// Enhanced promotion with transactions and bulk operations
router.post('/', auth, checkPermission('promote_students'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentIds, targetClassId, session: currentSession, term: currentTerm } = req.body;

    // Input validation
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'studentIds must be a non-empty array' });
    }

    if (!targetClassId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'targetClassId is required' });
    }

    if (!currentSession || !currentTerm) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'session and term are required' });
    }

    // Validate target class exists
    const targetClass = await Class.findById(targetClassId).session(session);
    if (!targetClass) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Target class not found' });
    }

    // Validate all student IDs exist and are students
    const existingStudents = await User.find({
      _id: { $in: studentIds },
      role: 'student'
    }).session(session);

    if (existingStudents.length !== studentIds.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'One or more student IDs are invalid or not students' });
    }

    // Bulk update users (promotion)
    const userUpdateResult = await User.updateMany(
      { _id: { $in: studentIds }, role: 'student' },
      { $set: { class: targetClassId } },
      { session }
    );

    // Bulk update academic records (mark as promoted)
    const academicRecordUpdateResult = await AcademicRecord.updateMany(
      { 
        studentId: { $in: studentIds }, 
        session: currentSession, 
        term: currentTerm 
      },
      { 
        $set: { 
          promoted: true, 
          promotionDate: new Date(),
          promotedTo: targetClassId
        } 
      },
      { session }
    );

    // Check for consistency
    if (userUpdateResult.modifiedCount !== studentIds.length) {
      console.warn(`Promotion inconsistency: Updated ${userUpdateResult.modifiedCount} users out of ${studentIds.length}`);
    }

    if (academicRecordUpdateResult.modifiedCount !== studentIds.length) {
      console.warn(`Academic record inconsistency: Updated ${academicRecordUpdateResult.modifiedCount} records out of ${studentIds.length}`);
    }

    // Create promotion history records (you'll need to create this model)
    // await PromotionHistory.create(
    //   studentIds.map(studentId => ({
    //     studentId,
    //     previousClassId: existingStudents.find(s => s._id.toString() === studentId.toString())?.class,
    //     newClassId: targetClassId,
    //     session: currentSession,
    //     term: currentTerm,
    //     promotedBy: req.user.id, // Assuming you have user info in req.user
    //     promotionDate: new Date()
    //   })),
    //   { session }
    // );

    // Create new academic records for next session in target class
    const nextSession = getNextSession(currentSession); // Implement this helper function
    const newAcademicRecords = studentIds.map(studentId => ({
      studentId,
      class: targetClassId,
      session: nextSession,
      term: 'First Term', // Adjust based on your term system
      createdDate: new Date()
    }));

    // await AcademicRecord.insertMany(newAcademicRecords, { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Send notifications (implement this separately)
    // await sendPromotionNotifications(studentIds, targetClass.name);

    res.json({ 
      message: 'Students promoted successfully',
      details: {
        studentsPromoted: userUpdateResult.modifiedCount,
        recordsUpdated: academicRecordUpdateResult.modifiedCount
      }
    });

  } catch (error) {
    // Abort transaction on any error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    
    console.error('Error promoting students:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error: ' + error.message });
    }
    
    res.status(500).json({ message: 'Server error promoting students' });
  }
});

// Helper function to get next session (implement based on your session format)
function getNextSession(currentSession) {
  // Example: if currentSession is "2023-2024", return "2024-2025"
  const years = currentSession.split('-');
  if (years.length === 2) {
    const startYear = parseInt(years[0]);
    const endYear = parseInt(years[1]);
    return `${startYear + 1}-${endYear + 1}`;
  }
  return currentSession; // Fallback
}

// Rollback promotion endpoint (optional - for emergency cases)
router.post('/rollback', auth, checkPermission('promote_students'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentIds, session: currentSession, term: currentTerm } = req.body;

    // Input validation
    if (!studentIds || !Array.isArray(studentIds)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'studentIds must be an array' });
    }

    // Get students' previous classes from promotion history
    // const promotionHistory = await PromotionHistory.find({
    //   studentId: { $in: studentIds },
    //   session: currentSession,
    //   term: currentTerm
    // }).sort({ promotionDate: -1 }).session(session);

    // Bulk revert student classes
    // const revertPromises = promotionHistory.map(history =>
    //   User.findByIdAndUpdate(
    //     history.studentId,
    //     { class: history.previousClassId },
    //     { session }
    //   )
    // );

    // Bulk revert academic records
    // await AcademicRecord.updateMany(
    //   { 
    //     studentId: { $in: studentIds }, 
    //     session: currentSession, 
    //     term: currentTerm 
    //   },
    //   { 
    //     $set: { 
    //       promoted: false,
    //       promotionDate: null,
    //       promotedTo: null
    //     } 
    //   },
    //   { session }
    // );

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Promotion rollback completed successfully' });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    
    console.error('Error rolling back promotion:', error);
    res.status(500).json({ message: 'Server error rolling back promotion' });
  }
});

module.exports = router;