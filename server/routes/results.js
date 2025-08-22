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
    console.log('Results route - Fetching results for:', { user: req.user.username, role: req.user.role });
    let query = {};
    if (req.user.role === 'teacher') {
      const subjects = req.user.subjects.map((sub) => sub.subject);
      const classes = req.user.subjects.map((sub) => sub.class);
      query = { subject: { $in: subjects }, class: { $in: classes } };
    } else if (req.user.role === 'student') {
      query = { userId: req.user.userId };
    } else if (req.user.role !== 'admin') {
      console.log('Results route - Access denied:', { user: req.user.username });
      return res.status(403).json({ error: 'Access restricted' });
    }
    const results = await Result.find(query).populate('userId', 'name surname').populate('testId', 'title subject class');
    console.log('Results route - Success:', { count: results.length });
    res.json(results);
  } catch (error) {
    console.error('Results route - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:testId', auth, async (req, res) => {
  try {
    console.log('Results route - Fetching results for test:', { user: req.user.username, testId: req.params.testId });
    if (!mongoose.isValidObjectId(req.params.testId)) {
      console.log('Results route - Invalid testId:', { testId: req.params.testId });
      return res.status(400).json({ error: 'Invalid test ID' });
    }
    const test = await Test.findById(req.params.testId);
    if (!test) {
      console.log('Results route - Test not found:', { testId: req.params.testId });
      return res.status(404).json({ error: 'Test not found' });
    }
    let query = { testId: req.params.testId };
    if (req.user.role === 'teacher') {
      if (!req.user.subjects.some((sub) => sub.subject === test.subject && sub.class === test.class)) {
        console.log('Results route - Access denied:', { user: req.user.username, subject: test.subject, className: test.class });
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    } else if (req.user.role !== 'admin') {
      console.log('Results route - Access denied:', { user: req.user.username });
      return res.status(403).json({ error: 'Access restricted' });
    }
    const results = await Result.find(query).populate('userId', 'name surname').populate('testId', 'title subject class');
    console.log('Results route - Success:', { testId: req.params.testId, count: results.length });
    res.json(results.map(result => ({
      ...result.toObject(),
      subject: result.testId?.subject || result.subject || 'Unknown',
      class: result.testId?.class || result.class || 'Unknown',
      session: result.session || 'Unknown'
    })));
  } catch (error) {
    console.error('Results route - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/details/:resultId', auth, async (req, res) => {
  try {
    console.log('Results route - Fetching result details:', { user: req.user.username, resultId: req.params.resultId });
    if (!mongoose.isValidObjectId(req.params.resultId)) {
      console.log('Results route - Invalid resultId:', { resultId: req.params.resultId });
      return res.status(400).json({ error: 'Invalid result ID' });
    }
    if (!['admin', 'teacher'].includes(req.user.role)) {
      console.log('Results route - Access denied:', { user: req.user.username });
      return res.status(403).json({ error: 'Access restricted to admins or teachers' });
    }
    const result = await Result.findById(req.params.resultId)
      .populate('userId', 'name surname')
      .populate('testId', 'title subject class questions');
    if (!result) {
      console.log('Results route - Result not found:', { resultId: req.params.resultId });
      return res.status(404).json({ error: 'Result not found' });
    }
    console.log('Results route - Result details fetched:', { resultId: req.params.resultId });
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
    console.error('Results route - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    console.log('Results route - Updating result:', { user: req.user.username, resultId: req.params.id });
    if (!mongoose.isValidObjectId(req.params.id)) {
      console.log('Results route - Invalid resultId:', { id: req.params.id });
      return res.status(400).json({ error: 'Invalid result ID' });
    }
    if (req.user.role !== 'admin') {
      console.log('Results route - Access denied for update:', { user: req.user.username });
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { score } = req.body;
    if (score === undefined || score < 0) {
      console.log('Results route - Invalid score:', { score });
      return res.status(400).json({ error: 'Invalid score value' });
    }
    const result = await Result.findById(req.params.id);
    if (!result) {
      console.log('Results route - Result not found:', { id: req.params.id });
      return res.status(404).json({ error: 'Result not found' });
    }
    result.score = score;
    await result.save();
    console.log('Results route - Result updated:', { resultId: result._id });
    res.json({ message: 'Result updated', result });
  } catch (error) {
    console.error('Results route - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/student/:studentId/session/:sessionName', auth, async (req, res) => {
  try {
    console.log('Results route - Exporting student results:', { user: req.user.username, studentId: req.params.studentId, session: req.params.session });
    const { studentId, session } = req.params;
    if (!mongoose.isValidObjectId(studentId)) {
      console.log('Results route - Invalid studentId:', { studentId });
      return res.status(400).json({ error: 'Invalid student ID' });
    }
    const student = await User.findById(studentId);
    if (!student) {
      console.log('Results route - Student not found:', { studentId });
      return res.status(404).json({ error: 'Student not found' });
    }
    let query = { userId: studentId, session };
    if (req.user.role === 'teacher') {
      const subjects = req.user.subjects.map((sub) => sub.subject);
      const classes = req.user.subjects.map((sub) => sub.class);
      query = { ...query, subject: { $in: subjects }, class: { $in: classes } };
    } else if (req.user.role !== 'admin') {
      console.log('Results route - Access denied:', { user: req.user.username });
      return res.status(403).json({ error: 'Access restricted' });
    }
    const results = await Result.find(query).populate('testId', 'title subject class');
    if (!results.length) {
      console.log('Results route - No results found:', { studentId, session });
      return res.status(404).json({ error: 'No results found' });
    }

    const format = req.query.format || 'pdf';
    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=result_${studentId}_${session.replace(/\//g, '-')}.pdf`);
      doc.pipe(res);
      doc.fontSize(16).text(`Result Sheet: ${student.name} ${student.surname}`, { align: 'center' });
      doc.fontSize(12).text(`Session: ${session}`, { align: 'center' });
      doc.fontSize(12).text(`Class: ${student.class}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      doc.text('Test Title | Subject | Class | Score | Date', 50, 100);
      doc.text('-'.repeat(50), 50, 110);
      let y = 120;
      let totalScore = 0;
      results.forEach(r => {
        doc.text(`${r.testId.title} | ${r.subject || r.testId.subject} | ${r.class || r.testId.class} | ${r.score} | ${new Date(r.submittedAt).toLocaleDateString()}`, 50, y);
        totalScore += r.score;
        y += 20;
      });
      doc.text('-'.repeat(50), 50, y);
      doc.text(`Total: ${totalScore} | Average: ${(totalScore / results.length).toFixed(2)}`, 50, y + 20);
      doc.end();
    } else {
      const fields = ['testId.title', 'subject', 'class', 'score', 'submittedAt'];
      const csv = new Parser({ fields }).parse(results.map(r => ({
        'testId.title': r.testId.title,
        subject: r.subject || r.testId.subject,
        class: r.class || r.testId.class,
        score: r.score,
        submittedAt: new Date(r.submittedAt).toLocaleDateString(),
      })));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=result_${studentId}_${session.replace(/\//g, '-')}.csv`);
      res.send(csv);
    }
    console.log('Results route - Export successful:', { studentId, session, format });
  } catch (error) {
    console.error('Results route - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/class/:className/subject/:subject', auth, async (req, res) => {
  try {
    console.log('Results route - Exporting class results:', { user: req.user.username, className: req.params.className, subject: req.params.subject });
    const { className, subject } = req.params;
    let query = { class: className };
    if (subject !== 'all') {
      query.subject = subject;
    }
    if (req.user.role === 'teacher') {
      const subjects = req.user.subjects.map((sub) => sub.subject);
      const classes = req.user.subjects.map((sub) => sub.class);
      if (subject !== 'all' && !subjects.includes(subject) || !classes.includes(className)) {
        console.log('Results route - Access denied:', { user: req.user.username, subject, className });
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    } else if (req.user.role !== 'admin') {
      console.log('Results route - Access denied:', { user: req.user.username });
      return res.status(403).json({ error: 'Access restricted' });
    }
    const results = await Result.find(query).populate('userId', 'name surname').populate('testId', 'title subject class');
    if (!results.length) {
      console.log('Results route - No results found:', { className, subject });
      return res.status(404).json({ error: 'No results found' });
    }

    const format = req.query.format || 'pdf';
    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=results_${className}_${subject}.pdf`);
      doc.pipe(res);
      doc.fontSize(16).text(`Results: ${subject === 'all' ? 'All Subjects' : subject} (${className})`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      doc.text('Student | Test Title | Score | Date', 50, 100);
      doc.text('-'.repeat(50), 50, 110);
      let y = 120;
      for (const r of results) {
        doc.text(`${r.userId ? `${r.userId.name} ${r.userId.surname}` : 'Unknown'} | ${r.testId.title} | ${r.score} | ${new Date(r.submittedAt).toLocaleDateString()}`, 50, y);
        y += 20;
      }
      doc.end();
    } else {
      const fields = ['userId.name', 'userId.surname', 'testId.title', 'score', 'submittedAt'];
      const csv = new Parser({ fields }).parse(results.map(r => ({
        'userId.name': r.userId ? r.userId.name : 'Unknown',
        'userId.surname': r.userId ? r.userId.surname : 'Unknown',
        'testId.title': r.testId.title,
        score: r.score,
        submittedAt: new Date(r.submittedAt).toLocaleDateString(),
      })));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=results_${className}_${subject}.csv`);
      res.send(csv);
    }
    console.log('Results route - Export successful:', { className, subject, format });
  } catch (error) {
    console.error('Results route - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/report/:className/:subject', auth, async (req, res) => {
  try {
    console.log('Results route - Exporting report:', { user: req.user.username, className: req.params.className, subject: req.params.subject });
    const { className, subject } = req.params;
    let query = { class: className };
    if (subject !== 'all') {
      query.subject = subject;
    }
    if (req.user.role === 'teacher') {
      const subjects = req.user.subjects.map((sub) => sub.subject);
      const classes = req.user.subjects.map((sub) => sub.class);
      if (subject !== 'all' && !subjects.includes(subject) || !classes.includes(className)) {
        console.log('Results route - Access denied:', { user: req.user.username, subject, className });
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    } else if (req.user.role !== 'admin') {
      console.log('Results route - Access denied:', { user: req.user.username });
      return res.status(403).json({ error: 'Access restricted' });
    }
    const results = await Result.find(query).populate('userId', 'name surname');
    if (!results.length) {
      console.log('Results route - No results found:', { className, subject });
      return res.status(404).json({ error: 'No results found' });
    }

    const avgScore = (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(2);
    const passRate = (results.filter(r => r.score >= 50).length / results.length * 100).toFixed(2);

    const format = req.query.format || 'pdf';
    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=report_${className}_${subject}.pdf`);
      doc.pipe(res);
      doc.fontSize(16).text(`Performance Report: ${subject === 'all' ? 'All Subjects' : subject} (${className})`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Average Score: ${avgScore}`);
      doc.text(`Pass Rate: ${passRate}%`);
      doc.text(`Total Students: ${results.length}`);
      doc.moveDown();
      doc.fontSize(10);
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
      res.setHeader('Content-Disposition', `attachment; filename=report_${className}_${subject}.csv`);
      res.send(csv);
    }
    console.log('Results route - Report export successful:', { className, subject, format });
  } catch (error) {
    console.error('Results route - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/student/:studentId/test/:testId', auth, async (req, res) => {
  try {
    console.log('Results route - Exporting single test result:', { user: req.user.username, studentId: req.params.studentId, testId: req.params.testId });
    const { studentId, testId } = req.params;
    if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(testId)) {
      console.log('Results route - Invalid IDs:', { studentId, testId });
      return res.status(400).json({ error: 'Invalid student or test ID' });
    }
    const student = await User.findById(studentId);
    if (!student) {
      console.log('Results route - Student not found:', { studentId });
      return res.status(404).json({ error: 'Student not found' });
    }
    let query = { userId: studentId, testId };
    if (req.user.role === 'teacher') {
      const test = await Test.findById(testId);
      if (!test) {
        console.log('Results route - Test not found:', { testId });
        return res.status(404).json({ error: 'Test not found' });
      }
      if (!req.user.subjects.some((sub) => sub.subject === test.subject && sub.class === test.class)) {
        console.log('Results route - Access denied:', { user: req.user.username, subject: test.subject, className: test.class });
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    } else if (req.user.role !== 'admin') {
      console.log('Results route - Access denied:', { user: req.user.username });
      return res.status(403).json({ error: 'Access restricted' });
    }
    const result = await Result.findOne(query).populate('userId', 'name surname').populate('testId', 'title subject class');
    if (!result) {
      console.log('Results route - Result not found:', { studentId, testId });
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
    doc.text(`Date: ${new Date(result.submittedAt).toLocaleDateString()}`, { align: 'center' });
    doc.end();
    console.log('Results route - Single test export successful:', { studentId, testId });
  } catch (error) {
    console.error('Results route - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;