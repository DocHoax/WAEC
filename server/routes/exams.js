const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      console.log('Exams route - Access denied:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Admin access required' });
    }
    const exams = await Exam.find();
    console.log('Exams route - Fetched exams:', { count: exams.length });
    res.json(exams);
  } catch (error) {
    console.error('Exams route - Fetch error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      console.log('Exams route - Access denied:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { title, subject, class: className, date, duration } = req.body;
    console.log('Exams route - Schedule exam:', { title, subject, className, date, duration });
    const exam = new Exam({ title, subject, class: className, date, duration });
    await exam.save();
    console.log('Exams route - Exam scheduled:', { title });
    res.status(201).json({ message: 'Exam scheduled', exam });
  } catch (error) {
    console.error('Exams route - Schedule error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ CORRECTED - Removed regex pattern from route path
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      console.log('Exams route - Access denied:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { title, subject, class: className, date, duration } = req.body;
    console.log('Exams route - Update exam:', { id: req.params.id, title, subject, className, date, duration });
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    exam.title = title || exam.title;
    exam.subject = subject || exam.subject;
    exam.class = className || exam.class;
    exam.date = date || exam.date;
    exam.duration = duration || exam.duration;
    await exam.save();
    console.log('Exams route - Exam updated:', { id: req.params.id });
    res.json({ message: 'Exam updated', exam });
  } catch (error) {
    console.error('Exams route - Update error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ CORRECTED - Removed regex pattern from route path
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      console.log('Exams route - Access denied:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Admin access required' });
    }
    console.log('Exams route - Delete exam:', { id: req.params.id });
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    console.log('Exams route - Exam deleted:', { id: req.params.id });
    res.json({ message: 'Exam deleted' });
  } catch (error) {
    console.error('Exams route - Delete error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;