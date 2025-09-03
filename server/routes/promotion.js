const express = require('express');
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

    // Get all students in the specified class with their academic records
    const students = await User.find({ class: classId, role: 'student' })
      .populate('class')
      .populate({
        path: 'academicRecords',
        match: { session, term }
      });

    // Filter students who have academic records for the specified session/term
    const eligibleStudents = students.filter(student => 
      student.academicRecords && student.academicRecords.length > 0
    );

    res.json(eligibleStudents);
  } catch (error) {
    console.error('Error fetching promotion candidates:', error);
    res.status(500).json({ message: 'Server error fetching promotion candidates' });
  }
});

// Handle promotion of students
router.post('/', auth, checkPermission('promote_students'), async (req, res) => {
  try {
    const { studentIds, targetClassId, session, term } = req.body;

    // Get the target class to determine the next class
    const targetClass = await Class.findById(targetClassId);
    if (!targetClass) {
      return res.status(404).json({ message: 'Target class not found' });
    }

    // Update each student's class and mark as promoted
    const updatePromises = studentIds.map(async (studentId) => {
      // Update student's class
      await User.findByIdAndUpdate(studentId, { class: targetClassId });
      
      // Update academic record to mark as promoted
      await AcademicRecord.findOneAndUpdate(
        { studentId, session, term },
        { promoted: true, promotionDate: new Date() }
      );
    });

    await Promise.all(updatePromises);

    res.json({ message: 'Students promoted successfully' });
  } catch (error) {
    console.error('Error promoting students:', error);
    res.status(500).json({ message: 'Server error promoting students' });
  }
});

module.exports = router;