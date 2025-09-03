const express = require('express');
const router = express.Router();
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
const Class = require('../models/Class');

// Get student transcript
router.get('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get student details
    const student = await User.findById(studentId)
      .populate('class')
      .populate('academicRecords');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get all academic records for the student
    const academicRecords = await AcademicRecord.find({ studentId })
      .populate('classId')
      .sort({ session: 1, term: 1 });

    // Format the transcript data
    const transcript = {
      student: {
        name: student.name,
        studentId: student.studentId,
        class: student.class ? student.class.name : 'Not assigned'
      },
      records: academicRecords.map(record => ({
        session: record.session,
        term: record.term,
        class: record.classId.name,
        grades: record.grades,
        totalScore: record.totalScore,
        average: record.average,
        position: record.position,
        promoted: record.promoted
      }))
    };

    res.json(transcript);
  } catch (error) {
    console.error('Error generating transcript:', error);
    res.status(500).json({ message: 'Server error generating transcript' });
  }
});

module.exports = router;