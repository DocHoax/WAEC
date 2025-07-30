const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { Parser } = require('json2csv');

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('username name surname role class subjects enrolledSubjects blocked');
    if (!user) {
      console.error('GET /api/auth/me - User not found:', req.user.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('GET /api/auth/me - Success:', { userId: user._id, role: user.role });
    res.json({
      _id: user._id,
      username: user.username,
      name: user.name,
      surname: user.surname,
      role: user.role,
      class: user.class,
      subjects: user.subjects,
      enrolledSubjects: user.enrolledSubjects,
      blocked: user.blocked,
    });
  } catch (error) {
    console.error('GET /api/auth/me - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.post('/register', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { username, password, name, surname, role, class: className, subjects } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      name,
      surname,
      role,
      class: className,
      subjects: role === 'teacher' ? subjects : [],
      enrolledSubjects: role === 'student' ? subjects : [],
      blocked: false,
    });
    await user.save();
    res.status(201).json({ message: 'User created', user: { _id: user._id, username, name, surname, role, class: user.class, subjects: user.subjects, enrolledSubjects: user.enrolledSubjects } });
  } catch (error) {
    console.error('POST /api/auth/register - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.post('/register/bulk', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { users } = req.body;
    let count = 0;
    for (const userData of users) {
      const { username, password, name, surname, role, class: className, subjects } = userData;
      const existingUser = await User.findOne({ username });
      if (existingUser) continue;
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        username,
        password: hashedPassword,
        name,
        surname,
        role,
        class: className,
        subjects: role === 'teacher' ? subjects : [],
        enrolledSubjects: role === 'student' ? subjects : [],
        blocked: false,
      });
      await user.save();
      count++;
    }
    res.status(201).json({ message: 'Bulk registration complete', count });
  } catch (error) {
    console.error('POST /api/auth/register/bulk - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      console.error('POST /api/auth/login - User not found:', username);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    if (user.blocked) {
      console.error('POST /api/auth/login - Account blocked:', username);
      return res.status(403).json({ error: 'Account blocked' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error('POST /api/auth/login - Password mismatch:', username);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
        class: user.class,
        subjects: user.subjects,
        enrolledSubjects: user.enrolledSubjects,
      },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    console.log('POST /api/auth/login - Success:', { username, userId: user._id, role: user.role });
    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        surname: user.surname,
        role: user.role,
        class: user.class,
        subjects: user.subjects,
        enrolledSubjects: user.enrolledSubjects,
      },
    });
  } catch (error) {
    console.error('POST /api/auth/login - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.post('/refresh', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('username name surname role class subjects enrolledSubjects blocked');
    if (!user) {
      console.error('POST /api/auth/refresh - User not found:', req.user.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.blocked) {
      console.error('POST /api/auth/refresh - Account blocked:', req.user.username);
      return res.status(403).json({ error: 'Account blocked' });
    }
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
        class: user.class,
        subjects: user.subjects,
        enrolledSubjects: user.enrolledSubjects,
      },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    console.log('POST /api/auth/refresh - Success:', { username: user.username, userId: user._id });
    res.json({ token });
  } catch (error) {
    console.error('POST /api/auth/refresh - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const users = await User.find({}, 'username name surname role class subjects enrolledSubjects blocked');
    res.json(users);
  } catch (error) {
    console.error('GET /api/auth/users - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.get('/students/:subject/:class', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { subject, class: className } = req.params;
    console.log('GET /api/auth/students/:subject/:class - Fetching students:', { subject, class: className, user: req.user.username });
    if (!subject || !className) {
      console.log('GET /api/auth/students/:subject/:class - Missing subject or class:', { subject, class: className });
      return res.status(400).json({ error: 'Subject and class are required.' });
    }
    const students = await User.find({
      role: 'student',
      enrolledSubjects: { $elemMatch: { subject, class: className } },
    }).select('_id username name');
    console.log('GET /api/auth/students/:subject/:class - Students fetched:', { count: students.length });
    res.json(students);
  } catch (error) {
    console.error('GET /api/auth/students/:subject/:class - Error:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { username, password, name, surname, role, class: className, subjects } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) return res.status(400).json({ error: 'Username exists' });
    }
    user.username = username || user.username;
    if (password) user.password = await bcrypt.hash(password, 10);
    user.name = name || user.name;
    user.surname = surname || user.surname;
    user.role = role || user.role;
    user.class = className || user.class;
    user.subjects = role === 'teacher' ? subjects : user.subjects;
    user.enrolledSubjects = role === 'student' ? subjects : user.enrolledSubjects;
    await user.save();
    res.json({ message: 'User updated', user: { _id: user._id, username: user.username, name: user.name, surname: user.surname, role: user.role, class: user.class, subjects: user.subjects, enrolledSubjects: user.enrolledSubjects } });
  } catch (error) {
    console.error('PUT /api/auth/users/:id - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.put('/users/:id/block', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { blocked } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.blocked = blocked;
    await user.save();
    res.json({ message: 'User block status updated', user: { _id: user._id, blocked: user.blocked } });
  } catch (error) {
    console.error('PUT /api/auth/users/:id/block - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.delete('/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('DELETE /api/auth/users/:id - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.get('/export/students', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const users = await User.find({ role: 'student' });
    const fields = ['username', 'name', 'surname', 'class', 'enrolledSubjects'];
    const csv = new Parser({ fields }).parse(users.map(u => ({
      username: u.username,
      name: u.name,
      surname: u.surname,
      class: u.class || 'N/A',
      enrolledSubjects: u.enrolledSubjects.map(s => `${s.subject} (${s.class})`).join(', ') || 'None',
    })));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=students.csv');
    res.send(csv);
  } catch (error) {
    console.error('GET /api/auth/export/students - Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;