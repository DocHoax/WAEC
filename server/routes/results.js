const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const User = require('../models/User');
const Test = require('../models/Test');
const { auth } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const mongoose = require('mongoose');

router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'teacher') {
      const subjects = req.user.subjects.map((sub) => sub.subject);
      const classes = req.user.subjects.map((sub) => sub.class);
      query = { subject: { $in: subjects }, class: { $in: classes } };
    } else if (req.user.role === 'student') {
      query = { userId: req.user.userId };
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access restricted' });
    }
    const results = await Result.find(query).populate('userId', 'name surname').populate('testId', 'title subject class');
    res.json(results);
  } catch (error) {
    console.error('GET /api/results - Error:', { message: error.message, url: req.url });
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ CORRECTED - Removed regex pattern from route path
router.get('/:testId', auth, async (req, res) => {
  try {
    console.log('GET /api/results/:testId - Request:', { testId: req.params.testId, url: req.url });
    if (!mongoose.isValidObjectId(req.params.testId)) {
      console.log('GET /api/results/:testId - Invalid test ID:', { testId: req.params.testId });
      return res.status(400).json({ error: 'Invalid test ID' });
    }
    const test = await Test.findById(req.params.testId);
    if (!test) {
      console.log('GET /api/results/:testId - Test not found:', { testId: req.params.testId });
      return res.status(404).json({ error: 'Test not found' });
    }
    let query = { testId: req.params.testId };
    if (req.user.role === 'teacher') {
      if (!req.user.subjects.some((sub) => sub.subject === test.subject && sub.class === test.class)) {
        console.log('GET /api/results/:testId - Not assigned:', { user: req.user.username, subject: test.subject, class: test.class });
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    } else if (req.user.role !== 'admin') {
      console.log('GET /api/results/:testId - Access restricted:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Access restricted' });
    }
    const results = await Result.find(query).populate('userId', 'name surname').populate('testId', 'title subject class');
    res.json(results.map(result => ({
      ...result.toObject(),
      subject: result.testId?.subject || result.subject || 'Unknown',
      class: result.testId?.class || result.class || 'Unknown',
      session: result.session || 'Unknown'
    })));
  } catch (error) {
    console.error('GET /api/results/:testId - Error:', { message: error.message, stack: error.stack, testId: req.params.testId, url: req.url });
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ CORRECTED - Removed regex pattern from route path
router.get('/details/:resultId', auth, async (req, res) => {
  try {
    console.log('GET /api/results/details/:resultId - Request:', { resultId: req.params.resultId, url: req.url });
    if (!mongoose.isValidObjectId(req.params.resultId)) {
      console.log('GET /api/results/details/:resultId - Invalid result ID:', { resultId: req.params.resultId });
      return res.status(400).json({ error: 'Invalid result ID' });
    }
    if (!['admin', 'teacher'].includes(req.user.role)) {
      console.log('GET /api/results/details/:resultId - Access restricted:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Access restricted to admins or teachers' });
    }
    const result = await Result.findById(req.params.resultId)
      .populate('userId', 'name surname')
      .populate('testId', 'title subject class questions');
    if (!result) {
      console.log('GET /api/results/details/:resultId - Result not found:', { resultId: req.params.resultId });
      return res.status(404).json({ error: 'Result not found' });
    }
    res.json({
      user: result.userId,
      test: result.testId,
      score: result.score,
      answers: Array.isArray(result.answers) ? result.answers.map((answer, index) => ({
        question: result.testId?.questions[index]?.questionText || 'Unknown',
        selectedOption: answer.selectedOption || 'N/A',
        correctOption: result.testId?.questions[index]?.correctOption || 'N/A',
        isCorrect: answer.selectedOption === result.testId?.questions[index]?.correctOption,
      })) : [],
    });
  } catch (error) {
    console.error('GET /api/results/details/:resultId - Error:', { message: error.message, stack: error.stack, resultId: req.params.resultId, url: req.url });
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ CORRECTED - Removed regex pattern from route path
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('PUT /api/results/:id - Request:', { id: req.params.id, url: req.url });
    if (!mongoose.isValidObjectId(req.params.id)) {
      console.log('PUT /api/results/:id - Invalid result ID:', { id: req.params.id });
      return res.status(400).json({ error: 'Invalid result ID' });
    }
    if (req.user.role !== 'admin') {
      console.log('PUT /api/results/:id - Access restricted:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { score } = req.body;
    if (score === undefined || score < 0) {
      return res.status(400).json({ error: 'Invalid score value' });
    }
    const result = await Result.findById(req.params.id);
    if (!result) {
      console.log('PUT /api/results/:id - Result not found:', { id: req.params.id });
      return res.status(404).json({ error: 'Result not found' });
    }
    result.score = score;
    await result.save();
    res.json({ message: 'Result updated', result });
  } catch (error) {
    console.error('PUT /api/results/:id - Error:', { message: error.message, stack: error.stack, id: req.params.id, url: req.url });
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ CORRECTED - Removed regex patterns from route path
router.get('/export/student/:studentId/session/:sessionId', auth, async (req, res) => {
  try {
    console.log('GET /api/results/export/student/:studentId/session/:sessionId - Request:', { params: req.params, url: req.url });
    const { studentId, sessionId } = req.params;
    if (!mongoose.isValidObjectId(studentId)) {
      console.log('GET /api/results/export/student/:studentId/session/:sessionId - Invalid student ID:', { studentId });
      return res.status(400).json({ error: 'Invalid student ID' });
    }
    const student = await User.findById(studentId);
    if (!student) {
      console.log('GET /api/results/export/student/:studentId/session/:sessionId - Student not found:', { studentId });
      return res.status(404).json({ error: 'Student not found' });
    }
    let query = { userId: studentId, session: decodeURIComponent(sessionId) };
    if (req.user.role === 'teacher') {
      const subjects = req.user.subjects.map((sub) => sub.subject);
      const classes = req.user.subjects.map((sub) => sub.class);
      query = { ...query, subject: { $in: subjects }, class: { $in: classes } };
    } else if (req.user.role !== 'admin') {
      console.log('GET /api/results/export/student/:studentId/session/:sessionId - Access restricted:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Access restricted' });
    }
    const results = await Result.find(query).populate('testId', 'title subject class totalScore');
    if (!results.length) {
      console.log('GET /api/results/export/student/:studentId/session/:sessionId - No results found:', { studentId, sessionId });
      return res.status(404).json({ error: 'No results found' });
    }

    const format = req.query.format || 'pdf';
    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=result_${studentId}_${sessionId.replace(/[/\s]/g, '_')}.pdf`);
      doc.pipe(res);
      doc.fontSize(16).text(`Result Sheet: ${student.name} ${student.surname}`, { align: 'center' });
      doc.fontSize(12).text(`Session: ${decodeURIComponent(sessionId)}`, { align: 'center' });
      doc.fontSize(12).text(`Class: ${student.class}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      doc.text('Test Title | Subject | Class | Score | Total | Percentage | Date', 50, 100);
      doc.text('-'.repeat(60), 50, 110);
      let y = 120;
      let totalScore = 0;
      let totalPossible = 0;
      results.forEach(r => {
        const percentage = r.testId?.totalScore ? ((r.score / r.testId.totalScore) * 100).toFixed(2) : 'N/A';
        doc.text(
          `${r.testId.title} | ${r.subject || r.testId.subject} | ${r.class || r.testId.class} | ${r.score} | ${r.testId?.totalScore || 'N/A'} | ${percentage} | ${new Date(r.submittedAt).toLocaleDateString()}`,
          50, y
        );
        totalScore += r.score;
        totalPossible += r.testId?.totalScore || 0;
        y += 20;
      });
      doc.text('-'.repeat(60), 50, y);
      doc.text(`Total: ${totalScore} | Average: ${(totalScore / results.length).toFixed(2)} | Overall %: ${totalPossible ? ((totalScore / totalPossible) * 100).toFixed(2) : 'N/A'}`, 50, y + 20);
      doc.end();
    } else {
      const fields = ['testId.title', 'subject', 'class', 'score', 'totalScore', 'percentage', 'submittedAt'];
      const csv = new Parser({ fields }).parse(results.map(r => ({
        'testId.title': r.testId.title,
        subject: r.subject || r.testId.subject,
        class: r.class || r.testId.class,
        score: r.score,
        totalScore: r.testId?.totalScore || 'N/A',
        percentage: r.testId?.totalScore ? ((r.score / r.testId.totalScore) * 100).toFixed(2) : 'N/A',
        submittedAt: new Date(r.submittedAt).toLocaleDateString(),
      })));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=result_${studentId}_${sessionId.replace(/[/\s]/g, '_')}.csv`);
      res.send(csv);
    }
  } catch (error) {
    console.error('GET /api/results/export/student/:studentId/session/:sessionId - Error:', { message: error.message, stack: error.stack, params: req.params, url: req.url });
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ CORRECTED - Removed regex patterns from route path
router.get('/export/class/:className/subject/:subjectId', auth, async (req, res) => {
  try {
    console.log('GET /api/results/export/class/:className/subject/:subjectId - Request:', {
      params: req.params,
      user: req.user.username,
      timestamp: new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' }),
    });
    const { className, subjectId } = req.params;
    if (!className || (subjectId !== 'all' && !subjectId)) {
      console.log('GET /api/results/export/class/:className/subject/:subjectId - Invalid parameters:', { className, subjectId });
      return res.status(400).json({ error: 'Invalid class or subject' });
    }
    let query = { class: decodeURIComponent(className) };
    if (subjectId !== 'all') {
      query.subject = decodeURIComponent(subjectId);
    }
    if (req.user.role === 'teacher') {
      const subjects = req.user.subjects.map((sub) => sub.subject);
      const classes = req.user.subjects.map((sub) => sub.class);
      if (subjectId !== 'all' && !subjects.includes(decodeURIComponent(subjectId)) || !classes.includes(decodeURIComponent(className))) {
        console.log('GET /api/results/export/class/:className/subject/:subjectId - Not assigned:', { user: req.user.username, subjectId, className });
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    } else if (req.user.role !== 'admin') {
      console.log('GET /api/results/export/class/:className/subject/:subjectId - Access restricted:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Access restricted' });
    }
    const results = await Result.find(query)
      .populate('userId', 'name surname')
      .populate('testId', 'title subject class totalScore');
    if (!results.length) {
      console.log('GET /api/results/export/class/:className/subject/:subjectId - No results found:', { className, subjectId });
      return res.status(404).json({ error: 'No results found' });
    }

    const format = req.query.format || 'csv';
    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=results_${className}_${subjectId}.pdf`);
      doc.pipe(res);
      doc.fontSize(16).text(`Results: ${subjectId === 'all' ? 'All Subjects' : decodeURIComponent(subjectId)} (${decodeURIComponent(className)})`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      doc.text('Student | Test Title | Score | Total | Percentage | Date', 50, 100);
      doc.text('-'.repeat(60), 50, 110);
      let y = 120;
      for (const r of results) {
        const percentage = r.testId?.totalScore ? ((r.score / r.testId.totalScore) * 100).toFixed(2) : 'N/A';
        doc.text(
          `${r.userId ? `${r.userId.name} ${r.userId.surname}` : 'Unknown'} | ${r.testId.title} | ${r.score} | ${r.testId?.totalScore || 'N/A'} | ${percentage} | ${new Date(r.submittedAt).toLocaleDateString()}`,
          50, y
        );
        y += 20;
      }
      doc.end();
    } else {
      const fields = ['studentName', 'studentId', 'subject', 'class', 'session', 'testTitle', 'score', 'totalScore', 'percentage', 'grade', 'remarks'];
      const csvData = results.map(result => ({
        studentName: `${result.userId?.name || ''} ${result.userId?.surname || ''}`.trim() || 'N/A',
        studentId: result.userId?._id || 'N/A',
        subject: result.subject || result.testId?.subject || 'N/A',
        class: result.class || result.testId?.class || 'N/A',
        session: result.session || 'N/A',
        testTitle: result.testId?.title || 'N/A',
        score: result.score || 0,
        totalScore: result.testId?.totalScore || 'N/A',
        percentage: result.testId?.totalScore ? ((result.score / result.testId.totalScore) * 100).toFixed(2) : 'N/A',
        grade: result.grade || 'N/A',
        remarks: result.remarks || 'N/A',
      }));
      const csv = new Parser({ fields }).parse(csvData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=results_${className}_${subjectId}.csv`);
      res.send(csv);
    }
  } catch (error) {
    console.error('GET /api/results/export/class/:className/subject/:subjectId - Error:', { message: error.message, stack: error.stack, params: req.params, url: req.url });
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ CORRECTED - Removed regex patterns from route path
router.get('/export/report/:className/:subjectId', auth, async (req, res) => {
  try {
    console.log('GET /api/results/export/report/:className/:subjectId - Request:', { params: req.params, url: req.url });
    const { className, subjectId } = req.params;
    let query = { class: decodeURIComponent(className) };
    if (subjectId !== 'all') {
      query.subject = decodeURIComponent(subjectId);
    }
    if (req.user.role === 'teacher') {
      const subjects = req.user.subjects.map((sub) => sub.subject);
      const classes = req.user.subjects.map((sub) => sub.class);
      if (subjectId !== 'all' && !subjects.includes(decodeURIComponent(subjectId)) || !classes.includes(decodeURIComponent(className))) {
        console.log('GET /api/results/export/report/:className/:subjectId - Not assigned:', { user: req.user.username, subjectId, className });
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    } else if (req.user.role !== 'admin') {
      console.log('GET /api/results/export/report/:className/:subjectId - Access restricted:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Access restricted' });
    }
    const results = await Result.find(query).populate('userId', 'name surname');
    if (!results.length) {
      console.log('GET /api/results/export/report/:className/:subjectId - No results found:', { className, subjectId });
      return res.status(404).json({ error: 'No results found' });
    }

    const avgScore = (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(2);
    const passRate = (results.filter(r => r.score >= 50).length / results.length * 100).toFixed(2);

    const format = req.query.format || 'pdf';
    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=report_${className}_${subjectId}.pdf`);
      doc.pipe(res);
      doc.fontSize(16).text(`Performance Report: ${subjectId === 'all' ? 'All Subjects' : decodeURIComponent(subjectId)} (${decodeURIComponent(className)})`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      doc.text(`Average Score: ${avgScore} | Pass Rate: ${passRate}% | Total Students: ${results.length}`, 50, 130);
      doc.text('Student | Score', 50, 150);
      doc.text('-'.repeat(50), 50, 160);
      let y = 170;
      for (const r of results) {
        doc.text(`${r.userId ? `${r.userId.name} ${r.userId.surname}` : 'Unknown'} | ${r.score}`, 50, y);
        y += 20;
      }
      doc.end();
    } else {
      const fields = ['averageScore', 'passRate', 'totalStudents'];
      const csv = new Parser({ fields }).parse([{ averageScore: avgScore, passRate, totalStudents: results.length }]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report_${className}_${subjectId}.csv`);
      res.send(csv);
    }
  } catch (error) {
    console.error('GET /api/results/export/report/:className/:subjectId - Error:', { message: error.message, stack: error.stack, params: req.params, url: req.url });
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ CORRECTED - Removed regex patterns from route path
router.get('/export/student/:studentId/test/:testId', auth, async (req, res) => {
  try {
    console.log('GET /api/results/export/student/:studentId/test/:testId - Request:', { params: req.params, url: req.url });
    const { studentId, testId } = req.params;
    if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(testId)) {
      console.log('GET /api/results/export/student/:studentId/test/:testId - Invalid ID:', { studentId, testId });
      return res.status(400).json({ error: 'Invalid student or test ID' });
    }
    const student = await User.findById(studentId);
    if (!student) {
      console.log('GET /api/results/export/student/:studentId/test/:testId - Student not found:', { studentId });
      return res.status(404).json({ error: 'Student not found' });
    }
    let query = { userId: studentId, testId };
    if (req.user.role === 'teacher') {
      const test = await Test.findById(testId);
      if (!test) {
        console.log('GET /api/results/export/student/:studentId/test/:testId - Test not found:', { testId });
        return res.status(404).json({ error: 'Test not found' });
    }
      if (!req.user.subjects.some((sub) => sub.subject === test.subject && sub.class === test.class)) {
        console.log('GET /api/results/export/student/:studentId/test/:testId - Not assigned:', { user: req.user.username, subject: test.subject, class: test.class });
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    } else if (req.user.role !== 'admin') {
      console.log('GET /api/results/export/student/:studentId/test/:testId - Access restricted:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Access restricted' });
    }
    const result = await Result.findOne(query).populate('userId', 'name surname').populate('testId', 'title subject class totalScore');
    if (!result) {
      console.log('GET /api/results/export/student/:studentId/test/:testId - Result not found:', { studentId, testId });
      return res.status(404).json({ error: 'Result not found' });
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=result_${studentId}_${testId}.pdf`);
    doc.pipe(res);
    doc.fontSize(16).text(`Test Result: ${student.name} ${student.surname}`, { align: 'center' });
    doc.fontSize(12).text(`Test: ${result.testId.title}`, { align: 'center' });
    doc.text(`Subject: ${result.subject || result.testId.subject}`, { align: 'center' });
    doc.text(`Class: ${result.class || result.testId.class}`, { align: 'center' });
    doc.text(`Session: ${result.session || 'Unknown'}`, { align: 'center' });
    doc.text(`Score: ${result.score}`, { align: 'center' });
    doc.text(`Total: ${result.testId?.totalScore || 'N/A'}`, { align: 'center' });
    doc.text(`Percentage: ${result.testId?.totalScore ? ((result.score / result.testId.totalScore) * 100).toFixed(2) : 'N/A'}%`, { align: 'center' });
    doc.text(`Date: ${new Date(result.submittedAt).toLocaleDateString()}`, { align: 'center' });
    doc.end();
  } catch (error) {
    console.error('GET /api/results/export/student/:studentId/test/:testId - Error:', { message: error.message, stack: error.stack, params: req.params, url: req.url });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;