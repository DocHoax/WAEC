const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { Parser } = require('json2csv');
const multer = require('multer');
const path = require('path');
const mongoose = require("mongoose");


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .jpg, .jpeg, and .png files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('username name surname role class subjects enrolledSubjects blocked picture dateOfBirth address phoneNumber sex age')
      .lean();
    if (!user) {
      console.error('GET /api/auth/me - User not found:', req.user.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('GET /api/auth/me - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register', auth, upload.single('picture'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { username, password, name, surname, role, class: className, subjects, dateOfBirth, address, phoneNumber, sex, age } = req.body;
    if (!username || !password || !name || !surname || !role) {
      return res.status(400).json({ error: 'Missing required fields: username, password, name, surname, role' });
    }
    let parsedSubjects = [];
    if (subjects) {
      try {
        parsedSubjects = typeof subjects === 'string' ? JSON.parse(subjects) : subjects;
        if (!Array.isArray(parsedSubjects)) {
          return res.status(400).json({ error: 'Subjects must be an array' });
        }
      } catch (err) {
        return res.status(400).json({ error: 'Invalid subjects format' });
      }
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      name,
      surname,
      role,
      class: className || null,
      subjects: role === 'teacher' ? parsedSubjects : [],
      enrolledSubjects: role === 'student' ? parsedSubjects : [],
      blocked: false,
      picture: req.file ? req.file.filename : '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      address: address || '',
      phoneNumber: phoneNumber || '',
      sex: sex || '',
      age: age ? Number(age) : null,
    });
    await user.save();
    res.status(201).json({
      message: 'User created',
      user: {
        _id: user._id,
        username,
        name,
        surname,
        role,
        class: user.class,
        subjects: user.subjects,
        enrolledSubjects: user.enrolledSubjects,
        picture: user.picture,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        phoneNumber: user.phoneNumber,
        sex: user.sex,
        age: user.age,
      },
    });
  } catch (error) {
    console.error('POST /api/auth/register - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register/bulk', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { users } = req.body;
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'Users must be a non-empty array' });
    }
    let count = 0;
    const errors = [];
    for (const userData of users) {
      const { username, password, name, surname, role, class: className, subjects, picture } = userData;
      if (!username || !password || !name || !surname || !role) {
        errors.push({ username: username || 'unknown', error: 'Missing required fields' });
        continue;
      }
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        errors.push({ username, error: 'Username already exists' });
        continue;
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        username,
        password: hashedPassword,
        name,
        surname,
        role,
        class: className || null,
        subjects: role === 'teacher' ? subjects || [] : [],
        enrolledSubjects: role === 'student' ? subjects || [] : [],
        blocked: false,
        picture: picture || '',
      });
      await user.save();
      count++;
    }
    res.status(201).json({ message: `Bulk registration complete: ${count} users created`, count, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    console.error('POST /api/auth/register/bulk - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const user = await User.findOne({ username });
    if (!user) {
      console.error('POST /api/auth/login - User not found:', username);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    if (user.blocked) {
      console.error('POST /api/auth/login - Account blocked:', username);
      return res.status(403).json({ error: 'Account is blocked' });
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
        picture: user.picture,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        phoneNumber: user.phoneNumber,
        sex: user.sex,
        age: user.age,
      },
    });
  } catch (error) {
    console.error('POST /api/auth/login - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/refresh', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('username name surname role class subjects enrolledSubjects blocked picture dateOfBirth address phoneNumber sex age')
      .lean();
    if (!user) {
      console.error('POST /api/auth/refresh - User not found:', req.user.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.blocked) {
      console.error('POST /api/auth/refresh - Account blocked:', req.user.username);
      return res.status(403).json({ error: 'Account is blocked' });
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
    res.json({ token });
  } catch (error) {
    console.error('POST /api/auth/refresh - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const users = await User.find()
      .select('username name surname role class subjects enrolledSubjects blocked picture dateOfBirth address phoneNumber sex age')
      .lean();
    res.json(users);
  } catch (error) {
    console.error('GET /api/auth/users - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/students/:subject/:class', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { subject, class: className } = req.params;
    if (!subject || !className) {
      console.error('GET /api/auth/students/:subject/:class - Missing subject or class:', { subject, class: className });
      return res.status(400).json({ error: 'Subject and class are required' });
    }
    const students = await User.find({
      role: 'student',
      enrolledSubjects: { $elemMatch: { subject, class: className } },
    }).select('_id username name surname').lean();
    res.json(students);
  } catch (error) {
    console.error('GET /api/auth/students/:subject/:class - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:id', auth, upload.single('picture'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const { username, password, name, surname, role, class: className, subjects, dateOfBirth, address, phoneNumber, sex, age } = req.body;
    let parsedSubjects = [];
    if (subjects) {
      try {
        parsedSubjects = typeof subjects === 'string' ? JSON.parse(subjects) : subjects;
        if (!Array.isArray(parsedSubjects)) {
          return res.status(400).json({ error: 'Subjects must be an array' });
        }
      } catch (err) {
        return res.status(400).json({ error: 'Invalid subjects format' });
      }
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      user.username = username;
    }
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    user.name = name || user.name;
    user.surname = surname || user.surname;
    user.role = role || user.role;
    user.class = className || user.class;
    user.subjects = role === 'teacher' ? parsedSubjects : user.subjects;
    user.enrolledSubjects = role === 'student' ? parsedSubjects : user.enrolledSubjects;
    user.picture = req.file ? req.file.filename : user.picture;
    user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : user.dateOfBirth;
    user.address = address || user.address;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.sex = sex || user.sex;
    user.age = age ? Number(age) : user.age;
    await user.save();
    res.json({
      message: 'User updated',
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        surname: user.surname,
        role: user.role,
        class: user.class,
        subjects: user.subjects,
        enrolledSubjects: user.enrolledSubjects,
        picture: user.picture,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        phoneNumber: user.phoneNumber,
        sex: user.sex,
        age: user.age,
      },
    });
  } catch (error) {
    console.error('PUT /api/auth/users/:id - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:id/block', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const { blocked } = req.body;
    if (typeof blocked !== 'boolean') {
      return res.status(400).json({ error: 'Blocked status must be a boolean' });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.blocked = blocked;
    await user.save();
    res.json({ message: 'User block status updated', user: { _id: user._id, blocked: user.blocked } });
  } catch (error) {
    console.error('PUT /api/auth/users/:id/block - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('DELETE /api/auth/users/:id - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/students', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const users = await User.find({ role: 'student' }).lean();
    const fields = ['username', 'name', 'surname', 'class', 'enrolledSubjects', 'picture', 'dateOfBirth', 'address', 'phoneNumber', 'sex', 'age'];
    const csv = new Parser({ fields }).parse(users.map(u => ({
      username: u.username,
      name: u.name,
      surname: u.surname,
      class: u.class || 'N/A',
      enrolledSubjects: u.enrolledSubjects.map(s => `${s.subject} (${s.class})`).join(', ') || 'None',
      picture: u.picture || 'None',
      dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toLocaleDateString() : 'N/A',
      address: u.address || 'N/A',
      phoneNumber: u.phoneNumber || 'N/A',
      sex: u.sex || 'N/A',
      age: u.age || 'N/A',
    })));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=students.csv');
    res.send(csv);
  } catch (error) {
    console.error('GET /api/auth/export/students - Error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;