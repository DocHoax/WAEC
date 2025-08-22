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
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:testId', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.testId)) {
      return res.status(400).json({ error: 'Invalid test ID' });
    }
    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    let query = { testId: req.params.testId };
    if (req.user.role === 'teacher') {
      if (!req.user.subjects.some((sub) => sub.subject === test.subject && sub.class === test.class)) {
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    } else if (req.user.role !== 'admin') {
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
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/details/:resultId', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.resultId)) {
      return res.status(400).json({ error: 'Invalid result ID' });
    }
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access restricted to admins or teachers' });
    }
    const result = await Result.findById(req.params.resultId)
      .populate('userId', 'name surname')
      .populate('testId', 'title subject class questions');
    if (!result) {
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
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid result ID' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { score } = req.body;
    if (score === undefined || score < 0) {
      return res.status(400).json({ error: 'Invalid score value' });
    }
    const result = await Result.findById(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }
    result.score = score;
    await result.save();
    res.json({ message: 'Result updated', result });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/student/:studentId/session/:sessionId', auth, async (req, res) => {
  try {
    const { studentId, sessionId } = req.params;
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    let query = { userId: studentId, session: decodeURIComponent(sessionId) };
    if (req.user.role === 'teacher') {
      const subjects = req.user.subjects.map((sub) => sub.subject);
      const classes = req.user.subjects.map((sub) => sub.class);
      query = { ...query, subject: { $in: subjects }, class: { $in: classes } };
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access restricted' });
    }
    const results = await Result.find(query).populate('testId', 'title subject class');
    if (!results.length) {
      return res.status(404).json({ error: 'No results found' });
    }

    const format = req.query.format || 'pdf';
    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=result_${studentId}_${sessionId}.pdf`);
      doc.pipe(res);
      doc.fontSize(16).text(`Result Sheet: ${student.name} ${student.surname}`, { align: 'center' });
      doc.fontSize(12).text(`Session: ${decodeURIComponent(sessionId)}`, { align: 'center' });
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
      res.setHeader('Content-Disposition', `attachment; filename=result_${studentId}_${sessionId}.csv`);
      res.send(csv);
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/class/:className/subject/:subjectId', auth, async (req, res) => {
  try {
    const { className, subjectId } = req.params;
    let query = { class: className };
    if (subjectId !== 'all') {
      query.subject = decodeURIComponent(subjectId);
    }
    if (req.user.role === 'teacher') {
      const subjects = req.user.subjects.map((sub) => sub.subject);
      const classes = req.user.subjects.map((sub) => sub.class);
      if (subjectId !== 'all' && !subjects.includes(decodeURIComponent(subjectId)) || !classes.includes(className)) {
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access restricted' });
    }
    const results = await Result.find(query).populate('userId', 'name surname').populate('testId', 'title subject class');
    if (!results.length) {
      return res.status(404).json({ error: 'No results found' });
    }

    const format = req.query.format || 'pdf';
    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=results_${className}_${subjectId}.pdf`);
      doc.pipe(res);
      doc.fontSize(16).text(`Results: ${subjectId === 'all' ? 'All Subjects' : decodeURIComponent(subjectId)} (${className})`, { align: 'center' });
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
      res.setHeader('Content-Disposition', `attachment; filename=results_${className}_${subjectId}.csv`);
      res.send(csv);
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/report/:className/:subjectId', auth, async (req, res) => {
  try {
    const { className, subjectId } = req.params;
    let query = { class: className };
    if (subjectId !== 'all') {
      query.subject = decodeURIComponent(subjectId);
    }
    if (req.user.role === 'teacher') {
      const subjects = req.user.subjects.map((sub) => sub.subject);
      const classes = req.user.subjects.map((sub) => sub.class);
      if (subjectId !== 'all' && !subjects.includes(decodeURIComponent(subjectId)) || !classes.includes(className)) {
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access restricted' });
    }
    const results = await Result.find(query).populate('userId', 'name surname');
    if (!results.length) {
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
      doc.fontSize(16).text(`Performance Report: ${subjectId === 'all' ? 'All Subjects' : decodeURIComponent(subjectId)} (${className})`, { align: 'center' });
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
      res.setHeader('Content-Disposition', `attachment; filename=report_${className}_${subjectId}.csv`);
      res.send(csv);
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/student/:studentId/test/:testId', auth, async (req, res) => {
  try {
    const { studentId, testId } = req.params;
    if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(testId)) {
      return res.status(400).json({ error: 'Invalid student or test ID' });
    }
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    let query = { userId: studentId, testId };
    if (req.user.role === 'teacher') {
      const test = await Test.findById(testId);
      if (!test) {
        return res.status(404).json({ error: 'Test not found' });
      }
      if (!req.user.subjects.some((sub) => sub.subject === test.subject && sub.class === test.class)) {
        return res.status(403).json({ error: 'Not assigned to this subject/class' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access restricted' });
    }
    const result = await Result.findOne(query).populate('userId', 'name surname').populate('testId', 'title subject class');
    if (!result) {
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
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;