const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      console.log('Classes route - Access denied:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Admin access required' });
    }
    const classes = await Class.find();
    console.log('Classes route - Fetched classes:', { count: classes.length });
    res.json(classes);
  } catch (error) {
    console.error('Classes route - Fetch error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      console.log('Classes route - Access denied:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { name, subjects } = req.body;
    console.log('Classes route - Create class:', { name, subjects });
    const existingClass = await Class.findOne({ name });
    if (existingClass) return res.status(400).json({ error: 'Class name exists' });
    const newClass = new Class({ name, subjects: subjects || [] });
    await newClass.save();
    console.log('Classes route - Class created:', { name });
    res.status(201).json({ message: 'Class created', class: newClass });
  } catch (error) {
    console.error('Classes route - Create error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      console.log('Classes route - Access denied:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { name, subjects } = req.body;
    console.log('Classes route - Update class:', { id: req.params.id, name, subjects });
    const classData = await Class.findById(req.params.id);
    if (!classData) return res.status(404).json({ error: 'Class not found' });
    if (name && name !== classData.name) {
      const existingClass = await Class.findOne({ name });
      if (existingClass) return res.status(400).json({ error: 'Class name exists' });
      classData.name = name;
    }
    if (subjects) classData.subjects = subjects;
    await classData.save();
    console.log('Classes route - Class updated:', { id: req.params.id });
    res.json({ message: 'Class updated', class: classData });
  } catch (error) {
    console.error('Classes route - Update error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      console.log('Classes route - Access denied:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Admin access required' });
    }
    console.log('Classes route - Delete class:', { id: req.params.id });
    const classData = await Class.findByIdAndDelete(req.params.id);
    if (!classData) return res.status(404).json({ error: 'Class not found' });
    console.log('Classes route - Class deleted:', { id: req.params.id });
    res.json({ message: 'Class deleted' });
  } catch (error) {
    console.error('Classes route - Delete error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/subject', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      console.log('Classes route - Access denied:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { className, subject } = req.body;
    console.log('Classes route - Add subject:', { className, subject });
    const classData = await Class.findOne({ name: className });
    if (!classData) return res.status(404).json({ error: 'Class not found' });
    if (classData.subjects.includes(subject)) return res.status(400).json({ error: 'Subject already exists' });
    classData.subjects.push(subject);
    await classData.save();
    console.log('Classes route - Subject added:', { className, subject });
    res.json({ message: 'Subject added', class: classData });
  } catch (error) {
    console.error('Classes route - Add subject error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/subject/:classId/:subject', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      console.log('Classes route - Access denied:', { userId: req.user.userId });
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { classId, subject } = req.params;
    console.log('Classes route - Delete subject:', { classId, subject });
    const classData = await Class.findById(classId);
    if (!classData) return res.status(404).json({ error: 'Class not found' });
    if (!classData.subjects.includes(subject)) return res.status(400).json({ error: 'Subject not found in class' });
    classData.subjects = classData.subjects.filter(s => s !== subject);
    await classData.save();
    console.log('Classes route - Subject deleted:', { classId, subject });
    res.json({ message: 'Subject deleted', class: classData });
  } catch (error) {
    console.error('Classes route - Delete subject error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;