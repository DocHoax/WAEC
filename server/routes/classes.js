const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const { auth, adminOnly } = require('../middleware/auth');
const mongoose = require("mongoose");


router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const classes = await Class.find().lean();
    res.json(classes);
  } catch (error) {
    console.error('Classes route - Fetch error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, subjects } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Class name is required and must be a non-empty string' });
    }
    if (subjects && !Array.isArray(subjects)) {
      return res.status(400).json({ error: 'Subjects must be an array' });
    }
    const existingClass = await Class.findOne({ name });
    if (existingClass) {
      return res.status(400).json({ error: 'Class name already exists' });
    }
    const newClass = new Class({ name, subjects: subjects || [] });
    await newClass.save();
    res.status(201).json({ message: 'Class created', class: newClass });
  } catch (error) {
    console.error('Classes route - Create error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid class ID' });
    }
    const { name, subjects } = req.body;
    if (!name && !subjects) {
      return res.status(400).json({ error: 'At least one of name or subjects is required' });
    }
    if (subjects && !Array.isArray(subjects)) {
      return res.status(400).json({ error: 'Subjects must be an array' });
    }
    const classData = await Class.findById(id);
    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }
    if (name && name !== classData.name) {
      const existingClass = await Class.findOne({ name });
      if (existingClass) {
        return res.status(400).json({ error: 'Class name already exists' });
      }
      classData.name = name;
    }
    if (subjects) {
      classData.subjects = subjects;
    }
    await classData.save();
    res.json({ message: 'Class updated', class: classData });
  } catch (error) {
    console.error('Classes route - Update error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid class ID' });
    }
    const classData = await Class.findByIdAndDelete(id);
    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json({ message: 'Class deleted' });
  } catch (error) {
    console.error('Classes route - Delete error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/subject', auth, adminOnly, async (req, res) => {
  try {
    const { className, subject } = req.body;
    if (!className || !subject) {
      return res.status(400).json({ error: 'Class name and subject are required' });
    }
    const classData = await Class.findOne({ name: className });
    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }
    if (classData.subjects.includes(subject)) {
      return res.status(400).json({ error: 'Subject already exists in class' });
    }
    classData.subjects.push(subject);
    await classData.save();
    res.json({ message: 'Subject added', class: classData });
  } catch (error) {
    console.error('Classes route - Add subject error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/subject/:classId/:subject', auth, adminOnly, async (req, res) => {
  try {
    const { classId, subject } = req.params;
    if (!mongoose.isValidObjectId(classId)) {
      return res.status(400).json({ error: 'Invalid class ID' });
    }
    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }
    if (!classData.subjects.includes(subject)) {
      return res.status(400).json({ error: 'Subject not found in class' });
    }
    classData.subjects = classData.subjects.filter(s => s !== subject);
    await classData.save();
    res.json({ message: 'Subject deleted', class: classData });
  } catch (error) {
    console.error('Classes route - Delete subject error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;