const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const Test = require('../models/Test');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

router.get('/subject/:className/:subject', auth, async (req, res) => {
  try {
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access restricted to admins and teachers' });
    }
    const { className, subject } = req.params;
    if (!className || !subject) {
      return res.status(400).json({ error: 'Class and subject are required' });
    }
    const results = await Result.find({ class: className, subject })
      .populate('userId', 'username name surname')
      .lean();
    if (!results.length) {
      return res.status(404).json({ error: 'No results found for this class and subject' });
    }

    const avgScore = (results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length).toFixed(2);
    const passRate = (results.filter(r => r.score >= 50).length / results.length * 100).toFixed(2);
    const data = {
      className,
      subject,
      avgScore: parseFloat(avgScore),
      passRate: parseFloat(passRate),
      studentCount: results.length,
      scores: results.map(r => ({
        student: `${r.userId?.name || 'N/A'} ${r.userId?.surname || ''}`.trim(),
        score: r.score || 0,
      })),
    };
    res.json(data);
  } catch (error) {
    console.error('Analytics - Subject Error:', { message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access restricted to admins and teachers' });
    }

    const query = req.user.role === 'teacher'
      ? { $or: req.user.subjects.map(sub => ({ subject: sub.subject, class: sub.class })) }
      : {};

    const tests = await Test.find(query).lean();
    const analytics = await Promise.all(
      tests.map(async test => {
        const results = await Result.find({ testId: test._id })
          .populate('userId', 'username name surname')
          .lean();
        const totalStudents = results.length;
        const completed = results.filter(r => r.submittedAt).length;
        const completionRate = totalStudents > 0 ? ((completed / totalStudents) * 100).toFixed(2) : 0;
        const scores = results.map(r => r.score || 0);
        const averageScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
        const topResult = results.sort((a, b) => b.score - a.score)[0];
        return {
          testId: test._id,
          testTitle: test.title,
          subject: test.subject,
          class: test.class,
          session: test.session,
          averageScore: parseFloat(averageScore),
          completionRate: parseFloat(completionRate),
          topStudent: topResult ? `${topResult.userId?.name || 'N/A'} ${topResult.userId?.surname || ''}`.trim() : 'N/A',
          type: test.type || 'test',
        };
      })
    );

    const studentCount = await User.countDocuments({ role: 'student' });
    const teacherCount = await User.countDocuments({ role: 'teacher' });
    const classCount = await Test.distinct('class').then(classes => classes.length);
    const testCount = await Test.countDocuments({ ...query, type: { $ne: 'examination' } });
    const examCount = await Test.countDocuments({ ...query, type: 'examination' });

    res.json({
      analytics,
      summary: {
        totalStudents: studentCount,
        totalTeachers: teacherCount,
        totalClasses: classCount,
        totalTests: testCount,
        totalExams: examCount,
      },
    });
  } catch (error) {
    console.error('Analytics - Error:', { message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;