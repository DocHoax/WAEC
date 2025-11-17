const express = require('express');
const router = express.Router();
const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Get student transcript
router.get('/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Authorization: Allow students to view their own transcript, admins/teachers to view any
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ message: 'Access denied. You can only view your own transcript.' });
    }

    // For teachers/admins, check permission
    if (req.user.role !== 'student' && !req.user.permissions?.includes('view_transcripts')) {
      return res.status(403).json({ message: 'Insufficient permissions to view transcripts' });
    }

    // Get student details (without academicRecords to avoid redundant query)
    const student = await User.findById(studentId)
      .populate('class')
      .select('-password -permissions');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get all academic records for the student with proper sorting
    const academicRecords = await AcademicRecord.find({ studentId })
      .populate('classId', 'name level')
      .sort({ session: -1, term: 1 }) // Most recent sessions first
      .lean(); // Use lean for better performance since we're just reading

    if (academicRecords.length === 0) {
      return res.status(404).json({ message: 'No academic records found for this student' });
    }

    // Calculate cumulative statistics
    const cumulativeStats = calculateCumulativeStats(academicRecords);

    // Format the transcript data
    const transcript = {
      student: {
        name: student.name,
        studentId: student.studentId,
        currentClass: student.class ? student.class.name : 'Not assigned',
        admissionDate: student.admissionDate
      },
      records: academicRecords.map(record => ({
        session: record.session,
        term: record.term,
        class: record.classId?.name || 'Unknown Class',
        grades: record.grades,
        totalScore: record.totalScore,
        average: record.average,
        position: record.position,
        promoted: record.promoted,
        attendance: record.attendancePercentage,
        remarks: record.remarks
      })),
      summary: {
        totalSessions: cumulativeStats.totalSessions,
        cumulativeAverage: cumulativeStats.cumulativeAverage,
        bestSession: cumulativeStats.bestSession,
        totalSubjects: cumulativeStats.totalSubjects,
        promotionRate: cumulativeStats.promotionRate
      },
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.name || req.user.email
    };

    res.json(transcript);
  } catch (error) {
    console.error('Error generating transcript for student:', studentId, error);
    res.status(500).json({ message: 'Server error generating transcript' });
  }
});

// Generate PDF transcript
router.get('/:studentId/pdf', auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Authorization check (same as above)
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role !== 'student' && !req.user.permissions?.includes('view_transcripts')) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // Get transcript data (reuse the logic from above)
    // For PDF generation, you would typically use a library like pdfkit, puppeteer, or handlebars
    // This is a placeholder for the PDF generation logic
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="transcript-${studentId}.pdf"`);
    
    // Placeholder - implement actual PDF generation
    res.json({ message: 'PDF generation endpoint - implement with PDF library' });
    
  } catch (error) {
    console.error('Error generating PDF transcript:', error);
    res.status(500).json({ message: 'Server error generating PDF transcript' });
  }
});

// Helper function to calculate cumulative statistics
function calculateCumulativeStats(records) {
  const totalSessions = new Set(records.map(r => r.session)).size;
  const totalSubjects = new Set(records.flatMap(r => Object.keys(r.grades || {}))).size;
  
  const averages = records.map(r => r.average).filter(avg => typeof avg === 'number');
  const cumulativeAverage = averages.length > 0 
    ? (averages.reduce((sum, avg) => sum + avg, 0) / averages.length).toFixed(2)
    : 0;

  const promotedCount = records.filter(r => r.promoted === true).length;
  const promotionRate = records.length > 0 ? ((promotedCount / records.length) * 100).toFixed(1) : 0;

  const bestSession = records.reduce((best, current) => {
    return (!best || (current.average > best.average)) ? current : best;
  }, null);

  return {
    totalSessions,
    cumulativeAverage,
    bestSession: bestSession ? {
      session: bestSession.session,
      term: bestSession.term,
      average: bestSession.average
    } : null,
    totalSubjects,
    promotionRate: `${promotionRate}%`
  };
}

module.exports = router;