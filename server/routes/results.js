const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const User = require('../models/User');
const Test = require('../models/Test');
const Session = require('../models/Session');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const mongoose = require('mongoose');

// Input validation middleware
const validateResultParams = (req, res, next) => {
  const { testId, studentId, session, term } = req.params;
 
  if (testId && !mongoose.Types.ObjectId.isValid(testId)) {
    return res.status(400).json({ error: 'Invalid test ID format' });
  }
 
  if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({ error: 'Invalid student ID format' });
  }
 
  if (session && !session.match(/^\d{4}\/\d{4} (First|Second|Third) Term$/)) {
    return res.status(400).json({ error: 'Invalid session format' });
  }
 
  if (term && !['First Term', 'Second Term', 'Third Term'].includes(term)) {
    return res.status(400).json({ error: 'Invalid term' });
  }
 
  next();
};

// Get results with advanced filtering and pagination - STUDENTS BLOCKED
router.get('/', auth, checkPermission('view_results'), async (req, res) => {
  try {
    // BLOCK STUDENT ACCESS
    if (req.user.role === 'student') {
      return res.status(403).json({ 
        error: 'Access denied. Students cannot view results listing.' 
      });
    }

    const {
      page = 1,
      limit = 10,
      subject,
      class: classId,
      session: sessionName,
      term,
      studentId,
      testId,
      sortBy = 'submittedAt',
      sortOrder = 'desc'
    } = req.query;
   
    const skip = (page - 1) * limit;
   
    // Build query based on user role and permissions
    let query = { isActive: true };
   
    // Role-based filtering - TEACHERS ONLY SEE THEIR SUBJECTS
    if (req.user.role === 'teacher') {
      const teacherSubjects = req.user.subjects || [];
      if (teacherSubjects.length === 0) {
        return res.status(403).json({ error: 'No subjects assigned to teacher' });
      }
     
      query.$or = teacherSubjects.map(sub => ({
        subject: sub.subject,
        class: sub.class
      }));
    }
    // STUDENTS ARE BLOCKED ABOVE - NO STUDENT ACCESS

    // Apply filters
    if (subject) query.subject = subject;
    if (classId) query.class = classId;
    if (sessionName) query.session = sessionName;
    if (term) query.term = term;
    if (studentId) query.userId = studentId;
    if (testId) query.testId = testId;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    console.log('GET /api/results - Request:', {
      filters: query,
      pagination: { page, limit },
      sort,
      user: req.user.username
    });

    const [results, total] = await Promise.all([
      Result.find(query)
        .populate('userId', 'name surname studentId')
        .populate('testId', 'title subject class totalMarks type')
        .populate('class', 'name level')
        .sort(sort)
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean(),
      Result.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      results,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResults: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        subject: subject || 'all',
        class: classId || 'all',
        session: sessionName || 'all',
        term: term || 'all'
      }
    });
  } catch (error) {
    console.error('GET /api/results - Error:', {
      message: error.message,
      user: req.user.username
    });
    res.status(500).json({
      error: 'Server error fetching results',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get results for specific test - STUDENTS BLOCKED
router.get('/test/:testId', auth, checkPermission('view_results'), validateResultParams, async (req, res) => {
  try {
    // BLOCK STUDENT ACCESS
    if (req.user.role === 'student') {
      return res.status(403).json({ 
        error: 'Access denied. Students cannot view test results.' 
      });
    }

    const { testId } = req.params;
    const { includeAnalysis = false } = req.query;

    console.log('GET /api/results/test/:testId - Request:', {
      testId,
      user: req.user.username
    });

    // Verify test exists and user has access
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Authorization checks - TEACHERS ONLY
    if (req.user.role === 'teacher') {
      const hasAccess = req.user.subjects?.some(sub =>
        sub.subject === test.subject && sub.class.equals(test.class)
      );
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    }
    // STUDENTS ARE BLOCKED ABOVE - NO STUDENT ACCESS

    const results = await Result.find({ testId, isActive: true })
      .populate('userId', 'name surname studentId')
      .populate('class', 'name level')
      .sort({ score: -1 });

    // Add analysis if requested
    let enhancedResults = results;
    if (includeAnalysis === 'true') {
      enhancedResults = results.map(result => ({
        ...result,
        analysis: {
          correctAnswers: Array.from(result.correctness?.values() || []).filter(Boolean).length,
          totalQuestions: result.totalQuestions,
          accuracy: result.totalQuestions > 0 ?
            (Array.from(result.correctness?.values() || []).filter(Boolean).length / result.totalQuestions * 100).toFixed(2) : 0,
          percentage: result.percentage,
          grade: result.grade
        }
      }));
    }

    // Calculate test statistics
    const statistics = {
      totalStudents: results.length,
      averageScore: results.length > 0 ?
        (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(2) : 0,
      highestScore: results.length > 0 ? Math.max(...results.map(r => r.score)) : 0,
      lowestScore: results.length > 0 ? Math.min(...results.map(r => r.score)) : 0,
      passRate: results.length > 0 ?
        (results.filter(r => r.score >= (test.passingMarks || test.totalMarks * 0.5)).length / results.length * 100).toFixed(2) : 0
    };

    res.json({
      test: {
        id: test._id,
        title: test.title,
        subject: test.subject,
        class: test.class,
        totalMarks: test.totalMarks,
        passingMarks: test.passingMarks
      },
      results: enhancedResults,
      statistics
    });
  } catch (error) {
    console.error('GET /api/results/test/:testId - Error:', {
      message: error.message,
      testId
    });
    res.status(500).json({ error: 'Server error fetching test results' });
  }
});

// Get detailed result analysis - STUDENTS BLOCKED
router.get('/details/:resultId', auth, checkPermission('view_results'), async (req, res) => {
  try {
    // BLOCK STUDENT ACCESS
    if (req.user.role === 'student') {
      return res.status(403).json({ 
        error: 'Access denied. Students cannot view detailed results.' 
      });
    }

    const { resultId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(resultId)) {
      return res.status(400).json({ error: 'Invalid result ID format' });
    }

    const result = await Result.findById(resultId)
      .populate('userId', 'name surname studentId email')
      .populate('testId', 'title subject class totalMarks questions passingMarks')
      .populate('class', 'name level')
      .populate('reviewedBy', 'name surname');

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Authorization check - TEACHERS ONLY
    if (req.user.role === 'teacher') {
      const hasAccess = req.user.subjects?.some(sub =>
        sub.subject === result.subject && sub.class.equals(result.class)
      );
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    }
    // STUDENTS ARE BLOCKED ABOVE - NO STUDENT ACCESS

    // Convert Map to Object for response
    const answers = result.answers instanceof Map ?
      Object.fromEntries(result.answers) : result.answers || {};
   
    const correctness = result.correctness instanceof Map ?
      Object.fromEntries(result.correctness) : result.correctness || {};

    // Detailed question analysis
    const questionAnalysis = result.testId?.questions?.map((question, index) => {
      const questionId = question._id?.toString() || index.toString();
      const selectedAnswer = answers[questionId];
      const isCorrect = correctness[questionId];
     
      return {
        questionNumber: index + 1,
        questionText: question.text,
        options: question.options,
        correctAnswer: question.correctAnswer,
        selectedAnswer: selectedAnswer || 'Not answered',
        isCorrect: isCorrect || false,
        marks: isCorrect ? question.marks || 1 : 0
      };
    }) || [];

    const analysis = result.getAnalysis();

    res.json({
      result: {
        id: result._id,
        student: result.userId,
        test: result.testId,
        class: result.class,
        session: result.session,
        term: result.term,
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        grade: result.grade,
        position: result.position,
        submittedAt: result.submittedAt,
        timeSpent: result.timeSpent,
        reviewedBy: result.reviewedBy,
        reviewedAt: result.reviewedAt,
        remarks: result.remarks
      },
      analysis,
      questionAnalysis,
      summary: {
        totalQuestions: result.totalQuestions,
        correctAnswers: analysis.correctAnswers,
        incorrectAnswers: analysis.incorrectAnswers,
        accuracy: analysis.accuracy,
        timePerQuestion: result.timeSpent && result.totalQuestions ?
          (result.timeSpent / result.totalQuestions).toFixed(2) : null
      }
    });
  } catch (error) {
    console.error('GET /api/results/details/:resultId - Error:', {
      message: error.message,
      resultId
    });
    res.status(500).json({ error: 'Server error fetching result details' });
  }
});

// Update result score - ADMIN ONLY (TEACHERS REMOVED)
router.put('/:resultId', auth, checkPermission('manage_results'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // ONLY ADMINS CAN UPDATE RESULTS
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ 
        error: 'Access denied. Only administrators can update results.' 
      });
    }

    const { resultId } = req.params;
    const { score, remarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(resultId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Invalid result ID format' });
    }

    if (score === undefined || isNaN(score) || score < 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Score must be a non-negative number' });
    }

    const result = await Result.findById(resultId)
      .populate('testId', 'totalMarks')
      .session(session);

    if (!result) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Result not found' });
    }

    // TEACHER ACCESS REMOVED - ONLY ADMINS

    // Validate score against test total marks
    if (score > result.testId.totalMarks) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: `Score cannot exceed test total marks (${result.testId.totalMarks})`
      });
    }

    // Update result
    result.score = score;
    if (remarks !== undefined) result.remarks = remarks;
    result.reviewedBy = req.user.id;
    result.reviewedAt = new Date();

    await result.save({ session });
    await session.commitTransaction();
    session.endSession();

    console.log('PUT /api/results/:resultId - Updated:', {
      resultId,
      score,
      reviewedBy: req.user.username
    });

    res.json({
      message: 'Result updated successfully',
      result: {
        id: result._id,
        score: result.score,
        percentage: result.percentage,
        grade: result.grade,
        reviewedBy: result.reviewedBy,
        reviewedAt: result.reviewedAt,
        remarks: result.remarks
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
   
    console.error('PUT /api/results/:resultId - Error:', {
      message: error.message,
      resultId
    });
   
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
   
    res.status(500).json({ error: 'Server error updating result' });
  }
});

// Delete result (admin only) - NO CHANGES NEEDED
router.delete('/:resultId', auth, checkPermission('manage_results'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { resultId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(resultId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Invalid result ID format' });
    }

    // Only admins can delete results
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await Result.findById(resultId).session(session);
    if (!result) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Result not found' });
    }

    // Soft delete by setting isActive to false
    result.isActive = false;
    await result.save({ session });

    await session.commitTransaction();
    session.endSession();

    console.log('DELETE /api/results/:resultId - Soft deleted:', {
      resultId,
      deletedBy: req.user.username
    });

    res.json({
      message: 'Result deleted successfully',
      deletedResult: {
        id: result._id,
        student: result.userId,
        test: result.testId,
        score: result.score
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
   
    console.error('DELETE /api/results/:resultId - Error:', {
      message: error.message,
      resultId
    });
    res.status(500).json({ error: 'Server error deleting result' });
  }
});

// Get student performance overview - STUDENTS CAN VIEW OWN PERFORMANCE ONLY
router.get('/student/:studentId/performance', auth, checkPermission('view_results'), validateResultParams, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { session: sessionName, term } = req.query;

    // Authorization check - STUDENTS CAN ONLY VIEW THEIR OWN PERFORMANCE
    if (req.user.role === 'student') {
      if (!req.user._id.equals(studentId)) {
        return res.status(403).json({ 
          error: 'Access denied. Students can only view their own performance.' 
        });
      }
    }

    if (req.user.role === 'teacher') {
      // Teachers can only view students in their assigned classes
      const student = await User.findById(studentId).select('class');
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
     
      const hasAccess = req.user.subjects?.some(sub =>
        sub.class.equals(student.class)
      );
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized to view this student\'s performance' });
      }
    }

    const query = { userId: studentId, isActive: true };
    if (sessionName) query.session = sessionName;
    if (term) query.term = term;

    const results = await Result.find(query)
      .populate('testId', 'title type subject totalMarks')
      .populate('class', 'name level')
      .sort({ submittedAt: -1 });

    if (results.length === 0) {
      return res.status(404).json({ error: 'No results found for the specified criteria' });
    }

    // Calculate performance metrics
    const performance = {
      totalTests: results.length,
      averageScore: (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(2),
      averagePercentage: (results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length).toFixed(2),
      bestScore: Math.max(...results.map(r => r.score)),
      worstScore: Math.min(...results.map(r => r.score)),
      subjects: {},
      testTypes: {}
    };

    // Group by subject
    results.forEach(result => {
      const subject = result.subject;
      if (!performance.subjects[subject]) {
        performance.subjects[subject] = {
          totalTests: 0,
          averageScore: 0,
          totalScore: 0
        };
      }
      performance.subjects[subject].totalTests++;
      performance.subjects[subject].totalScore += result.score;
    });

    // Calculate subject averages
    Object.keys(performance.subjects).forEach(subject => {
      performance.subjects[subject].averageScore =
        (performance.subjects[subject].totalScore / performance.subjects[subject].totalTests).toFixed(2);
    });

    // Get student details
    const student = await User.findById(studentId).select('name surname studentId class');

    res.json({
      student,
      performance,
      results: results.slice(0, 10), // Recent 10 results
      period: {
        session: sessionName || 'all',
        term: term || 'all'
      }
    });
  } catch (error) {
    console.error('GET /api/results/student/:studentId/performance - Error:', error);
    res.status(500).json({ error: 'Server error fetching student performance' });
  }
});

// Export routes would follow similar patterns with enhanced validation and error handling
// ... (export routes would be similar to your existing ones but with the enhanced model)

module.exports = router;